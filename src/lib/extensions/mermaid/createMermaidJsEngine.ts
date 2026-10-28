/**
 * mermaid.js engine, the built-in default for `MermaidRenderer`.
 *
 * `mermaid` is an optional peer and DOM-only, so it is loaded with a dynamic
 * import on first render and never statically imported. Keeping that import
 * dynamic is what keeps mermaid out of the initial bundle.
 *
 * @module
 */

import { toMermaidError, type MermaidEngine } from './mermaidEngine.js'

/**
 * Create a mermaid.js-backed {@link MermaidEngine}. Loads and initializes
 * `mermaid` (with `securityLevel: 'strict'`) on first render, then renders
 * asynchronously. Failures resolve to `{ error }`; the Promise never rejects.
 */
export const createMermaidJsEngine = (): MermaidEngine => {
    let loaded: Promise<typeof import('mermaid').default> | undefined
    const load = () =>
        (loaded ??= import('mermaid').then((mod) => {
            const mermaid = mod.default
            mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
            return mermaid
        }))

    return {
        async render(text, { dark, lightTheme, darkTheme }) {
            try {
                const mermaid = await load()
                const theme = dark ? darkTheme : lightTheme
                const themed = `%%{init: {'theme': '${theme}'}}%%\n${text}`
                const { svg } = await mermaid.render(`mermaid-${crypto.randomUUID()}`, themed)
                return { svg }
            } catch (e) {
                return toMermaidError(e)
            }
        }
    }
}
