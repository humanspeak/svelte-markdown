import { markTailWindowSafe } from '$lib/types.js'
import type { MarkedExtension } from 'marked'

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
 * ```
 *
 * @returns A `MarkedExtension` with a single block-level `mermaid` tokenizer
 */
export function markedMermaid(): MarkedExtension {
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
                }
            }
        ]
    }
    // The mermaid tokenizer is block-anchored (a ` ```mermaid ` fence) and
    // inspects only `src` from the current position, so it is safe inside the
    // streaming tail-window. Mark the function reference Marked stores in
    // `options.extensions.block`.
    for (const entry of ext.extensions ?? []) {
        if ('tokenizer' in entry && typeof entry.tokenizer === 'function') {
            markTailWindowSafe(entry.tokenizer)
        }
    }
    return ext
}
