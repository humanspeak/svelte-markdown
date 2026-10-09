import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { env } from 'node:process'
import test from 'node:test'
import { fileURLToPath, URL } from 'node:url'
import { selectBaseline, validateMetadata } from './release-publication.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const read = (path) => readFileSync(`${root}${path}`, 'utf8')
const policy = JSON.parse(read('.github/release-policy.json'))
const workflow = policy.event === 'calver' ? null : read('.github/workflows/npm-publish.yml')

test('release state is initialized on the runner outside checkout and isolated by attempt', () => {
    const releaseWorkflow = workflow ?? read('.github/workflows/release.yml')
    const job = releaseWorkflow
        .split(policy.event === 'calver' ? '    release:\n' : '    publish-github-packages:\n')[1]
        .split(/\n {4}[a-z][\w-]*:\n/)[0]
    assert.doesNotMatch(job.split('        steps:\n')[0], /\$\{\{\s*runner\./)
    const initialization = job.split('            - name: Initialize release state path\n')[1]
    assert.ok(initialization, 'Release state must be initialized by a runner step')
    const script = initialization.split(/\n {12}- /)[0].split('              run: |\n')[1]
    assert.ok(job.indexOf('Initialize release state path') < job.indexOf('uses: actions/checkout@'))
    const directory = mkdtempSync(join(tmpdir(), 'release-state-environment-'))
    try {
        for (const attempt of ['1', '2']) {
            const environment = join(directory, `environment-${attempt}`)
            execFileSync('/bin/bash', ['--noprofile', '--norc', '-eu', '-c', script], {
                cwd: root,
                env: {
                    PATH: env.PATH,
                    RUNNER_TEMP: directory,
                    GITHUB_ENV: environment,
                    GITHUB_RUN_ID: '12345',
                    GITHUB_RUN_ATTEMPT: attempt
                }
            })
            assert.equal(
                readFileSync(environment, 'utf8'),
                `RELEASE_STATE=${directory}/release-12345-${attempt}.json\n`
            )
        }
    } finally {
        rmSync(directory, { recursive: true, force: true })
    }
})

test('consumer policy rejects unowned manifest, dependency, lockfile, and README changes', () => {
    for (const config of [
        { manifests: ['package.json'], lockfile: null, readme: 'unchanged' },
        { manifests: ['package.json'], lockfile: null, readme: 'managed' },
        { manifests: ['package.json'], lockfile: 'package-lock.json', readme: 'unchanged' },
        policy
    ]) {
        const before = {},
            after = {}
        for (const version of ['1.2.3', '1.2.4']) {
            const files = version === '1.2.3' ? before : after
            for (const path of config.manifests)
                files[path] = JSON.stringify({
                    name: path === 'package.json' ? 'canonical' : path,
                    version,
                    dependencies:
                        path === 'package.json'
                            ? { dependency: '^1' }
                            : { canonical: `^${version}` }
                })
            files['README.md'] =
                config.readme === 'managed'
                    ? `# Same\n<!-- docs-kit:ecosystem start -->${version}<!-- docs-kit:ecosystem end -->\n`
                    : '# Same\n'
            if (config.lockfile)
                files[config.lockfile] = JSON.stringify({
                    name: 'canonical',
                    version,
                    lockfileVersion: 3,
                    packages: {
                        '': { name: 'canonical', version },
                        'node_modules/example': { version: '2.0.0' }
                    }
                })
        }
        const paths = [
            ...config.manifests,
            ...(config.lockfile ? [config.lockfile] : []),
            ...(config.readme === 'managed' ? ['README.md'] : [])
        ]
        const validate = (files, changed = paths) =>
            validateMetadata(
                (path) => before[path],
                (path) => files[path],
                changed,
                config
            )
        assert.equal(validate(after), 'v1.2.4')
        assert.throws(() => validate(after, [...paths, 'src/index.ts']))
        assert.throws(() => validate(after, [...paths, '.github/workflows/npm-publish.yml']))
        assert.throws(() => validate(after, [...paths, 'pnpm-lock.yaml']))
        const dependency = JSON.parse(after['package.json'])
        dependency.dependencies.dependency = '^2'
        assert.throws(() => validate({ ...after, 'package.json': JSON.stringify(dependency) }))
        if (config.lockfile) {
            const lock = JSON.parse(after[config.lockfile])
            lock.packages['node_modules/example'].version = '3.0.0'
            assert.throws(() => validate({ ...after, [config.lockfile]: JSON.stringify(lock) }))
        }
        if (config.readme === 'managed')
            assert.throws(() => validate({ ...after, 'README.md': `changed${after['README.md']}` }))
        else assert.throws(() => validate(after, [...paths, 'README.md']))
    }
})

test('unchanged README without managed markers remains valid after best-effort updater failure', () => {
    const before = {
        'package.json': '{"name":"example","version":"1.2.3"}',
        'README.md': '# Same\n'
    }
    const after = { ...before, 'package.json': '{"name":"example","version":"1.2.4"}' }
    const config = { manifests: ['package.json'], lockfile: null, readme: 'managed' }
    assert.equal(
        validateMetadata(
            (path) => before[path],
            (path) => after[path],
            ['package.json'],
            config
        ),
        'v1.2.4'
    )
    assert.throws(() =>
        validateMetadata(
            (path) => before[path],
            (path) => (path === 'README.md' ? '# Changed\n' : after[path]),
            ['package.json', 'README.md'],
            config
        )
    )
})

test('PR-close baselines preserve original merge commit and never execute on unmerged events', () => {
    const calls = []
    const config = { manifests: ['package.json'], lockfile: null, readme: 'unchanged' }
    const input = {
        event: 'pull_request',
        eventSha: 'a'.repeat(40),
        ref: 'refs/heads/main',
        merged: false,
        skip: false
    }
    const exec = (command, args) => {
        calls.push([command, ...args])
        throw new Error('Unexpected transport')
    }
    assert.equal(selectBaseline(input, exec, config).ready, false)
    assert.deepEqual(calls, [])
})

test(
    'every consumer code checkout uses the tested SHA and release gates cannot be bypassed',
    { skip: !workflow },
    () => {
        assert.match(
            workflow,
            /concurrency:\n {4}group: repository-release\n {4}cancel-in-progress: false/
        )
        const jobs = workflow.split(/(?=^ {4}[a-z][\w-]*:\n)/m).slice(1)
        for (const job of jobs) {
            const name = job.split(':')[0].trim()
            if (!job.includes('uses: actions/checkout@')) continue
            if (name === 'prepare') {
                assert.match(job, /persist-credentials: false/)
                assert.match(job, /fetch-depth: 0/)
                assert.ok(!job.includes('secrets.'))
            } else {
                assert.match(job, /needs: \[[^\n]*prepare[^\n]*\]/, name)
                assert.match(job, /needs.prepare.outputs.ready == 'true'/, name)
                for (const checkout of job.split(/uses: actions\/checkout@[^\n]+\n/).slice(1))
                    assert.match(
                        checkout.split(/\n {12}- /)[0],
                        /ref: \$\{\{ needs.prepare.outputs.checkout_sha \}\}/,
                        name
                    )
            }
        }
        const build = jobs.find((job) => job.startsWith('    build:'))
        const publish = jobs.find((job) => job.startsWith('    publish-github-packages:'))
        assert.ok(build)
        const check = build.indexOf(`${policy.manager} run check`)
        assert.ok(check >= 0)
        const command = new RegExp(`(?:run: |\\n\\s*)${policy.manager} (?:run build|build|test)\\b`)
        assert.ok(check < build.search(command), 'Source check must precede build and tests')
        assert.ok(!build.slice(0, check).includes('continue-on-error: true'))
        assert.ok(build.includes('node --test .github/scripts/'))
        assert.match(publish, /needs.build.result == 'success'/)
        for (const gate of ['debug-check', 'playwright-tests', 'coverage-report']) {
            if (jobs.some((job) => job.startsWith(`    ${gate}:`))) {
                assert.match(publish, new RegExp(`needs: \\[[^\\n]*${gate}[^\\n]*\\]`))
                assert.match(publish, new RegExp(`needs\\.${gate}\\.result == 'success'`))
            }
        }
        assert.ok(
            !/git push --tags|git push --delete|gh release delete|git (reset|rebase)/.test(workflow)
        )
        const bump = publish
            .split('            - name: Bump version\n')[1]
            .split('\n            - name: Create Release')[0]
        assert.ok(publish.indexOf('.mjs begin') < publish.indexOf(`${policy.manager} version`))
        assert.ok(bump.indexOf('.mjs validate') < bump.indexOf('git add '))
        assert.ok(bump.includes('.mjs push'))
        if (policy.readme === 'managed')
            assert.ok(
                bump.indexOf('refresh-release-readme.sh') < bump.indexOf('git remote set-url')
            )
        else assert.ok(!bump.includes('refresh-release-readme'))
        for (const path of policy.manifests) assert.ok(bump.includes(path))
        if (policy.lockfile) assert.ok(bump.includes(policy.lockfile))
        if (!policy.reference) assert.ok(!publish.includes('tombstones/'))
    }
)

test(
    'canonical publication is an independent success barrier with unknown-outcome retention',
    { skip: !workflow },
    () => {
        const publish = workflow
            .split('            - name: Publish\n')[1]
            .split('\n            - name: Record canonical publication')[0]
        assert.match(publish, /id: canonical/)
        assert.match(publish, /if: steps.ownership.outputs.ready == 'true'/)
        assert.match(publish, /run: (?:npm|pnpm) publish/)
        assert.ok(!publish.includes('registry-success'))
        assert.ok(
            workflow.indexOf('registry-attempt') < workflow.indexOf('            - name: Publish\n')
        )
        assert.match(workflow, /if: steps.canonical.outcome == 'success'/)
        assert.match(
            workflow,
            /if: failure\(\) && steps.ownership.outputs.ready == 'true' && steps.canonical.outcome != 'success'/
        )
        assert.match(workflow, /CANONICAL_SUCCESS: \$\{\{ steps.canonical.outcome \}\}/)
        assert.match(workflow, /git_commit_gpgsign: true/)
        assert.match(workflow, /git_tag_gpgsign: true/)
        assert.match(workflow, /id-token: write/)
        if (policy.manager === 'npm')
            assert.match(publish, /NODE_AUTH_TOKEN: \$\{\{ secrets.NPM_GITHUB_TOKEN \}\}/)
        else assert.ok(!publish.includes('NODE_AUTH_TOKEN'))
    }
)

test('overlapping PR-close runs accept only a fully verified chain of release metadata', () => {
    const a = 'a'.repeat(40),
        b = 'b'.repeat(40),
        c = 'c'.repeat(40)
    const config = {
        manifests: ['package.json'],
        lockfile: 'package-lock.json',
        readme: 'unchanged'
    }
    const files = (version) => ({
        'package.json': JSON.stringify({ name: 'example', version, dependencies: { source: '1' } }),
        'package-lock.json': JSON.stringify({
            version,
            packages: { '': { version }, dependency: { version: '1' } }
        })
    })
    const commits = { [a]: files('1.2.3'), [b]: files('1.2.4'), [c]: files('1.2.5') }
    const paths = ['package.json', 'package-lock.json']
    for (const sourceChange of [false, true]) {
        const expected = [
            ['git', 'fetch', '--no-tags', 'origin', 'refs/heads/main'],
            ['git', 'rev-parse', 'FETCH_HEAD'],
            ['git', 'merge-base', '--is-ancestor', a, c],
            ['git', 'rev-list', '--reverse', '--first-parent', `${a}..${c}`]
        ]
        let index = 0
        const exec = (command, args) => {
            const call = [command, ...args]
            if (index < expected.length) assert.deepEqual(call, expected[index])
            index++
            if (args[0] === 'fetch' || args[0] === 'merge-base') return { code: 0, stdout: '' }
            if (args[0] === 'rev-parse') return { code: 0, stdout: c }
            if (args[0] === 'rev-list' && args[1] === '--reverse')
                return { code: 0, stdout: `${b}\n${c}` }
            if (args[0] === 'rev-list')
                return { code: 0, stdout: `${args.at(-1)} ${args.at(-1) === b ? a : b}` }
            if (args[0] === 'diff' && args[1] === '--summary') return { code: 0, stdout: '' }
            if (args[0] === 'diff')
                return {
                    code: 0,
                    stdout: sourceChange && args.at(-1) === c ? 'src/index.ts' : paths.join('\n')
                }
            if (args[0] === 'show') {
                const [commit, path] = args[1].split(':')
                assert.ok(commits[commit]?.[path])
                return { code: 0, stdout: commits[commit][path] }
            }
            assert.fail('Unexpected mock-only transport')
        }
        const result = selectBaseline(
            {
                event: 'pull_request',
                eventSha: a,
                ref: 'refs/heads/main',
                merged: true,
                skip: false
            },
            exec,
            config
        )
        assert.equal(result.ready, !sourceChange)
        assert.equal(result.outcome, sourceChange ? 'stale' : 'ready')
        if (result.ready) assert.equal(result.checkoutSha, c)
    }
})
