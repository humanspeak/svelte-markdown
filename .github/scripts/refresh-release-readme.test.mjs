import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath, URL } from 'node:url'

const checkout = fileURLToPath(new URL('../../', import.meta.url))
const helper = join(checkout, '.github/scripts/refresh-release-readme.sh')
const pinnedUrl =
    'https://raw.githubusercontent.com/humanspeak/docs-kit/882b87e6a73c408c6b31fe8a185e8d0ea397fa37/scripts/update-ecosystem-readme.mjs'
const movingUrl =
    'https://raw.githubusercontent.com/humanspeak/docs-kit/main/scripts/update-ecosystem-readme.mjs'
const invocation = 'bash .github/scripts/refresh-release-readme.sh'
const original = '# Fixture README\n'

function uniqueIndex(text, marker) {
    const index = text.indexOf(marker)
    assert.ok(index >= 0, `Missing harness boundary: ${marker}`)
    assert.equal(text.indexOf(marker, index + marker.length), -1, `Ambiguous boundary: ${marker}`)
    return index
}

function bumpRun() {
    const workflow = readFileSync(join(checkout, '.github/workflows/npm-publish.yml'), 'utf8')
    const start = uniqueIndex(workflow, '- name: Bump version')
    const end = uniqueIndex(workflow, '- name: Create Release')
    assert.ok(end > start, 'Release step must follow version step')
    const step = workflow.slice(start, end)
    const run = uniqueIndex(step, '              run: |\n')
    return step
        .slice(run + '              run: |\n'.length)
        .split('\n')
        .map((line) => {
            if (!line.trim()) return ''
            assert.ok(line.startsWith('                  '), 'Invalid run indentation')
            return line.slice(18)
        })
        .join('\n')
}

function implementation() {
    const target = process.env.RELEASE_UPDATER_TEST_TARGET
    assert.ok(target === undefined || target === 'helper', 'Invalid implementation selector')
    if (target === 'helper') {
        assert.ok(existsSync(helper), 'Source helper must exist')
        return [helper]
    }
    const run = bumpRun()
    const count = run.split(invocation).length - 1
    assert.ok(count <= 1, 'Ambiguous helper invocation')
    if (count === 1) {
        assert.ok(existsSync(helper), 'Workflow helper must exist')
        return [helper]
    }
    const start = uniqueIndex(run, '# Refresh the managed README footer')
    const end = uniqueIndex(run, '# Commit the version changes')
    assert.ok(end > start, 'Commit must follow updater')
    return ['-c', run.slice(start, end)]
}

function fixture(t, { curlFails = false, updaterFails = false, credential = true } = {}) {
    const root = mkdtempSync(join(tmpdir(), 'release-readme-'))
    t.after(() => rmSync(root, { recursive: true, force: true }))
    writeFileSync(join(root, 'README.md'), original)
    const observation = join(root, 'observation.json')
    const urlLog = join(root, 'url.json')
    const updater = `
import { appendFileSync, writeFileSync } from 'node:fs'
// Node initializes this macOS runtime key even when exec receives only PATH.
const keys = Object.keys(process.env)
    .filter((key) => process.platform !== 'darwin' || key !== '__CF_USER_TEXT_ENCODING')
    .sort()
writeFileSync(${JSON.stringify(observation)}, JSON.stringify(keys))
if (keys.length !== 1 || keys[0] !== 'PATH') process.exit(7)
if (${updaterFails}) process.exit(9)
appendFileSync('README.md', 'refreshed\\n')
`
    // Fake transport records only the URL, never headers, credential values, or argv.
    const curl = `#!${process.execPath}
const fs = require('node:fs')
const args = process.argv.slice(2)
const url = args.find((arg) => arg.startsWith('https://'))
if (![${JSON.stringify(pinnedUrl)}, ${JSON.stringify(movingUrl)}].includes(url)) process.exit(2)
fs.writeFileSync(${JSON.stringify(urlLog)}, JSON.stringify(url))
const output = args[args.indexOf('-o') + 1]
if (!args.includes('-o') || !output) process.exit(2)
fs.writeFileSync(output, ${JSON.stringify(updater)})
process.exit(${curlFails ? 22 : 0})
`
    writeFileSync(join(root, 'curl'), curl, { mode: 0o755 })
    // Construct the entire parent environment; never copy developer credentials/config.
    const env = {
        PATH: `${root}:${dirname(process.execPath)}:/usr/bin:/bin`,
        RUNNER_TEMP: root,
        GH_TOKEN: 'synthetic-gh',
        NODE_AUTH_TOKEN: 'synthetic-node',
        NPM_TOKEN: 'synthetic-npm',
        RELEASE_SENTINEL: 'synthetic-sentinel',
        HOME: root
    }
    if (credential) env.GITHUB_TOKEN = 'synthetic-github'
    const result = spawnSync('/bin/bash', implementation(), {
        cwd: root,
        env,
        encoding: 'utf8',
        timeout: 10000
    })
    assert.equal(result.error, undefined, 'Fixture subprocess must start and finish')
    assert.equal(result.status, 0, 'README refresh must remain best-effort')
    // Keep diagnostics key-only even if a future regression logs synthetic secrets.
    for (const [key, value] of Object.entries(env)) {
        if (key.endsWith('TOKEN') || key === 'RELEASE_SENTINEL') {
            assert.ok(
                !`${result.stdout}${result.stderr}`.includes(value),
                `Logged value for ${key}`
            )
        }
    }
    return {
        keys: existsSync(observation) ? JSON.parse(readFileSync(observation, 'utf8')) : null,
        url: existsSync(urlLog) ? JSON.parse(readFileSync(urlLog, 'utf8')) : null,
        readme: readFileSync(join(root, 'README.md'), 'utf8'),
        output: `${result.stdout}${result.stderr}`
    }
}

test('download uses the exact immutable revision', (t) => {
    assert.equal(fixture(t).url, pinnedUrl)
})

test('updater receives only PATH, without credentials or sentinels', (t) => {
    assert.deepEqual(fixture(t).keys, ['PATH'])
})

test('successful isolation refreshes the fixture README exactly once', (t) => {
    assert.equal(fixture(t).readme, `${original}refreshed\n`)
})

test('failed curl never executes even a partially downloaded updater', (t) => {
    const result = fixture(t, { curlFails: true })
    assert.equal(result.keys, null)
    assert.equal(result.readme, original)
    assert.match(result.output, /::warning::could not fetch ecosystem updater/)
})

test('failed updater warns and preserves the fixture README', (t) => {
    const result = fixture(t, { updaterFails: true })
    assert.ok(result.keys, 'Downloaded updater must actually execute')
    assert.equal(result.readme, original)
    assert.match(result.output, /::warning::ecosystem updater errored/)
})

test('missing download credential skips download and execution with a warning', (t) => {
    const result = fixture(t, { credential: false })
    assert.equal(result.url, null)
    assert.equal(result.keys, null)
    assert.equal(result.readme, original)
    assert.match(result.output, /::warning::/)
})

test(
    'workflow refreshes after versioning and shim updates, before Git write authentication',
    { skip: process.env.RELEASE_UPDATER_TEST_TARGET === 'helper' },
    () => {
        const run = bumpRun()
        const refresh = uniqueIndex(run, invocation)
        const policy = JSON.parse(
            readFileSync(join(checkout, '.github/release-policy.json'), 'utf8')
        )
        const version = uniqueIndex(
            run,
            `${policy.manager} version "$BUMP_TYPE" --no-git-tag-version`
        )
        const shims = run.includes('for SHIM in ') ? uniqueIndex(run, 'done\n') : version + 1
        const authentication = uniqueIndex(
            run,
            'git remote set-url origin "https://x-access-token:${GITHUB_TOKEN}@github.com/'
        )
        const staging = uniqueIndex(run, 'git add package.json README.md')
        assert.ok(version < shims && shims < refresh, 'Versioning and shims must precede refresh')
        assert.ok(
            refresh < authentication && authentication < staging,
            'Authenticate after refresh'
        )
        assert.ok(!run.includes(movingUrl), 'Workflow must not download from a moving branch')
    }
)
