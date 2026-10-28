import { tailWindowSafeExtension } from '$lib/utils/tail-window.js'
import type { MarkedExtension } from 'marked'

/** Options for {@link markedMermaid}. */
export interface MarkedMermaidOptions {
    /**
     * Emit tokens for a still-open fence at the end of input, so diagrams render
     * while they stream. Only complete lines are included in `text`: a half-typed
     * last line is dropped, and `text` changes only when a line completes. Open
     * tokens carry `closed: false`.
     *
     * Trade-off: partial diagrams render mid-stream. Pair this with a synchronous
     * engine such as `extensions/mermaid-pele`; with async mermaid.js each completed
     * line triggers a full async render. Default `false`.
     */
    renderOpenFences?: boolean
}

/**
 * Creates a marked extension that tokenizes fenced ` ```mermaid ` code blocks
 * into custom `mermaid` tokens.
 *
 * The extension produces block-level tokens with `{ type: 'mermaid', raw, text }`
 * where `text` is the trimmed diagram source. It has zero runtime dependencies —
 * pair it with `MermaidRenderer` (or your own component) to render the diagrams.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import SvelteMarkdown from '@humanspeak/svelte-markdown'
 *   import { markedMermaid, MermaidRenderer } from '@humanspeak/svelte-markdown'
 *
 *   const renderers = { mermaid: MermaidRenderer }
 * </script>
 *
 * <SvelteMarkdown
 *   source={markdown}
 *   extensions={[markedMermaid()]}
 *   {renderers}
 * />
 *
 * <!-- Render diagrams while their fence is still streaming (opt-in) -->
 * <SvelteMarkdown
 *   source={streamingMarkdown}
 *   extensions={[markedMermaid({ renderOpenFences: true })]}
 *   {renderers}
 * />
 * ```
 *
 * @param options - Optional tokenizer behavior. See {@link MarkedMermaidOptions}.
 * @returns A `MarkedExtension` with a single block-level `mermaid` tokenizer
 */
export function markedMermaid(options: MarkedMermaidOptions = {}): MarkedExtension {
    const ext: MarkedExtension = {
        extensions: [
            {
                name: 'mermaid',
                level: 'block',
                start(src: string) {
                    return src.match(/```mermaid/)?.index
                },
                tokenizer(src: string) {
                    const match = src.match(/^```mermaid\n([\s\S]*?)```/)
                    if (match) {
                        return {
                            type: 'mermaid',
                            raw: match[0],
                            text: match[1].trim()
                        }
                    }
                    if (options.renderOpenFences) {
                        const open = src.match(/^```mermaid\n([\s\S]*)$/)
                        if (open) {
                            const body = open[1]
                            // Keep complete lines only; the trailing partial line (if any) is dropped.
                            const complete = body.slice(0, body.lastIndexOf('\n') + 1)
                            return {
                                type: 'mermaid',
                                raw: open[0],
                                text: complete.trim(),
                                closed: false
                            }
                        }
                    }
                }
            }
        ]
    }
    // The mermaid tokenizer is block-anchored (a ` ```mermaid ` fence) and
    // inspects only `src` from the current position, so it is safe inside the
    // streaming tail-window.
    return tailWindowSafeExtension(ext)
}
