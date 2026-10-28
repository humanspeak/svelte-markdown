/**
 * Lightweight synchronous Mermaid engine backed by pele (https://pele.run).
 *
 * Shipped ONLY via `@humanspeak/svelte-markdown/extensions/mermaid-pele` — this
 * file statically imports `pele/core`, an optional peer, so it must never be
 * reachable from the `extensions` barrel (guarded by barrel-optional-deps.test.ts).
 *
 * Only the diagram types you pass are bundled:
 *
 * ```ts
 * import flowchart from 'pele/diagrams/flowchart'
 * import sequence from 'pele/diagrams/sequence'
 * const engine = createPeleEngine({ diagrams: [flowchart, sequence] })
 * ```
 *
 * Output is themed by `--pele-*` CSS variables, so dark mode is a stylesheet
 * concern and the render context's theme fields are ignored.
 */
import { register, render, type RenderOptions } from 'pele/core'
import { toMermaidError, type MermaidEngine } from '../mermaid/mermaidEngine.js'

export interface CreatePeleEngineOptions {
    /** Diagram types to enable, e.g. `import flowchart from 'pele/diagrams/flowchart'`. */
    diagrams: Parameters<typeof register>
    /** Passed through to pele's `render` (limits, fonts, link/image schemes, …). */
    renderOptions?: RenderOptions
}

export const createPeleEngine = (options: CreatePeleEngineOptions): MermaidEngine => {
    // Registration is global in pele; a construction-time failure should surface.
    register(...options.diagrams)
    return {
        render(text) {
            try {
                return { svg: render(text, options.renderOptions).svg }
            } catch (e) {
                return toMermaidError(e)
            }
        }
    }
}
