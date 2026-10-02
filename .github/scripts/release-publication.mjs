import { spawnSync } from 'node:child_process'
import console from 'node:console'
import { appendFileSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'

const shaPattern = /^[a-f0-9]{40}$/
const versionPattern = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const statuses = ['not-attempted', 'created', 'unknown']
export const defaultPolicy = { manifests: ['package.json'], lockfile: null, readme: 'unchanged' }
export const readPolicy = () => {
    const policy = JSON.parse(readFileSync('.github/release-policy.json', 'utf8'))
    requireValue(
        Array.isArray(policy.manifests) &&
            policy.manifests[0] === 'package.json' &&
            new Set(policy.manifests).size === policy.manifests.length &&
            policy.manifests.every((path) => /^(?:[a-zA-Z0-9_-]+\/)*package\.json$/.test(path)) &&
            [null, 'package-lock.json'].includes(policy.lockfile) &&
            ['managed', 'unchanged'].includes(policy.readme),
        'Invalid repository release policy'
    )
    return policy
}
const retry = 'no release created; use a fresh qualifying main event or manual retry'
const requireValue = (condition, message) => {
    if (!condition) throw new Error(message)
}
export const transport = (command, args) => {
    const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 })
    // Never expose subprocess stderr: git can include an authenticated remote URL.
    return { code: result.error ? -1 : result.status, stdout: result.stdout || '' }
}
const run = (exec, command, args) => {
    const result = exec(command, args)
    requireValue(result.code === 0, `${command} operation failed; reconcile identifiers manually`)
    return result.stdout
}
const oidValue = (text) => {
    const value = text.trim()
    requireValue(shaPattern.test(value), 'Invalid commit identity')
    return value
}
export const nextVersion = (before, after) => {
    if (!versionPattern.test(`v${before}`) || !versionPattern.test(`v${after}`)) return false
    if (
        ![...before.split('.'), ...after.split('.')].every((value) =>
            Number.isSafeInteger(Number(value))
        )
    )
        return false
    const [a, b, c] = before.split('.').map(Number)
    return [`${a + 1}.0.0`, `${a}.${b + 1}.0`, `${a}.${b}.${c + 1}`].includes(after)
}
const outsideBlock = (text) => {
    const start = '<!-- docs-kit:ecosystem start -->'
    const end = '<!-- docs-kit:ecosystem end -->'
    requireValue(
        text.split(start).length === 2 && text.split(end).length === 2,
        'Managed README block must be unique'
    )
    const a = text.indexOf(start),
        b = text.indexOf(end)
    requireValue(a < b, 'Invalid managed README block')
    return [text.slice(0, a), text.slice(b + end.length)]
}
export const validateMetadata = (before, after, paths, policy = defaultPolicy) => {
    const allowed = [
        ...policy.manifests,
        ...(policy.lockfile ? [policy.lockfile] : []),
        ...(policy.readme === 'managed' ? ['README.md'] : [])
    ]
    requireValue(
        paths.length > 0 && paths.every((path) => allowed.includes(path)),
        'Unrecognized release delta'
    )
    const old = JSON.parse(before('package.json')),
        fresh = JSON.parse(after('package.json'))
    requireValue(nextVersion(old.version, fresh.version), 'Invalid version transition')
    for (const path of policy.manifests) {
        const a = JSON.parse(before(path)),
            b = JSON.parse(after(path))
        requireValue(
            a.version === old.version && b.version === fresh.version,
            'Shim version mismatch'
        )
        delete a.version
        delete b.version
        if (path !== 'package.json') {
            requireValue(
                a.dependencies?.[old.name] === `^${old.version}` &&
                    b.dependencies?.[old.name] === `^${fresh.version}`,
                'Shim dependency mismatch'
            )
            Reflect.deleteProperty(a.dependencies, old.name)
            Reflect.deleteProperty(b.dependencies, old.name)
        }
        requireValue(isDeepStrictEqual(a, b), 'Non-version manifest change')
    }
    if (policy.lockfile) {
        const a = JSON.parse(before(policy.lockfile)),
            b = JSON.parse(after(policy.lockfile))
        requireValue(
            a.version === old.version &&
                b.version === fresh.version &&
                a.packages?.['']?.version === old.version &&
                b.packages?.['']?.version === fresh.version,
            'Lockfile root version mismatch'
        )
        delete a.version
        delete b.version
        delete a.packages[''].version
        delete b.packages[''].version
        requireValue(isDeepStrictEqual(a, b), 'Non-version lockfile change')
    }
    if (policy.readme === 'managed') {
        const a = before('README.md'),
            b = after('README.md')
        // An unchanged README is valid even if a consumer has not installed its footer yet.
        if (a !== b)
            requireValue(
                isDeepStrictEqual(outsideBlock(a), outsideBlock(b)),
                'Unmanaged README change'
            )
    }
    return `v${fresh.version}`
}
const main = (exec) => {
    run(exec, 'git', ['fetch', '--no-tags', 'origin', 'refs/heads/main'])
    return oidValue(run(exec, 'git', ['rev-parse', 'FETCH_HEAD']))
}
export const selectBaseline = (input, exec = transport, policy = defaultPolicy) => {
    const noop = (outcome) => ({ outcome, ready: false, message: retry })
    if (input.skip || (['push', 'pull_request'].includes(input.event) && !input.merged))
        return noop('skipped')
    if (input.event === 'workflow_dispatch' && input.ref !== 'refs/heads/main')
        return noop('unsupported non-main manual request')
    requireValue(
        ['push', 'pull_request', 'workflow_dispatch'].includes(input.event),
        'Unsupported event'
    )
    requireValue(shaPattern.test(input.eventSha), 'Invalid original event SHA')
    const current = main(exec)
    if (input.event !== 'workflow_dispatch' && current !== input.eventSha) {
        if (exec('git', ['merge-base', '--is-ancestor', input.eventSha, current]).code !== 0)
            return noop('stale')
        try {
            const commits = run(exec, 'git', [
                'rev-list',
                '--reverse',
                '--first-parent',
                `${input.eventSha}..${current}`
            ])
                .trim()
                .split('\n')
            let parent = input.eventSha
            for (const commit of commits) {
                oidValue(commit)
                // A release commit must have exactly its tested parent, never a merge.
                requireValue(
                    run(exec, 'git', ['rev-list', '--parents', '-n', '1', commit]).trim() ===
                        `${commit} ${parent}`,
                    'Unexpected release ancestry'
                )
                requireValue(
                    run(exec, 'git', ['diff', '--summary', parent, commit]).trim() === '',
                    'Release file structure changed'
                )
                const paths = run(exec, 'git', ['diff', '--name-only', parent, commit])
                    .trim()
                    .split('\n')
                validateMetadata(
                    (path) => run(exec, 'git', ['show', `${parent}:${path}`]),
                    (path) => run(exec, 'git', ['show', `${commit}:${path}`]),
                    paths,
                    policy
                )
                parent = commit
            }
            requireValue(parent === current, 'Incomplete release ancestry')
        } catch {
            return noop('stale')
        }
    }
    const version = JSON.parse(run(exec, 'git', ['show', `${current}:package.json`])).version
    requireValue(versionPattern.test(`v${version}`), 'Invalid prepared version')
    return { ready: true, outcome: 'ready', checkoutSha: current, version }
}

export const selectTagBaseline = (input, exec = transport) => {
    requireValue(['push', 'workflow_dispatch'].includes(input.event), 'Unsupported event')
    requireValue(shaPattern.test(input.eventSha), 'Invalid original event SHA')
    if (input.skip || input.ref !== 'refs/heads/main') return { ready: false, outcome: 'skipped' }
    const current = main(exec)
    if (input.event === 'push' && current !== input.eventSha)
        return { ready: false, outcome: 'stale', message: retry }
    return { ready: true, outcome: 'ready', checkoutSha: current }
}

export const validateState = (state, identity) => {
    requireValue(
        state &&
            state.run === identity.run &&
            state.attempt === identity.attempt &&
            /^\d+$/.test(state.run) &&
            /^\d+$/.test(state.attempt),
        'Missing or foreign run state'
    )
    requireValue(
        shaPattern.test(state.base) &&
            (state.version === null ||
                (state.scheme === 'calver'
                    ? /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(state.version)
                    : versionPattern.test(state.version))) &&
            (state.commit === null || shaPattern.test(state.commit)) &&
            (state.tagOid === null || shaPattern.test(state.tagOid)),
        'Malformed artifact identity'
    )
    requireValue(
        state.scheme === undefined || state.scheme === 'calver',
        'Malformed release scheme'
    )
    requireValue(
        statuses.includes(state.tag) &&
            statuses.includes(state.release) &&
            ['not-attempted', 'unknown', 'published'].includes(state.registry) &&
            typeof state.canonical === 'boolean',
        'Malformed lifecycle state'
    )
    requireValue(
        state.releaseId === null || (Number.isSafeInteger(state.releaseId) && state.releaseId > 0),
        'Malformed release ID'
    )
    requireValue(
        state.tag !== 'created' || (state.tagOid && state.commit && state.version),
        'Incomplete tag ownership'
    )
    requireValue(
        state.release !== 'created' || (state.releaseId && state.tag === 'created'),
        'Incomplete release ownership'
    )
    requireValue(
        !state.canonical || state.registry === 'published',
        'Malformed publication barrier'
    )
    return state
}
export const readState = (path, identity) =>
    validateState(JSON.parse(readFileSync(path, 'utf8')), identity)
export const writeState = (path, state, identity) => {
    validateState(state, identity)
    const temporary = `${path}.${process.pid}.tmp`
    let failure
    try {
        writeFileSync(temporary, JSON.stringify(state) + '\n', { mode: 0o600, flag: 'wx' })
        renameSync(temporary, path)
    } catch (error) {
        failure = error
    }
    try {
        unlinkSync(temporary)
    } catch (error) {
        if (error.code !== 'ENOENT') failure ||= error
    }
    if (failure) throw failure
}
export const initialize = (path, identity, base, exec = transport) => {
    requireValue(shaPattern.test(base), 'Invalid tested SHA')
    if (main(exec) !== base) return { ready: false, message: retry }
    requireValue(
        oidValue(run(exec, 'git', ['rev-parse', 'HEAD'])) === base,
        'Checkout differs from tested SHA'
    )
    requireValue(
        run(exec, 'git', ['status', '--porcelain']).trim() === '',
        'Dirty release checkout'
    )
    const state = {
        ...identity,
        base,
        version: null,
        commit: null,
        tagOid: null,
        tag: 'not-attempted',
        release: 'not-attempted',
        releaseId: null,
        registry: 'not-attempted',
        canonical: false
    }
    writeState(path, state, identity)
    run(exec, 'git', ['switch', '-c', `release-${identity.run}-${identity.attempt}`, base])
    return { ready: true }
}
const api = (exec, args) => {
    const result = exec('gh', ['api', '--include', ...args])
    const match = result.stdout.match(/^HTTP\/\S+ (\d{3})[^\r\n]*\r?\n[\s\S]*?\r?\n\r?\n([\s\S]*)$/)
    requireValue(match, 'Unknown GitHub API response')
    const status = Number(match[1])
    requireValue(
        (status >= 200 && status < 300 && result.code === 0) ||
            (status === 404 && result.code !== 0),
        'GitHub API operation failed'
    )
    return { status, data: status === 204 || status === 404 ? null : JSON.parse(match[2]) }
}
const releasePath = 'repos/{owner}/{repo}/releases'
const remoteTag = (exec, version) => {
    const text = run(exec, 'git', [
        'ls-remote',
        'origin',
        `refs/tags/${version}`,
        `refs/tags/${version}^{}`
    ]).trim()
    if (!text) return null
    const rows = text.split('\n').map((line) => line.split(/\s+/))
    requireValue(
        rows.length === 2 && rows.every((row) => row.length === 2 && shaPattern.test(row[0])),
        'Unknown annotated tag response'
    )
    const object = rows.find((row) => row[1] === `refs/tags/${version}`)
    const peeled = rows.find((row) => row[1] === `refs/tags/${version}^{}`)
    requireValue(object && peeled, 'Unknown tag identity')
    return { oid: object[0], commit: peeled[0] }
}
export const validateDelta = (
    state,
    exec = transport,
    read = (path) => readFileSync(path, 'utf8'),
    policy = defaultPolicy
) => {
    requireValue(
        oidValue(run(exec, 'git', ['rev-parse', 'HEAD'])) === state.base,
        'Untested release parent'
    )
    requireValue(
        run(exec, 'git', ['ls-files', '--others', '--exclude-standard']).trim() === '',
        'Untracked release content'
    )
    requireValue(
        run(exec, 'git', ['diff', '--summary', 'HEAD']).trim() === '',
        'Release file structure changed'
    )
    const paths = run(exec, 'git', ['diff', '--name-only', 'HEAD']).trim().split('\n')
    return validateMetadata(
        (path) => run(exec, 'git', ['show', `${state.base}:${path}`]),
        read,
        paths,
        policy
    )
}
export const pushArtifacts = (path, identity, exec = transport) => {
    const state = readState(path, identity)
    requireValue(
        state.version && state.commit && state.tagOid && state.tag === 'not-attempted',
        'Invalid pre-push state'
    )
    requireValue(remoteTag(exec, state.version) === null, 'Version tag collision')
    requireValue(
        api(exec, [`${releasePath}/tags/${state.version}`]).status === 404,
        'Version release collision'
    )
    if (state.scheme === 'calver')
        requireValue(state.commit === state.base, 'Untested CalVer commit')
    else run(exec, 'git', ['push', 'origin', 'HEAD:refs/heads/main'])
    state.tag = 'unknown'
    writeState(path, state, identity)
    const result = exec('git', [
        'push',
        '--porcelain',
        'origin',
        `refs/tags/${state.version}:refs/tags/${state.version}`
    ])
    // Exit zero also covers up-to-date. Only the porcelain new-ref flag proves creation.
    const expected = `*\trefs/tags/${state.version}:refs/tags/${state.version}\t[new tag]`
    requireValue(
        result.code === 0 && result.stdout.split(/\r?\n/).includes(expected),
        'Tag creation unconfirmed; retain metadata'
    )
    const observed = remoteTag(exec, state.version)
    requireValue(
        observed?.oid === state.tagOid && observed.commit === state.commit,
        'Created tag identity changed'
    )
    state.tag = 'created'
    writeState(path, state, identity)
}
export const createRelease = (path, identity, notes, exec = transport, generateNotes = false) => {
    const state = readState(path, identity)
    requireValue(
        state.tag === 'created' && state.release === 'not-attempted',
        'Release requires confirmed tag creation'
    )
    requireValue(
        api(exec, [`${releasePath}/tags/${state.version}`]).status === 404,
        'Version release collision'
    )
    state.release = 'unknown'
    writeState(path, state, identity)
    const request = `${path}.request.json`
    writeFileSync(
        request,
        JSON.stringify({
            // eslint-disable-next-line camelcase -- GitHub release API requires this wire field.
            tag_name: state.version,
            // eslint-disable-next-line camelcase -- GitHub release API requires this wire field.
            target_commitish: state.commit,
            name: `Release ${state.version}`,
            ...(generateNotes
                ? {
                      // eslint-disable-next-line camelcase -- GitHub release API requires this wire field.
                      generate_release_notes: true
                  }
                : { body: notes }),
            // eslint-disable-next-line camelcase -- GitHub release API requires this wire field.
            make_latest: 'true'
        }),
        { mode: 0o600 }
    )
    try {
        const response = api(exec, ['--method', 'POST', releasePath, '--input', request])
        requireValue(
            response.status === 201 &&
                Number.isSafeInteger(response.data.id) &&
                response.data.id > 0 &&
                response.data.tag_name === state.version &&
                response.data.target_commitish === state.commit,
            'Release creation unconfirmed'
        )
        state.releaseId = response.data.id
        state.release = 'created'
        writeState(path, state, identity)
    } finally {
        unlinkSync(request)
    }
}
export const markRegistry = (path, identity, outcome) => {
    const state = readState(path, identity)
    requireValue(
        state.tag === 'created' && state.release === 'created',
        'Publication requires owned artifacts'
    )
    if (outcome === 'attempt') {
        requireValue(state.registry === 'not-attempted', 'Publication already attempted')
        state.registry = 'unknown'
    } else {
        requireValue(
            outcome === 'success' && state.registry === 'unknown',
            'Invalid publication transition'
        )
        state.registry = 'published'
        state.canonical = true
    }
    writeState(path, state, identity)
}
export const cleanup = (
    path,
    identity,
    canonicalSuccess = false,
    exec = transport,
    warn = console.warn
) => {
    if (canonicalSuccess) return
    const caller =
        typeof identity?.run === 'string' &&
        typeof identity?.attempt === 'string' &&
        /^\d+$/.test(identity.run) &&
        /^\d+$/.test(identity.attempt)
            ? `run ${identity.run} attempt ${identity.attempt}`
            : 'invalid caller identity'
    const artifact = [caller]
    const report = (message) => warn(`::warning::${artifact.join('; ')}: ${message}`)
    try {
        const state = readState(path, identity)
        // Only validated state may contribute artifact identifiers to diagnostics.
        if (state.version) artifact.push(`version ${state.version}`)
        if (state.release === 'created') artifact.push(`release ID ${state.releaseId}`)
        if (state.tagOid) artifact.push(`tag object ${state.tagOid}`)
        if (state.commit) artifact.push(`commit ${state.commit}`)
        if (
            state.canonical ||
            state.registry !== 'not-attempted' ||
            state.tag !== 'created' ||
            state.release === 'unknown'
        ) {
            report(
                'Retaining artifacts: publication or ownership is unconfirmed; manual reconciliation required'
            )
            return
        }
        const tag = remoteTag(exec, state.version)
        if (tag && (tag.oid !== state.tagOid || tag.commit !== state.commit)) {
            report('Retaining replaced tag')
            return
        }
        if (state.release === 'created') {
            const stored = api(exec, [`${releasePath}/${state.releaseId}`])
            if (stored.status !== 404) {
                requireValue(
                    tag &&
                        stored.data.id === state.releaseId &&
                        stored.data.tag_name === state.version &&
                        stored.data.target_commitish === state.commit,
                    'Release identity changed; retaining artifacts'
                )
            }
            // Even a missing stored ID must not allow deletion of a replacement's tag.
            const named = api(exec, [`${releasePath}/tags/${state.version}`])
            if (named.status !== 404 && named.data.id !== state.releaseId) {
                report('Retaining replacement release and tag')
                return
            }
            if (stored.status !== 404) {
                requireValue(
                    named.status === 200 && named.data.id === state.releaseId,
                    'Release lookup inconsistent'
                )
                requireValue(
                    api(exec, ['--method', 'DELETE', `${releasePath}/${state.releaseId}`])
                        .status === 204,
                    'Release deletion unconfirmed'
                )
            }
        } else {
            requireValue(
                api(exec, [`${releasePath}/tags/${state.version}`]).status === 404,
                'Unowned release exists; retaining tag'
            )
        }
        if (tag)
            run(exec, 'git', [
                'push',
                `--force-with-lease=refs/tags/${state.version}:${state.tagOid}`,
                'origin',
                `:refs/tags/${state.version}`
            ])
    } catch (error) {
        // Messages are our own identifiers/policy errors, never transport stderr.
        report(
            `Cleanup retained artifacts: ${error instanceof SyntaxError ? 'malformed state/response' : error.code ? 'state unavailable' : error.message}`
        )
    }
}

const cli = () => {
    const env = process.env
    const identity = { run: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT }
    const path = env.RELEASE_STATE
    const output = (key, value) => {
        if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${key}=${value}\n`)
    }
    switch (process.argv[2]) {
        case 'prepare': {
            const result = selectBaseline(
                {
                    event: env.EVENT_NAME,
                    eventSha: env.EVENT_SHA,
                    ref: env.EVENT_REF,
                    merged: env.PR_FOUND === 'true',
                    skip: env.HAS_SKIP_LABEL === 'true' || env.INPUT_VERSION === 'skip'
                },
                transport,
                readPolicy()
            )
            output('ready', result.ready)
            output('checkout_sha', result.checkoutSha || '')
            output('outcome', result.outcome)
            const message = `${result.outcome}: event ${env.EVENT_SHA}; selected ${result.checkoutSha || 'none'}; version ${result.version || 'none'}; ${result.message || ''}`
            console.log(message)
            if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, message + '\n')
            break
        }
        case 'begin': {
            const result = initialize(path, identity, env.PREPARED_SHA)
            output('ready', result.ready)
            if (!result.ready) {
                console.log(result.message)
                if (env.GITHUB_STEP_SUMMARY)
                    appendFileSync(env.GITHUB_STEP_SUMMARY, result.message + '\n')
            }
            break
        }
        case 'validate': {
            const state = readState(path, identity)
            state.version = validateDelta(state, transport, undefined, readPolicy())
            writeState(path, state, identity)
            break
        }
        case 'push': {
            const state = readState(path, identity)
            state.commit = oidValue(run(transport, 'git', ['rev-parse', 'HEAD']))
            requireValue(
                state.scheme === 'calver'
                    ? state.commit === state.base
                    : run(transport, 'git', ['rev-list', '--parents', '-n', '1', 'HEAD']).trim() ===
                          `${state.commit} ${state.base}`,
                'Version commit has untested parent'
            )
            state.tagOid = oidValue(
                run(transport, 'git', ['rev-parse', `refs/tags/${state.version}`])
            )
            requireValue(
                oidValue(run(transport, 'git', ['rev-parse', `refs/tags/${state.version}^{}`])) ===
                    state.commit,
                'Invalid annotated tag target'
            )
            requireValue(
                run(transport, 'git', ['cat-file', '-t', state.tagOid]).trim() === 'tag',
                'Annotated tag required'
            )
            writeState(path, state, identity)
            pushArtifacts(path, identity)
            break
        }
        case 'release': {
            let notes = `Changes in this Release\n${env.CUSTOM_MESSAGE || env.PR_TITLE || ''}`
            if (['push', 'pull_request'].includes(env.EVENT_NAME) && env.PR_URL)
                notes += `\n\nFor more details, see the [Pull Request](${env.PR_URL})`
            createRelease(path, identity, notes)
            break
        }
        case 'registry-attempt':
            markRegistry(path, identity, 'attempt')
            break
        case 'registry-success':
            markRegistry(path, identity, 'success')
            break
        case 'cleanup':
            cleanup(path, identity, env.CANONICAL_SUCCESS === 'success')
            break
        default:
            throw new Error('Unsupported release operation')
    }
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        cli()
    } catch (error) {
        console.error(
            `Release operation stopped: ${error instanceof SyntaxError ? 'malformed response' : error.code ? 'state operation failed' : error.message}`
        )
        process.exitCode = 1
    }
}
