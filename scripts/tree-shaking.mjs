import { svelte } from '@sveltejs/vite-plugin-svelte'
import { execFileSync } from 'node:child_process'
import { access, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { build } from 'vite'

const repoRoot = fileURLToPath(new URL('..', import.meta.url))
const distPath = join(repoRoot, 'dist')

try {
    await access(distPath)
} catch {
    throw new Error(
        `Missing package build at ${distPath}. Run \`pnpm package\` from ${repoRoot} before \`pnpm test:tree-shaking\`.`
    )
}

const motionModules = [
    'node_modules/@humanspeak/svelte-motion',
    'node_modules/motion',
    'node_modules/motion-dom'
]
const cases = [
    ...[
        [
            'core motion isolation',
            "import SvelteMarkdown from '@humanspeak/svelte-markdown/SvelteMarkdown'; console.log(SvelteMarkdown)"
        ],
        [
            'root motion isolation',
            "import SvelteMarkdown from '@humanspeak/svelte-markdown'; console.log(SvelteMarkdown)"
        ],
        [
            'headless motion isolation',
            "import { StreamingText } from '@humanspeak/svelte-markdown'; console.log(StreamingText)"
        ]
    ].map(([name, source]) => ({ name, source, expectAllMissing: motionModules })),
    {
        name: 'explicit motion presets',
        source: "import { FadeWords, RiseWords, FadeCharacters } from '@humanspeak/svelte-markdown/streaming/motion'; console.log(FadeWords, RiseWords, FadeCharacters)",
        expectInitialPresent: ['node_modules/@humanspeak/svelte-motion', 'node_modules/motion-dom']
    },
    {
        name: 'core component subpath',
        source: `
            import SvelteMarkdown from '@humanspeak/svelte-markdown/SvelteMarkdown'
            console.log(SvelteMarkdown)
        `,
        expectInitialMissing: ['node_modules/katex', 'node_modules/mermaid'],
        expectAllMissing: ['node_modules/katex', 'node_modules/mermaid']
    },
    {
        // SPIKE (plan 004): the default code renderer must never pull Shiki into
        // the core bundle — highlighting is an opt-in, explicitly-imported
        // extension, so the "lightweight" core positioning stays honest.
        name: 'core component stays shiki-free',
        source: `
            import SvelteMarkdown from '@humanspeak/svelte-markdown/SvelteMarkdown'
            console.log(SvelteMarkdown)
        `,
        expectInitialMissing: ['node_modules/shiki', 'node_modules/@shikijs'],
        expectAllMissing: ['node_modules/shiki', 'node_modules/@shikijs']
    },
    {
        name: 'katex tokenizer only',
        source: `
            import { markedKatex } from '@humanspeak/svelte-markdown/extensions/katex'
            console.log(markedKatex().extensions?.length)
        `,
        expectInitialMissing: ['node_modules/katex'],
        expectAllMissing: ['node_modules/katex']
    },
    {
        name: 'katex renderer',
        source: `
            import { KatexRenderer } from '@humanspeak/svelte-markdown/extensions/katex'
            console.log(KatexRenderer)
        `,
        expectInitialPresent: ['node_modules/katex']
    },
    {
        name: 'mermaid tokenizer only',
        source: `
            import { markedMermaid } from '@humanspeak/svelte-markdown/extensions/mermaid'
            console.log(markedMermaid().extensions?.length)
        `,
        expectInitialMissing: ['node_modules/mermaid'],
        expectAllMissing: ['node_modules/mermaid']
    },
    {
        name: 'mermaid renderer',
        source: `
            import { MermaidRenderer } from '@humanspeak/svelte-markdown/extensions/mermaid'
            console.log(MermaidRenderer)
        `,
        expectInitialMissing: ['node_modules/mermaid'],
        expectDynamicPresent: ['node_modules/mermaid']
    },
    {
        // Plan 004 ship: importing an unrelated extension subpath must not pull
        // Shiki (or any @shikijs engine/grammar) into the bundle — highlighting
        // is opt-in and only reachable via the shiki subpath.
        name: 'other extension stays shiki-free',
        source: `
            import { markedKatex } from '@humanspeak/svelte-markdown/extensions/katex'
            console.log(markedKatex().extensions?.length)
        `,
        expectInitialMissing: ['node_modules/shiki', 'node_modules/@shikijs'],
        expectAllMissing: ['node_modules/shiki', 'node_modules/@shikijs']
    },
    {
        // Shiki must never be reachable from the extensions barrel — its
        // implementation statically imports `shiki/core` from plain JS, so a
        // barrel re-export forces every barrel consumer to have the optional
        // `shiki` peer installed just to resolve modules (shipped broken in
        // v1.8.0). Bundle-level check; the source-graph invariant lives in
        // `src/lib/extensions/barrel-optional-deps.test.ts`.
        name: 'extensions barrel stays shiki-free',
        source: `
            import { markedAlert } from '@humanspeak/svelte-markdown/extensions'
            console.log(markedAlert().extensions?.length)
        `,
        expectInitialMissing: ['node_modules/shiki', 'node_modules/@shikijs'],
        expectAllMissing: ['node_modules/shiki', 'node_modules/@shikijs']
    },
    {
        // Plan 004 ship: the ShikiCode renderer on its own does NOT pull Shiki
        // in — it only depends on the escaped fallback. Shiki is bundled solely
        // when the consumer constructs a highlighter, keeping the renderer cheap.
        name: 'shiki renderer stays shiki-free',
        source: `
            import { ShikiCode } from '@humanspeak/svelte-markdown/extensions/shiki'
            console.log(ShikiCode)
        `,
        expectInitialMissing: ['node_modules/shiki', 'node_modules/@shikijs'],
        expectAllMissing: ['node_modules/shiki', 'node_modules/@shikijs']
    },
    {
        // Plan 004 ship: opting into the highlighter factory does pull Shiki's
        // core (`@shikijs/*`, resolved via the `shiki/core` +
        // `shiki/engine/javascript` subpaths) into the bundle — proving the
        // opt-in path resolves and is intentionally bundled only when the
        // consumer actually constructs a highlighter.
        name: 'shiki highlighter factory',
        source: `
            import { createShikiHighlighter } from '@humanspeak/svelte-markdown/extensions/shiki'
            console.log(createShikiHighlighter)
        `,
        expectInitialPresent: ['node_modules/@shikijs'],
        expectAllMissing: ['node_modules/@tanstack/highlight']
    },
    {
        // The core component must stay free of TanStack Highlight exactly as
        // it stays free of Shiki — highlighting is opt-in per engine.
        name: 'core component stays tanstack-highlight-free',
        source: `
            import SvelteMarkdown from '@humanspeak/svelte-markdown/SvelteMarkdown'
            console.log(SvelteMarkdown)
        `,
        expectInitialMissing: ['node_modules/@tanstack/highlight'],
        expectAllMissing: ['node_modules/@tanstack/highlight']
    },
    {
        // The extensions barrel must never reach TanStack Highlight either —
        // same optional-peer invariant as Shiki (see barrel-optional-deps.test).
        name: 'extensions barrel stays tanstack-highlight-free',
        source: `
            import { markedAlert } from '@humanspeak/svelte-markdown/extensions'
            console.log(markedAlert().extensions?.length)
        `,
        expectInitialMissing: ['node_modules/@tanstack/highlight'],
        expectAllMissing: ['node_modules/@tanstack/highlight']
    },
    {
        // The engine-agnostic renderer subpath pulls in NO engine: consumers
        // can import HighlightedCode + the context key without installing
        // either optional peer.
        name: 'shared highlight renderer stays engine-free',
        source: `
            import { HighlightedCode, setCodeHighlighter } from '@humanspeak/svelte-markdown/extensions/highlight'
            console.log(HighlightedCode, setCodeHighlighter)
        `,
        expectInitialMissing: [
            'node_modules/shiki',
            'node_modules/@shikijs',
            'node_modules/@tanstack/highlight'
        ],
        expectAllMissing: [
            'node_modules/shiki',
            'node_modules/@shikijs',
            'node_modules/@tanstack/highlight'
        ]
    },
    {
        // Importing only the renderer from the tanstack subpath must not bundle
        // the engine — mirrors 'shiki renderer stays shiki-free'.
        name: 'tanstack-highlight renderer stays engine-free',
        source: `
            import { HighlightedCode } from '@humanspeak/svelte-markdown/extensions/tanstack-highlight'
            console.log(HighlightedCode)
        `,
        expectInitialMissing: ['node_modules/@tanstack/highlight', 'node_modules/shiki'],
        expectAllMissing: ['node_modules/@tanstack/highlight', 'node_modules/shiki']
    },
    {
        // Opting into the TanStack factory bundles its core and nothing from
        // Shiki — the two engines never leak into each other.
        name: 'tanstack-highlight highlighter factory',
        source: `
            import { createTanstackHighlighter } from '@humanspeak/svelte-markdown/extensions/tanstack-highlight'
            console.log(createTanstackHighlighter)
        `,
        expectInitialPresent: ['node_modules/@tanstack/highlight'],
        expectAllMissing: ['node_modules/shiki', 'node_modules/@shikijs']
    }
]

function includesModule(chunks, needle) {
    return chunks.some((chunk) => chunk.moduleIds.some((id) => id.includes(needle)))
}

function collectStaticClosure(chunks, seeds) {
    const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
    const seen = new Set()
    const stack = [...seeds]

    while (stack.length > 0) {
        const fileName = stack.pop()
        if (!fileName || seen.has(fileName)) continue
        seen.add(fileName)
        const chunk = byFileName.get(fileName)
        if (!chunk) continue
        stack.push(...chunk.imports)
    }

    return [...seen].map((fileName) => byFileName.get(fileName)).filter(Boolean)
}

function collectDynamicClosure(chunks, initialChunks) {
    const dynamicSeeds = initialChunks.flatMap((chunk) => chunk.dynamicImports)
    return collectStaticClosure(chunks, dynamicSeeds)
}

function assertIncludes(chunks, needle, label, caseName) {
    if (!includesModule(chunks, needle)) {
        throw new Error(`${caseName}: expected ${label} to include ${needle}`)
    }
}

function assertExcludes(chunks, needle, label, caseName) {
    if (includesModule(chunks, needle)) {
        throw new Error(`${caseName}: expected ${label} to exclude ${needle}`)
    }
}

async function buildCase(testCase, consumerDir) {
    const dir = consumerDir ?? (await mkdtemp(join(tmpdir(), 'svm-tree-shaking-')))
    try {
        const entry = join(dir, 'entry.js')
        const packageDir = join(dir, 'node_modules', '@humanspeak')
        await mkdir(packageDir, { recursive: true })
        if (!consumerDir) await symlink(repoRoot, join(packageDir, 'svelte-markdown'), 'dir')
        await writeFile(entry, testCase.source)

        const result = await build({
            root: dir,
            configFile: false,
            logLevel: 'silent',
            plugins: [svelte()],
            resolve: {
                conditions: ['svelte', 'browser', 'module']
            },
            build: {
                write: false,
                ssr: false,
                target: 'es2022',
                minify: false,
                cssCodeSplit: true,
                rollupOptions: {
                    input: entry,
                    treeshake: true
                }
            }
        })

        const outputs = Array.isArray(result)
            ? result.flatMap((item) => item.output)
            : result.output
        const chunks = outputs.filter((output) => output.type === 'chunk')
        const entryChunks = chunks.filter((chunk) => chunk.isEntry)
        const initialChunks = collectStaticClosure(
            chunks,
            entryChunks.map((chunk) => chunk.fileName)
        )
        const dynamicChunks = collectDynamicClosure(chunks, initialChunks)

        for (const needle of testCase.expectInitialMissing ?? []) {
            assertExcludes(initialChunks, needle, 'initial chunks', testCase.name)
        }
        for (const needle of testCase.expectAllMissing ?? []) {
            assertExcludes(chunks, needle, 'all chunks', testCase.name)
        }
        for (const needle of testCase.expectInitialPresent ?? []) {
            assertIncludes(initialChunks, needle, 'initial chunks', testCase.name)
        }
        for (const needle of testCase.expectDynamicPresent ?? []) {
            assertIncludes(dynamicChunks, needle, 'dynamic chunks', testCase.name)
        }

        console.log(`✓ ${testCase.name}`)
    } finally {
        if (!consumerDir) await rm(dir, { force: true, recursive: true })
    }
}

for (const testCase of cases) {
    await buildCase(testCase)
}

// An installed tarball in an isolated directory proves resolution without any
// optional peers. A symlink to this workspace would accidentally see its dev peers.
const consumerDir = await mkdtemp(join(tmpdir(), 'svm-no-peer-'))
try {
    const packed = JSON.parse(
        execFileSync(
            'npm',
            ['pack', '--ignore-scripts', '--json', '--pack-destination', consumerDir],
            { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
        )
    )
    await writeFile(
        join(consumerDir, 'package.json'),
        JSON.stringify({ private: true, type: 'module' })
    )
    execFileSync(
        'npm',
        [
            'install',
            '--ignore-scripts',
            '--no-audit',
            '--no-fund',
            join(consumerDir, packed[0].filename),
            'svelte@5.57.1'
        ],
        { cwd: consumerDir, stdio: ['ignore', 'pipe', 'pipe'] }
    )
    try {
        await access(join(consumerDir, 'node_modules/@humanspeak/svelte-motion'))
        throw new Error('No-peer consumer unexpectedly installed Motion')
    } catch (error) {
        if (error.code !== 'ENOENT') throw error
    }
    for (const testCase of cases.slice(0, 3))
        await buildCase({ ...testCase, name: `no-peer ${testCase.name}` }, consumerDir)
    let missingPeer = false
    try {
        await buildCase(cases[3], consumerDir)
    } catch (error) {
        if (!String(error).includes('@humanspeak/svelte-motion')) throw error
        missingPeer = true
    }
    if (!missingPeer) throw new Error('Preset subpath must fail normal resolution without Motion')
    console.log(
        '✓ isolated installed package: core/headless work; presets require the optional peer'
    )
} finally {
    await rm(consumerDir, { force: true, recursive: true })
}
