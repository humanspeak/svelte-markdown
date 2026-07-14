/**
 * Regression guard for the `extensions` barrel's optional-dependency invariant.
 *
 * `shiki` is an optional peer dependency, but its implementation statically
 * imports `shiki/core` from plain JS (`shiki/createShikiHighlighter.ts`).
 * Bundlers eagerly resolve the plain-JS module graph of the barrel the moment a
 * consumer imports anything from it (e.g. Vite's dependency optimizer), so a
 * barrel re-export of shiki hard-breaks every consumer without `shiki`
 * installed — even ones that never use highlighting. That regression shipped in
 * v1.8.0 and was only caught in the field: `scripts/tree-shaking.mjs` verifies
 * final-bundle contents via subpath imports, not barrel-graph resolution.
 *
 * `.svelte` files are exempt: they are compiled per-file and are not part of
 * the eagerly-scanned plain-JS graph, which is why `KatexRenderer.svelte`'s
 * static `katex` import only affects consumers who opt into that renderer.
 */

import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const BARREL = resolve(__dirname, 'index.ts')

/** Module specifiers of every static `import`/`export ... from` in a source file. */
const importSpecifiers = (source: string): string[] =>
    [...source.matchAll(/(?:^|\n)\s*(?:import|export)\s[^'"]*?from\s+['"]([^'"]+)['"]/g)].map(
        (match) => match[1]
    )

/** Map a relative `./foo.js` specifier back to its `.ts` source file. */
const toSourcePath = (fromFile: string, specifier: string): string =>
    resolve(dirname(fromFile), specifier.replace(/\.js$/, '.ts'))

/**
 * Collect the transitive plain-TS module graph reachable from `entry`,
 * skipping `.svelte` files (see module doc) and bare (package) specifiers.
 */
const collectPlainModuleGraph = (entry: string): Map<string, string[]> => {
    const graph = new Map<string, string[]>()
    const queue = [entry]
    while (queue.length > 0) {
        const file = queue.pop() as string
        if (graph.has(file)) continue
        const specifiers = importSpecifiers(readFileSync(file, 'utf-8'))
        graph.set(file, specifiers)
        for (const specifier of specifiers) {
            if (!specifier.startsWith('.') || specifier.endsWith('.svelte')) continue
            queue.push(toSourcePath(file, specifier))
        }
    }
    return graph
}

describe('extensions barrel optional-dependency invariant', () => {
    it('never reaches a shiki import through its plain-JS module graph', () => {
        const offenders = [...collectPlainModuleGraph(BARREL)]
            .filter(([, specifiers]) =>
                specifiers.some((s) => s === 'shiki' || s.startsWith('shiki/'))
            )
            .map(([file]) => file)
        expect(offenders).toEqual([])
    })

    it('does not re-export the shiki subpath', () => {
        const barrelImports = importSpecifiers(readFileSync(BARREL, 'utf-8'))
        expect(barrelImports.filter((s) => s.includes('shiki'))).toEqual([])
    })
})
