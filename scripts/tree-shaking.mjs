import { svelte } from '@sveltejs/vite-plugin-svelte'
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

const cases = [
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
        expectInitialPresent: ['node_modules/@shikijs']
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

async function buildCase(testCase) {
    const dir = await mkdtemp(join(tmpdir(), 'svm-tree-shaking-'))
    try {
        const entry = join(dir, 'entry.js')
        const packageDir = join(dir, 'node_modules', '@humanspeak')
        await mkdir(packageDir, { recursive: true })
        await symlink(repoRoot, join(packageDir, 'svelte-markdown'), 'dir')
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
        await rm(dir, { force: true, recursive: true })
    }
}

for (const testCase of cases) {
    await buildCase(testCase)
}
