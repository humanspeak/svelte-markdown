import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { runInNewContext } from 'node:vm'

const root = fileURLToPath(new URL('../../', import.meta.url))
const policy = JSON.parse(readFileSync(join(root, '.github/release-policy.json'), 'utf8'))
const workflow = () =>
    policy.event === 'calver'
        ? ''
        : readFileSync(join(root, '.github/workflows/npm-publish.yml'), 'utf8')
const sha = 'a'.repeat(40)
const oid = 'b'.repeat(40)
const identity = { run: '17', attempt: '2' }
const initial = {
    ...identity,
    base: sha,
    version: 'v1.2.3',
    commit: sha,
    tagOid: oid,
    tag: 'created',
    release: 'created',
    releaseId: 42,
    registry: 'not-attempted',
    canonical: false
}

const cleanupRun = () => {
    if (policy.event === 'calver') return 'node .github/scripts/release-publication.mjs cleanup'
    const text = workflow()
    const marker = '            - name: Cleanup on failure\n'
    assert.equal(text.split(marker).length, 2, 'Unique cleanup step required')
    const step = text.split(marker)[1].split('\n            - ')[0]
    assert.ok(step.includes('              run: |\n'), 'Cleanup run body required')
    return step
        .split('              run: |\n')[1]
        .split('\n')
        .map((line) => {
            if (!line.trim()) return ''
            assert.ok(line.startsWith('                  '), 'Cleanup indentation boundary')
            return line.slice(18)
        })
        .join('\n')
}

const shellFixture = (t, state, expectations = null, command = cleanupRun(), extraEnv = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'release-cleanup-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    mkdirSync(join(dir, '.github/scripts'), { recursive: true })
    const helper = join(root, '.github/scripts/release-publication.mjs')
    if (existsSync(helper))
        copyFileSync(helper, join(dir, '.github/scripts/release-publication.mjs'))
    const statePath = join(dir, 'state.json')
    if (state) writeFileSync(statePath, JSON.stringify(state))
    const log = join(dir, 'calls.jsonl')
    const progress = join(dir, 'progress.json')
    writeFileSync(progress, '0')
    for (const command of ['git', 'gh', 'pnpm', 'curl']) {
        writeFileSync(
            join(dir, command),
            `#!${process.execPath}
const fs = require('node:fs'); const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify([${JSON.stringify(command)}, ...args]) + '\\n');
const expectations = ${JSON.stringify(expectations)};
if (expectations) {
    const index = JSON.parse(fs.readFileSync(${JSON.stringify(progress)}, 'utf8'));
    const expected = expectations[index];
    const actual = [${JSON.stringify(command)}, ...args];
    if (!expected || JSON.stringify(expected[0]) !== JSON.stringify(actual)) process.exit(97);
    fs.writeFileSync(${JSON.stringify(progress)}, JSON.stringify(index + 1));
    process.stdout.write(expected[1]?.stdout || '');
    process.stderr.write(expected[1]?.stderr || '');
    process.exit(expected[1]?.code || 0);
}
const allowed = [['gh','release','delete','v1.2.3','--yes'], ['git','tag','-d','v1.2.3'], ['git','push','--delete','origin','v1.2.3']];
if (!allowed.some(call => JSON.stringify(call) === JSON.stringify([${JSON.stringify(command)}, ...args]))) process.exit(97);

`,
            { mode: 0o755 }
        )
    }
    const result = spawnSync('/bin/bash', ['-e', '-c', command], {
        cwd: dir,
        encoding: 'utf8',
        timeout: 10000,
        env: {
            PATH: `${dir}:${dirname(process.execPath)}:/usr/bin:/bin`,
            HOME: dir,
            RELEASE_VERSION: 'v1.2.3',
            RELEASE_STATE: statePath,
            GITHUB_RUN_ID: identity.run,
            GITHUB_RUN_ATTEMPT: identity.attempt,
            CANONICAL_SUCCESS: state?.canonical ? 'success' : '',
            ...extraEnv
        }
    })
    assert.equal(result.error, undefined)
    const calls = existsSync(log)
        ? readFileSync(log, 'utf8').trim().split('\n').map(JSON.parse)
        : []
    assert.equal(result.status, 0, result.stderr)
    assert.ok(!`${result.stdout}${result.stderr}`.includes('private transport diagnostic'))
    if (expectations) {
        assert.deepEqual(
            calls,
            expectations.map((entry) => entry[0])
        )
        assert.equal(JSON.parse(readFileSync(progress, 'utf8')), expectations.length)
    }
    return calls
}

test('never deletes pre-existing release artifacts', (t) => {
    assert.deepEqual(shellFixture(t), [])
})
test('keeps published metadata after canonical registry success', (t) => {
    assert.deepEqual(shellFixture(t, { ...initial, canonical: true, registry: 'published' }), [])
})

const fixturePolicy = {
    manifests: [
        'package.json',
        'tombstones/svelte-diff/package.json',
        'tombstones/svelte-diff-match-patch/package.json'
    ],
    lockfile: null,
    readme: 'managed'
}
const load = async () => {
    const helper = await import('./release-publication.mjs')
    return {
        ...helper,
        validateMetadata: (before, after, paths, config = fixturePolicy) =>
            helper.validateMetadata(before, after, paths, config),
        selectBaseline: (input, exec, config = fixturePolicy) =>
            helper.selectBaseline(input, exec, config),
        validateDelta: (state, exec, read, config = fixturePolicy) =>
            helper.validateDelta(state, exec, read, config)
    }
}
const fixtureState = (t, changes = {}) => {
    const dir = mkdtempSync(join(tmpdir(), 'release-state-'))
    t.after(() => rmSync(dir, { recursive: true, force: true }))
    const path = join(dir, 'state.json')
    writeFileSync(path, JSON.stringify({ ...initial, ...changes }))
    return path
}
// Exact arrays, in order. An unexpected command never falls through to a real executable.
const scripted = (expectations) => {
    const calls = [],
        unexpected = []
    let index = 0
    const exec = (command, args) => {
        const call = [command, ...args]
        calls.push(call)
        const expectation = expectations[index++]
        if (
            !expectation ||
            !expectation[0].every((value, i) => value === call[i]) ||
            expectation[0].length !== call.length
        ) {
            unexpected.push(call)
            throw new Error('Unexpected mock command')
        }
        return { code: 0, stdout: '', ...expectation[1] }
    }
    return {
        exec,
        calls,
        done: () => {
            assert.deepEqual(unexpected, [])
            assert.equal(index, expectations.length)
        }
    }
}
const response = (status, data = null) => ({
    code: status === 404 ? 1 : 0,
    stdout: `HTTP/2.0 ${status} Fixture\r\nContent-Type: application/json\r\n\r\n${data === null ? '' : JSON.stringify(data)}`
})
const releaseApi = (suffix) => ['gh', 'api', '--include', `repos/{owner}/{repo}/releases/${suffix}`]
const tagLookup = ['git', 'ls-remote', 'origin', 'refs/tags/v1.2.3', 'refs/tags/v1.2.3^{}']
const tagResponse = (object = oid, commit = sha) => ({
    stdout: `${object}\trefs/tags/v1.2.3\n${commit}\trefs/tags/v1.2.3^{}\n`
})
const releaseData = (id = 42, commit = sha) => ({
    id,
    // eslint-disable-next-line camelcase -- Fixture preserves required GitHub API wire fields.
    tag_name: 'v1.2.3',
    // eslint-disable-next-line camelcase -- Fixture preserves required GitHub API wire fields.
    target_commitish: commit
})
const lease = [
    'git',
    'push',
    `--force-with-lease=refs/tags/v1.2.3:${oid}`,
    'origin',
    ':refs/tags/v1.2.3'
]
const owned = () => [
    [tagLookup, tagResponse()],
    [releaseApi('42'), response(200, releaseData())],
    [releaseApi('tags/v1.2.3'), response(200, releaseData())],
    [
        ['gh', 'api', '--include', '--method', 'DELETE', 'repos/{owner}/{repo}/releases/42'],
        response(204)
    ],
    [lease, {}]
]

test('ownership state atomic replacement validates run and malformed fields', async (t) => {
    const { readState, writeState } = await load()
    const path = fixtureState(t)
    writeState(path, initial, identity)
    assert.deepEqual(readState(path, identity), initial)
    assert.throws(() => readState(path, { run: '18', attempt: '2' }))
    assert.throws(() => readState(path, { run: '17', attempt: '3' }))
    for (const changes of [
        { tagOid: 'bad' },
        { releaseId: '42' },
        { releaseId: -1 },
        { tag: 'yes' },
        { canonical: true },
        { registry: 'absent' },
        { base: 'bad' }
    ]) {
        assert.throws(() => writeState(path, { ...initial, ...changes }, identity))
        assert.deepEqual(readState(path, identity), initial)
    }
})

test('cleanup deletes only confirmed numeric release ID and leased annotated tag', async (t) => {
    const { cleanup } = await load()
    const mock = scripted(owned())
    cleanup(fixtureState(t), identity, false, mock.exec, (message) => assert.fail(message))
    mock.done()
    assert.ok(!mock.calls.some((call) => call.includes('--delete') || call.includes('release')))
})

test('cleanup twice is idempotent when owned artifacts are gone', async (t) => {
    const { cleanup } = await load()
    const path = fixtureState(t)
    const mock = scripted([
        ...owned(),
        [tagLookup, {}],
        [releaseApi('42'), response(404)],
        [releaseApi('tags/v1.2.3'), response(404)]
    ])
    cleanup(path, identity, false, mock.exec, (message) => assert.fail(message))
    cleanup(path, identity, false, mock.exec, (message) => assert.fail(message))
    mock.done()
})

for (const [name, changes] of [
    ['current-run mismatch', { run: '99' }],
    ['attempt mismatch', { attempt: '4' }],
    ['malformed state', { releaseId: '42' }],
    ['unknown registry attempt', { registry: 'unknown' }],
    ['canonical published', { registry: 'published', canonical: true }],
    ['unknown tag creation', { tag: 'unknown', release: 'unknown' }],
    ['unknown release creation', { release: 'unknown', releaseId: null }],
    [
        'only local artifacts exist',
        { tag: 'not-attempted', release: 'not-attempted', releaseId: null }
    ]
]) {
    test(`cleanup retention: ${name}`, async (t) => {
        const { cleanup } = await load()
        const mock = scripted([]),
            warnings = []
        cleanup(fixtureState(t, changes), identity, false, mock.exec, (message) =>
            warnings.push(message)
        )
        mock.done()
        assert.equal(warnings.length, 1)
        assert.ok(warnings[0].includes('run 17 attempt 2'))
        if (['current-run mismatch', 'attempt mismatch', 'malformed state'].includes(name)) {
            assert.ok(!warnings[0].includes('version v1.2.3'))
            assert.ok(!warnings[0].includes('; release ID '))
            assert.ok(!warnings[0].includes(oid))
        } else {
            assert.ok(warnings[0].includes('version v1.2.3'))
            assert.ok(warnings[0].includes(`tag object ${oid}`))
            assert.ok(warnings[0].includes(`commit ${sha}`))
            if ((changes.release || initial.release) === 'created')
                assert.ok(warnings[0].includes('release ID 42'))
            else assert.ok(!warnings[0].includes('; release ID '))
        }
    })
}

test('cleanup missing and invalid JSON state make no transport calls', async (t) => {
    const { cleanup } = await load()
    const path = fixtureState(t)
    const mock = scripted([]),
        warnings = []
    const warn = (message) => warnings.push(message)
    writeFileSync(path, '{private state content')
    cleanup(path, identity, false, mock.exec, warn)
    rmSync(path)
    cleanup(path, identity, false, mock.exec, warn)
    mock.done()
    assert.deepEqual(warnings, [
        '::warning::run 17 attempt 2: Cleanup retained artifacts: malformed state/response',
        '::warning::run 17 attempt 2: Cleanup retained artifacts: state unavailable'
    ])
})

test('cleanup warnings exclude malformed, foreign and invalid caller identifiers', async (t) => {
    const { cleanup } = await load()
    const privateValue = 'private state content\n::error::untrusted'
    const mock = scripted([]),
        warnings = []
    for (const changes of [
        { run: '99', version: privateValue },
        { attempt: '4', commit: privateValue },
        { releaseId: privateValue },
        { tagOid: privateValue }
    ]) {
        cleanup(fixtureState(t, changes), identity, false, mock.exec, (message) =>
            warnings.push(message)
        )
    }
    cleanup(fixtureState(t), { run: privateValue, attempt: '2' }, false, mock.exec, (message) =>
        warnings.push(message)
    )
    mock.done()
    assert.equal(warnings.length, 5)
    for (const warning of warnings) {
        assert.ok(!warning.includes('private state content'))
        assert.ok(!warning.includes('::error::'))
        assert.ok(!warning.includes('version'))
        assert.ok(!warning.includes('; release ID '))
        assert.ok(!warning.includes(sha))
        assert.ok(!warning.includes(oid))
    }
    assert.ok(warnings.slice(0, 4).every((warning) => warning.includes('run 17 attempt 2')))
    assert.ok(warnings[4].includes('invalid caller identity'))
})

test('cleanup independent canonical success guard survives atomic state-write failure', async (t) => {
    const { cleanup, markRegistry } = await load()
    const path = fixtureState(t, { registry: 'unknown' })
    mkdirSync(`${path}.${process.pid}.tmp`)
    assert.throws(() => markRegistry(path, identity, 'success'))
    assert.equal(JSON.parse(readFileSync(path)).canonical, false)
    const mock = scripted([])
    cleanup(path, identity, true, mock.exec, (message) => assert.fail(message))
    mock.done()
    assert.deepEqual(shellFixture(t, { ...initial, canonical: true, registry: 'unknown' }), [])
})

test('cleanup retains run B replacement tag object or commit', async (t) => {
    const { cleanup } = await load()
    for (const output of [
        tagResponse('c'.repeat(40)),
        tagResponse(oid, 'c'.repeat(40)),
        { stdout: 'ambiguous' }
    ]) {
        const mock = scripted([[tagLookup, output]])
        cleanup(fixtureState(t), identity, false, mock.exec, () => undefined)
        mock.done()
    }
})

test('cleanup stored release ID 404 retains a different ID on same tag and OID', async (t) => {
    const { cleanup } = await load()
    const mock = scripted([
        [tagLookup, tagResponse()],
        [releaseApi('42'), response(404)],
        [releaseApi('tags/v1.2.3'), response(200, releaseData(99))]
    ])
    cleanup(fixtureState(t), identity, false, mock.exec, () => undefined)
    mock.done()
})

test('cleanup retains changed release ID or target and API errors', async (t) => {
    const { cleanup } = await load()
    for (const result of [
        response(200, releaseData(99)),
        response(200, releaseData(42, 'c'.repeat(40))),
        response(403),
        { code: 1, stdout: '' }
    ]) {
        const mock = scripted([
            [tagLookup, tagResponse()],
            [releaseApi('42'), result]
        ])
        cleanup(fixtureState(t), identity, false, mock.exec, () => undefined)
        mock.done()
    }
})

test('cleanup deletion lease race preserves replacement tag and surfaces warning', async (t) => {
    const { cleanup } = await load()
    const expectations = owned()
    expectations.at(-1)[1] = { code: 1, stdout: '' }
    const mock = scripted(expectations),
        warnings = []
    cleanup(fixtureState(t), identity, false, mock.exec, (message) => warnings.push(message))
    mock.done()
    assert.equal(warnings.length, 1)
    assert.match(warnings[0], /reconcile/)
    for (const identifier of [
        'run 17 attempt 2',
        'version v1.2.3',
        'release ID 42',
        `tag object ${oid}`,
        `commit ${sha}`
    ])
        assert.ok(warnings[0].includes(identifier))
})

test('cleanup owns tag only when no release was ever attempted or found', async (t) => {
    const { cleanup } = await load()
    for (const found of [false, true]) {
        const expectations = [
            [tagLookup, tagResponse()],
            [releaseApi('tags/v1.2.3'), found ? response(200, releaseData(99)) : response(404)]
        ]
        if (!found) expectations.push([lease, {}])
        const mock = scripted(expectations)
        cleanup(
            fixtureState(t, { release: 'not-attempted', releaseId: null }),
            identity,
            false,
            mock.exec,
            () => undefined
        )
        mock.done()
    }
})

const tagPush = ['git', 'push', '--porcelain', 'origin', 'refs/tags/v1.2.3:refs/tags/v1.2.3']
const newTag = { stdout: 'To fixture\n*\trefs/tags/v1.2.3:refs/tags/v1.2.3\t[new tag]\nDone\n' }
const prePush = () => [
    [tagLookup, {}],
    [releaseApi('tags/v1.2.3'), response(404)]
]
const mainPush = ['git', 'push', 'origin', 'HEAD:refs/heads/main']

test('creation pushes explicit fast-forward main and one confirmed annotated tag', async (t) => {
    const { pushArtifacts, readState } = await load()
    const path = fixtureState(t, {
        tag: 'not-attempted',
        release: 'not-attempted',
        releaseId: null
    })
    const mock = scripted([
        ...prePush(),
        [mainPush, {}],
        [tagPush, newTag],
        [tagLookup, tagResponse()]
    ])
    pushArtifacts(path, identity, mock.exec)
    mock.done()
    assert.equal(readState(path, identity).tag, 'created')
})

for (const [name, result] of [
    ['main push rejection', { code: 1 }],
    ['failure after main push', { code: 1 }],
    ['up-to-date tag response', { stdout: '=\trefs/tags/v1.2.3:refs/tags/v1.2.3\t[up to date]\n' }],
    ['ambiguous tag response', { stdout: 'success\n' }]
]) {
    test(`creation retention: ${name}`, async (t) => {
        const { pushArtifacts, readState, cleanup } = await load()
        const path = fixtureState(t, {
            tag: 'not-attempted',
            release: 'not-attempted',
            releaseId: null
        })
        const failureAtMain = name === 'main push rejection'
        const mock = scripted([
            ...prePush(),
            [mainPush, failureAtMain ? result : {}],
            ...(failureAtMain ? [] : [[tagPush, result]])
        ])
        assert.throws(() => pushArtifacts(path, identity, mock.exec))
        mock.done()
        assert.equal(readState(path, identity).tag, failureAtMain ? 'not-attempted' : 'unknown')
        const noCalls = scripted([])
        cleanup(path, identity, false, noCalls.exec, () => undefined)
        noCalls.done()
    })
}

test('creation version collision preserves pre-existing tag and release', async (t) => {
    const { pushArtifacts } = await load()
    for (const expectations of [
        [[tagLookup, tagResponse()]],
        [
            [tagLookup, {}],
            [releaseApi('tags/v1.2.3'), response(200, releaseData())]
        ]
    ]) {
        const mock = scripted(expectations)
        assert.throws(() =>
            pushArtifacts(
                fixtureState(t, {
                    tag: 'not-attempted',
                    release: 'not-attempted',
                    releaseId: null
                }),
                identity,
                mock.exec
            )
        )
        mock.done()
    }
})

test('creation API records numeric identity from creation response with structured notes file', async (t) => {
    const { createRelease, readState } = await load()
    const path = fixtureState(t, { release: 'not-attempted', releaseId: null })
    const mock = scripted([
        [releaseApi('tags/v1.2.3'), response(404)],
        [
            [
                'gh',
                'api',
                '--include',
                '--method',
                'POST',
                'repos/{owner}/{repo}/releases',
                '--input',
                `${path}.request.json`
            ],
            response(201, releaseData())
        ]
    ])
    const exec = (command, args) => {
        if (args.includes('POST')) {
            const request = JSON.parse(readFileSync(`${path}.request.json`, 'utf8'))
            assert.equal(request.body, 'Notes "quotes"\n$(literal) `literal`')
            assert.equal(request.target_commitish, sha)
            assert.equal(readState(path, identity).release, 'unknown')
        }
        return mock.exec(command, args)
    }
    createRelease(path, identity, 'Notes "quotes"\n$(literal) `literal`', exec)
    mock.done()
    assert.equal(readState(path, identity).releaseId, 42)
    assert.equal(readState(path, identity).release, 'created')
    assert.equal(existsSync(`${path}.request.json`), false)
})

test('creation ambiguous release response retains unknown ownership without later lookup inference', async (t) => {
    const { createRelease, readState, cleanup } = await load()
    for (const result of [
        // eslint-disable-next-line camelcase -- Fixture preserves required GitHub API wire fields.
        response(201, { tag_name: 'v1.2.3' }),
        { code: 1, stdout: '' },
        response(200, releaseData()),
        response(201, releaseData(42, 'c'.repeat(40)))
    ]) {
        const path = fixtureState(t, { release: 'not-attempted', releaseId: null })
        const mock = scripted([
            [releaseApi('tags/v1.2.3'), response(404)],
            [
                [
                    'gh',
                    'api',
                    '--include',
                    '--method',
                    'POST',
                    'repos/{owner}/{repo}/releases',
                    '--input',
                    `${path}.request.json`
                ],
                result
            ]
        ])
        assert.throws(() => createRelease(path, identity, 'notes', mock.exec))
        mock.done()
        assert.equal(readState(path, identity).release, 'unknown')
        const noCalls = scripted([])
        cleanup(path, identity, false, noCalls.exec, () => undefined)
        noCalls.done()
    }
})

test('publish outcome attempt and success are irreversible cleanup barriers', async (t) => {
    const { markRegistry, readState, cleanup } = await load()
    const path = fixtureState(t)
    markRegistry(path, identity, 'attempt')
    assert.equal(readState(path, identity).registry, 'unknown')
    const mock = scripted([])
    cleanup(path, identity, false, mock.exec, () => undefined)
    markRegistry(path, identity, 'success')
    assert.equal(readState(path, identity).canonical, true)
    cleanup(path, identity, false, mock.exec, () => undefined)
    assert.throws(() => markRegistry(path, identity, 'attempt'))
    mock.done()
})

const fetchMain = (current) => [
    [['git', 'fetch', '--no-tags', 'origin', 'refs/heads/main'], {}],
    [['git', 'rev-parse', 'FETCH_HEAD'], { stdout: `${current}\n` }]
]
const baselineInput = {
    event: 'push',
    eventSha: sha,
    ref: 'refs/heads/main',
    merged: true,
    skip: false
}

test('baseline equal SHA selects immutable event checkout', async () => {
    const { selectBaseline } = await load()
    const mock = scripted([
        ...fetchMain(sha),
        [['git', 'show', `${sha}:package.json`], { stdout: '{"version":"1.2.3"}' }]
    ])
    assert.deepEqual(selectBaseline(baselineInput, mock.exec), {
        ready: true,
        outcome: 'ready',
        checkoutSha: sha,
        version: '1.2.3'
    })
    mock.done()
})

test('baseline provenance skip labels, no merged PR, manual skip/nonmain make zero calls', async () => {
    const { selectBaseline } = await load()
    const mock = scripted([])
    for (const changes of [
        { merged: false },
        { skip: true },
        { event: 'workflow_dispatch', skip: true },
        { event: 'workflow_dispatch', ref: 'refs/heads/feature' }
    ]) {
        const result = selectBaseline({ ...baselineInput, ...changes }, mock.exec)
        assert.equal(result.ready, false)
        assert.match(result.message, /fresh qualifying main event or manual retry/)
    }
    mock.done()
})

test('baseline manual main selects current main before gates', async () => {
    const { selectBaseline } = await load()
    const current = 'c'.repeat(40)
    const mock = scripted([
        ...fetchMain(current),
        [['git', 'show', `${current}:package.json`], { stdout: '{"version":"1.2.4"}' }]
    ])
    assert.equal(
        selectBaseline({ ...baselineInput, event: 'workflow_dispatch' }, mock.exec).checkoutSha,
        current
    )
    mock.done()
})

test('baseline ancestry failure is stale; malformed remote response is conservative', async () => {
    const { selectBaseline } = await load()
    const current = 'c'.repeat(40)
    const mock = scripted([
        ...fetchMain(current),
        [['git', 'merge-base', '--is-ancestor', sha, current], { code: 1 }]
    ])
    assert.equal(selectBaseline(baselineInput, mock.exec).outcome, 'stale')
    mock.done()
    for (const output of ['', 'main', `${sha}\n${current}`]) {
        const bad = scripted(fetchMain(output))
        assert.throws(() => selectBaseline(baselineInput, bad.exec))
        bad.done()
    }
})

const metadata = (version) => ({
    'package.json': JSON.stringify({
        name: '@humanspeak/svelte-diff',
        version,
        dependencies: { example: '^1.0.0' },
        nested: { array: [1, { a: 2, b: 3 }] }
    }),
    'tombstones/svelte-diff/package.json': JSON.stringify({
        version,
        dependencies: { '@humanspeak/svelte-diff': `^${version}`, other: '1' }
    }),
    'tombstones/svelte-diff-match-patch/package.json': JSON.stringify({
        version,
        dependencies: { '@humanspeak/svelte-diff': `^${version}` }
    }),
    'README.md': `# README\n<!-- docs-kit:ecosystem start -->\nversion ${version}\n<!-- docs-kit:ecosystem end -->\n`
})
const metadataPaths = Object.keys(metadata('1.2.3'))

test('baseline metadata structural JSON comparison preserves nested keys, arrays and dependencies', async () => {
    const { validateMetadata } = await load()
    const before = metadata('1.2.3'),
        after = metadata('1.2.4')
    const pkg = JSON.parse(after['package.json'])
    after['package.json'] = JSON.stringify({
        nested: { array: [1, { b: 3, a: 2 }] },
        dependencies: pkg.dependencies,
        version: pkg.version,
        name: pkg.name
    })
    assert.equal(
        validateMetadata(
            (path) => before[path],
            (path) => after[path],
            metadataPaths
        ),
        'v1.2.4'
    )
    for (const mutate of [
        (pkg) => (pkg.dependencies.example = '^2.0.0'),
        (pkg) => pkg.nested.array.reverse(),
        (pkg) => (pkg.nested.array[1].a = 9),
        (pkg) => (pkg.newKey = true)
    ]) {
        const changed = JSON.parse(after['package.json'])
        mutate(changed)
        assert.throws(() =>
            validateMetadata(
                (path) => before[path],
                (path) => (path === 'package.json' ? JSON.stringify(changed) : after[path]),
                metadataPaths
            )
        )
    }
})

test('baseline metadata rejects unrelated README, duplicate/missing block, source and invalid version/range', async () => {
    const { validateMetadata } = await load()
    const before = metadata('1.2.3')
    for (const changes of [
        { 'README.md': 'unrelated\n' + metadata('1.2.4')['README.md'] },
        { 'README.md': metadata('1.2.4')['README.md'] + '<!-- docs-kit:ecosystem start -->' },
        { 'README.md': '# missing' },
        { 'package.json': metadata('9.9.9')['package.json'] },
        {
            'tombstones/svelte-diff/package.json':
                metadata('1.2.3')['tombstones/svelte-diff/package.json']
        },
        {
            'tombstones/svelte-diff/package.json': JSON.stringify({
                version: '1.2.4',
                dependencies: { '@humanspeak/svelte-diff': '*', other: '1' }
            })
        }
    ]) {
        const after = { ...metadata('1.2.4'), ...changes }
        assert.throws(() =>
            validateMetadata(
                (path) => before[path],
                (path) => after[path],
                metadataPaths
            )
        )
    }
    assert.throws(() =>
        validateMetadata(
            (path) => before[path],
            (path) => metadata('1.2.4')[path],
            [...metadataPaths, 'src/lib/index.ts']
        )
    )
})

test('baseline version-only advancement validates full delta before tests; source/dependency advancement stays stale', async () => {
    const { selectBaseline } = await load()
    const current = 'c'.repeat(40)
    for (const scenario of ['metadata', 'source', 'dependency']) {
        const before = metadata('1.2.3'),
            after = metadata('1.2.4')
        if (scenario === 'dependency')
            after['package.json'] = after['package.json'].replace('^1.0.0', '^2.0.0')
        const paths = scenario === 'source' ? ['src/lib/index.ts'] : metadataPaths
        const expectations = [
            ...fetchMain(current),
            [['git', 'merge-base', '--is-ancestor', sha, current], {}],
            [
                ['git', 'rev-list', '--reverse', '--first-parent', `${sha}..${current}`],
                { stdout: current }
            ],
            [['git', 'rev-list', '--parents', '-n', '1', current], { stdout: `${current} ${sha}` }],
            [['git', 'diff', '--summary', sha, current], {}],
            [['git', 'diff', '--name-only', sha, current], { stdout: paths.join('\n') }]
        ]
        if (scenario !== 'source') {
            // Read canonical pair, then each manifest pair; dependency failure stops immediately.
            const reads = [
                'package.json',
                ...(scenario === 'dependency' ? ['package.json'] : metadataPaths)
            ]
            for (const path of reads) {
                expectations.push(
                    [['git', 'show', `${sha}:${path}`], { stdout: before[path] }],
                    [['git', 'show', `${current}:${path}`], { stdout: after[path] }]
                )
            }
        }
        if (scenario === 'metadata')
            expectations.push([
                ['git', 'show', `${current}:package.json`],
                { stdout: after['package.json'] }
            ])
        const mock = scripted(expectations)
        const result = selectBaseline(baselineInput, mock.exec)
        assert.equal(result.ready, scenario === 'metadata')
        if (!result.ready) assert.equal(result.outcome, 'stale')
        mock.done()
    }
})

test('main advanced after testing causes no mutation or ownership state', async (t) => {
    const { initialize } = await load()
    const path = fixtureState(t)
    rmSync(path)
    const mock = scripted(fetchMain('c'.repeat(40)))
    assert.equal(initialize(path, identity, sha, mock.exec).ready, false)
    assert.equal(existsSync(path), false)
    mock.done()
})

test('ownership initialization branches from exact tested parent and records no creations', async (t) => {
    const { initialize, readState } = await load()
    const path = fixtureState(t)
    rmSync(path)
    const mock = scripted([
        ...fetchMain(sha),
        [['git', 'rev-parse', 'HEAD'], { stdout: sha }],
        [['git', 'status', '--porcelain'], {}],
        [['git', 'switch', '-c', 'release-17-2', sha], {}]
    ])
    assert.equal(initialize(path, identity, sha, mock.exec).ready, true)
    assert.equal(readState(path, identity).base, sha)
    assert.equal(readState(path, identity).tag, 'not-attempted')
    mock.done()
})

test('whole working-tree delta is validated before staging and commit', async () => {
    const { validateDelta } = await load()
    const before = metadata('1.2.3'),
        after = metadata('1.2.4')
    const expectations = [
        [['git', 'rev-parse', 'HEAD'], { stdout: sha }],
        [['git', 'ls-files', '--others', '--exclude-standard'], {}],
        [['git', 'diff', '--summary', 'HEAD'], {}],
        [['git', 'diff', '--name-only', 'HEAD'], { stdout: metadataPaths.join('\n') }]
    ]
    for (const path of ['package.json', ...metadataPaths])
        expectations.push([['git', 'show', `${sha}:${path}`], { stdout: before[path] }])
    const mock = scripted(expectations)
    assert.equal(
        validateDelta(initial, mock.exec, (path) => after[path]),
        'v1.2.4'
    )
    mock.done()
    const untracked = scripted([
        [['git', 'rev-parse', 'HEAD'], { stdout: sha }],
        [['git', 'ls-files', '--others', '--exclude-standard'], { stdout: 'unknown.file' }]
    ])
    assert.throws(() => validateDelta(initial, untracked.exec))
    untracked.done()
})

test(
    'workflow concurrency and tested checkout cover every code job with sole read-only bootstrap exception',
    { skip: policy.reference !== true },
    () => {
        const text = workflow()
        assert.match(
            text,
            /concurrency:\n {4}group: repository-release\n {4}cancel-in-progress: false\n\njobs:/
        )
        assert.equal(text.match(/^concurrency:/gm).length, 1)
        assert.ok(!text.includes('queue:'))
        const jobs = text.split(/^ {4}(?=[a-z][\w-]*:\n)/m).slice(1)
        const checkoutJobs = []
        for (const job of jobs) {
            const name = job.split(':')[0]
            const checkouts = job.split(/uses: actions\/checkout@[^\n]+\n/).slice(1)
            for (const checkout of checkouts) {
                const config = checkout.split(/\n {12}- /)[0]
                if (name === 'prepare') {
                    assert.match(config, /ref: \$\{\{ github.sha \}\}/)
                    assert.match(config, /persist-credentials: false/)
                    assert.match(job, /Sole bootstrap exception: read-only/)
                    assert.ok(!/pnpm|\.mjs (begin|push|release|cleanup)/.test(job))
                } else {
                    assert.match(
                        config,
                        /ref: \$\{\{ needs.prepare.outputs.checkout_sha \}\}/,
                        name
                    )
                    assert.match(job, /needs: \[[^\n]*prepare[^\n]*\]/, name)
                    assert.match(job, /needs.prepare.outputs.ready == 'true'/, name)
                }
                checkoutJobs.push(name)
            }
        }
        assert.deepEqual(checkoutJobs, [
            'prepare',
            'debug-check',
            'build',
            'playwright-tests',
            'publish-github-packages'
        ])
        const build = jobs.find((job) => job.startsWith('build:'))
        assert.match(build, /node-version: \[22, 24\]/)
        assert.equal(text.match(/name: Check library types/g).length, 1)
        assert.match(build, /- name: Check library types\n {14}run: pnpm run check/)
        assert.match(
            build,
            /node --test \.github\/scripts\/refresh-release-readme.test.mjs \.github\/scripts\/release-publication.test.mjs\n {18}pnpm build\n {18}pnpm test/
        )
        const publish = jobs.find((job) => job.startsWith('publish-github-packages:'))
        for (const gate of [
            'prepare',
            'debug-check',
            'build',
            'playwright-tests',
            'coverage-report'
        ])
            assert.match(publish, new RegExp(`needs: \\[[^\\n]*${gate}[^\\n]*\\]`))
        assert.match(publish, /needs.build.result == 'success'/)
        assert.match(publish, /needs.debug-check.result == 'success'/)
        assert.match(publish, /needs.playwright-tests.result == 'success'/)
        assert.match(publish, /needs.coverage-report.result == 'success'/)
        assert.ok(
            !/git (reset|rebase)|git push --tags|git push --delete|gh release delete/.test(text)
        )
    }
)

test(
    'workflow provenance preserves original merged PR, labels, bump rules and skip policy',
    { skip: policy.reference !== true },
    () => {
        const text = workflow()
        assert.match(text, /commit_sha: context.sha/)
        assert.match(text, /prs.find\(\(candidate\) => candidate.merged_at\)/)
        for (const label of ['skip-publish', 'major', 'minor'])
            assert.ok(text.includes(`labels.includes('${label}')`))
        assert.match(text, /EVENT_SHA: \$\{\{ github.sha \}\}/)
        assert.match(text, /EVENT_REF: \$\{\{ github.ref \}\}/)
        assert.match(text, /\[\[ "\$EVENT_NAME" == "push" && "\$PR_FOUND" != "true" \]\]/)
        assert.match(text, /elif \[ "\$HAS_MAJOR" = "true" \]; then\n {20}BUMP_TYPE="major"/)
        assert.match(text, /elif \[ "\$HAS_MINOR" = "true" \]; then\n {20}BUMP_TYPE="minor"/)
        assert.match(text, /BUMP_TYPE="patch"/)
        assert.match(text, /INPUT_VERSION: \$\{\{ github.event.inputs.version_bump \}\}/)
    }
)

test(
    'workflow publication barrier is pure canonical step, independently guarded before state write and shims',
    { skip: policy.reference !== true },
    () => {
        const text = workflow()
        assert.match(
            text,
            /- name: Publish\n {14}id: canonical\n {14}if: steps.ownership.outputs.ready == 'true'\n {14}run: pnpm publish --provenance --access public --no-git-checks\n/
        )
        assert.ok(text.indexOf('.mjs registry-attempt') < text.indexOf('- name: Publish\n'))
        assert.ok(
            text.indexOf('- name: Record canonical publication') > text.indexOf('- name: Publish\n')
        )
        assert.match(
            text,
            /- name: Record canonical publication\n {14}if: steps.canonical.outcome == 'success'/
        )
        assert.match(
            text,
            /- name: Cleanup on failure\n {14}if: failure\(\) && steps.ownership.outputs.ready == 'true' && steps.canonical.outcome != 'success'/
        )
        assert.match(text, /CANONICAL_SUCCESS: \$\{\{ steps.canonical.outcome \}\}/)
        assert.match(text, /environment: production/)
        assert.match(text, /id-token: write/)
        assert.match(text, /git_commit_gpgsign: true/)
        assert.match(text, /git_tag_gpgsign: true/)
        assert.equal(text.match(/bash \.github\/scripts\/refresh-release-readme.sh/g).length, 1)
        assert.match(
            text,
            /pnpm --dir tombstones\/svelte-diff publish --provenance --access public --no-git-checks \|\|/
        )
        assert.ok(text.indexOf('.mjs validate') < text.indexOf('git add package.json README.md'))
        assert.ok(text.indexOf('.mjs begin') < text.indexOf('pnpm version "$BUMP_TYPE"'))
    }
)

test('configured cleanup entry point deletes owned numeric ID and leased tag using mock-only PATH', (t) => {
    assert.deepEqual(
        shellFixture(t, initial, owned()),
        owned().map((entry) => entry[0])
    )
})

test('configured cleanup entry point retains replacement release and lease race, never prints transport stderr', (t) => {
    const replacement = [
        [tagLookup, tagResponse()],
        [releaseApi('42'), response(404)],
        [releaseApi('tags/v1.2.3'), response(200, releaseData(99))]
    ]
    shellFixture(t, initial, replacement)
    const race = owned()
    race.at(-1)[1] = { code: 1, stderr: 'private transport diagnostic' }
    shellFixture(t, initial, race)
})

const stepBody = (name, key = 'run') => {
    const text = workflow()
    const marker = `            - name: ${name}\n`
    assert.equal(text.split(marker).length, 2)
    const step = text.split(marker)[1].split('\n            - ')[0]
    const body =
        step.split(`                  ${key}: |\n`)[1] || step.split(`              ${key}: |\n`)[1]
    assert.ok(body, `Missing ${key} body: ${name}`)
    const width = key === 'script' ? 22 : 18
    return body
        .split('\n')
        .map((line) => {
            if (!line.trim()) return ''
            assert.ok(line.startsWith(' '.repeat(width)))
            return line.slice(width)
        })
        .join('\n')
}

test(
    'provenance actual lookup uses original trigger SHA and merged PR labels despite a newer prepared SHA',
    { skip: policy.event !== 'push' },
    async () => {
        const text = workflow()
        const section = text
            .split('            - id: pr\n')[1]
            .split('            - id: check\n')[0]
        assert.ok(section)
        const script = section
            .split('                  script: |\n')[1]
            .split('\n')
            .map((line) => (line.trim() ? line.slice(22) : ''))
            .join('\n')
        for (const labels of [['major', 'minor'], ['minor'], ['skip-publish'], []]) {
            const outputs = {},
                calls = []
            await runInNewContext(`(async () => {${script}\n})()`, {
                context: { sha, repo: { owner: 'fixture', repo: 'fixture' } },
                github: {
                    rest: {
                        repos: {
                            listPullRequestsAssociatedWithCommit: async (args) => {
                                calls.push(args)
                                return {
                                    data: [
                                        // eslint-disable-next-line camelcase -- Fixture preserves required GitHub API wire fields.
                                        { merged_at: null, number: 1, labels: [] },
                                        {
                                            // eslint-disable-next-line camelcase -- Fixture preserves required GitHub API wire fields.
                                            merged_at: 'fixture-time',
                                            number: 2,
                                            title: 'original PR',
                                            // eslint-disable-next-line camelcase -- Fixture preserves required GitHub API wire fields.
                                            html_url: 'fixture PR',
                                            labels: labels.map((name) => ({ name }))
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },
                core: { info: () => undefined, setOutput: (key, value) => (outputs[key] = value) }
            })
            assert.equal(calls.length, 1)
            assert.equal(calls[0].commit_sha, sha)
            assert.equal(outputs.found, 'true')
            assert.equal(outputs.title, 'original PR')
            assert.equal(outputs.has_major, String(labels.includes('major')))
            assert.equal(outputs.has_minor, String(labels.includes('minor')))
            assert.equal(outputs.has_skip_label, String(labels.includes('skip-publish')))
        }
    }
)

test(
    'provenance actual bump shell preserves major/minor/patch and manual skip',
    { skip: policy.event === 'calver' },
    (t) => {
        const dir = mkdtempSync(join(tmpdir(), 'release-bump-'))
        t.after(() => rmSync(dir, { recursive: true, force: true }))
        const run = stepBody('Determine version bump type')
        for (const [event, input, major, minor, expected] of [
            ['push', '', 'true', 'true', 'major'],
            ['push', '', 'false', 'true', 'minor'],
            ['push', '', 'false', 'false', 'patch'],
            ['workflow_dispatch', 'major', 'false', 'false', 'major'],
            ['workflow_dispatch', 'minor', 'false', 'false', 'minor'],
            ['workflow_dispatch', 'patch', 'false', 'false', 'patch'],
            ['workflow_dispatch', 'skip', 'false', 'false', 'skip']
        ]) {
            const output = join(dir, 'output')
            writeFileSync(output, '')
            const result = spawnSync(
                '/bin/bash',
                ['-e', '-c', run.replaceAll('${{ github.event_name }}', event)],
                {
                    cwd: dir,
                    encoding: 'utf8',
                    env: {
                        PATH: '/usr/bin:/bin',
                        HOME: dir,
                        GITHUB_OUTPUT: output,
                        INPUT_VERSION: input,
                        HAS_MAJOR: major,
                        HAS_MINOR: minor
                    }
                }
            )
            assert.equal(result.status, 0)
            assert.equal(
                readFileSync(output, 'utf8'),
                expected === 'skip' ? 'should_publish=false\n' : `bump=${expected}\n`
            )
        }
    }
)

test('baseline rejects file mode changes before reading release contents', async () => {
    const { selectBaseline, validateDelta } = await load()
    const current = 'c'.repeat(40)
    const mock = scripted([
        ...fetchMain(current),
        [['git', 'merge-base', '--is-ancestor', sha, current], {}],
        [
            ['git', 'rev-list', '--reverse', '--first-parent', `${sha}..${current}`],
            { stdout: current }
        ],
        [['git', 'rev-list', '--parents', '-n', '1', current], { stdout: `${current} ${sha}` }],
        [
            ['git', 'diff', '--summary', sha, current],
            { stdout: ' mode change 100644 => 100755 package.json\n' }
        ]
    ])
    assert.equal(selectBaseline(baselineInput, mock.exec).outcome, 'stale')
    mock.done()
    const delta = scripted([
        [['git', 'rev-parse', 'HEAD'], { stdout: sha }],
        [['git', 'ls-files', '--others', '--exclude-standard'], {}],
        [['git', 'diff', '--summary', 'HEAD'], { stdout: ' mode change' }]
    ])
    assert.throws(() => validateDelta(initial, delta.exec))
    delta.done()
})

test('ownership CLI push rejects untested version parent before any remote calls', (t) => {
    shellFixture(
        t,
        {
            ...initial,
            commit: null,
            tagOid: null,
            tag: 'not-attempted',
            release: 'not-attempted',
            releaseId: null
        },
        [
            [['git', 'rev-parse', 'HEAD'], { stdout: 'c'.repeat(40) }],
            [
                ['git', 'rev-list', '--parents', '-n', '1', 'HEAD'],
                { stdout: `${'c'.repeat(40)} ${'d'.repeat(40)}` }
            ]
        ],
        'if node .github/scripts/release-publication.mjs push; then exit 1; fi'
    )
})
