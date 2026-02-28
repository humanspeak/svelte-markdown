import type { MarkedExtension } from 'marked'

/**
 * Creates a marked extension that tokenizes footnote references (`[^id]`) and
 * footnote definitions (`[^id]: content`) into custom tokens.
 *
 * The extension produces:
 * - **Inline** `footnoteRef` tokens: `{ type: 'footnoteRef', raw, id }`
 * - **Block** `footnoteSection` tokens: `{ type: 'footnoteSection', raw, footnotes }` where
 *   `footnotes` is an array of `{ id, text }` objects
 *
 * Pair with `FootnoteRef` and `FootnoteSection` components (or your own) for rendering.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import SvelteMarkdown from '@humanspeak/svelte-markdown'
 *   import { markedFootnote, FootnoteRef, FootnoteSection } from '@humanspeak/svelte-markdown/extensions'
 *
 *   const renderers = { footnoteRef: FootnoteRef, footnoteSection: FootnoteSection }
 * </script>
 *
 * <SvelteMarkdown
 *   source={markdown}
 *   extensions={[markedFootnote()]}
 *   {renderers}
 * />
 * ```
 *
 * @returns A `MarkedExtension` with inline `footnoteRef` and block `footnoteSection` tokenizers
 */
export function markedFootnote(): MarkedExtension {
    return {
        extensions: [
            {
                name: 'footnoteRef',
                level: 'inline',
                start(src: string) {
                    return src.match(/\[\^/)?.index
                },
                tokenizer(src: string) {
                    const match = src.match(/^\[\^([^\]\s]+)\](?!:)/)
                    if (match) {
                        return {
                            type: 'footnoteRef',
                            raw: match[0],
                            id: match[1]
                        }
                    }
                }
            },
            {
                name: 'footnoteSection',
                level: 'block',
                start(src: string) {
                    return src.match(/\[\^[^\]\s]+\]:/)?.index
                },
                tokenizer(src: string) {
                    const match = src.match(
                        /^(?:\[\^([^\]\s]+)\]:\s*([^\n]*(?:\n(?!\[\^)[^\n]*)*)(?:\n|$))+/
                    )
                    if (match) {
                        const footnotes: { id: string; text: string }[] = []
                        const defRegex = /\[\^([^\]\s]+)\]:\s*([^\n]*(?:\n(?!\[\^|\n)[^\n]*)*)/g
                        let defMatch
                        while ((defMatch = defRegex.exec(match[0])) !== null) {
                            footnotes.push({
                                id: defMatch[1],
                                text: defMatch[2].trim()
                            })
                        }
                        if (footnotes.length > 0) {
                            return {
                                type: 'footnoteSection',
                                raw: match[0],
                                footnotes
                            }
                        }
                    }
                }
            }
        ]
    }
}
