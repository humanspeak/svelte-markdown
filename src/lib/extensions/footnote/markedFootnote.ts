import type { MarkedExtension } from 'marked'

interface FootnoteDefinition {
    id: string
    text: string
}

interface ParsedDefinition {
    end: number
    footnote: FootnoteDefinition
}

const definitionStartPattern = /^( {0,3})\[\^([^\]\s]+)\]:[ \t]*([^\r\n]*)(\r?\n|$)/

const readLine = (src: string, start: number) => {
    const match = src.slice(start).match(/^([^\r\n]*)(\r?\n|$)/)
    if (!match) return undefined

    return {
        content: match[1],
        end: start + match[0].length
    }
}

const isContinuation = (line: string) => /^(?: {4}|\t)/.test(line)

const findFollowingContinuation = (src: string, start: number) => {
    let cursor = start
    let blankLineCount = 0

    while (cursor < src.length) {
        const line = readLine(src, cursor)
        if (!line) return undefined
        if (isContinuation(line.content)) return { start: cursor, blankLineCount }
        if (!/^[ \t]*$/.test(line.content)) return undefined
        if (line.end === cursor) return undefined
        blankLineCount += 1
        cursor = line.end
    }

    return undefined
}

const parseDefinition = (src: string, start: number): ParsedDefinition | undefined => {
    const match = src.slice(start).match(definitionStartPattern)
    if (!match) return undefined

    const bodyLines = [match[3]]
    let cursor = start + match[0].length

    while (cursor < src.length) {
        const line = readLine(src, cursor)
        if (!line) break

        if (isContinuation(line.content)) {
            bodyLines.push(
                line.content.startsWith('\t') ? line.content.slice(1) : line.content.slice(4)
            )
            cursor = line.end
            continue
        }

        if (/^[ \t]*$/.test(line.content)) {
            const continuation = findFollowingContinuation(src, cursor)
            if (continuation) {
                // Consume the whole verified run so later iterations do not scan it again.
                for (let index = 0; index < continuation.blankLineCount; index++) {
                    bodyLines.push('')
                }
                cursor = continuation.start
                continue
            }
        }

        break
    }

    return {
        end: cursor,
        footnote: {
            id: match[2],
            text: bodyLines.join('\n').replace(/^\n/, '').trimEnd()
        }
    }
}

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
                    const match = src.match(/(?:^|\n) {0,3}\[\^[^\]\s]+\]:/)
                    if (!match || match.index === undefined) return undefined
                    return match.index + (match[0].startsWith('\n') ? 1 : 0)
                },
                tokenizer(src: string) {
                    const footnotes: FootnoteDefinition[] = []
                    const seen = new Set<string>()
                    let cursor = 0

                    while (true) {
                        const definition = parseDefinition(src, cursor)
                        if (!definition) break

                        if (!seen.has(definition.footnote.id)) {
                            seen.add(definition.footnote.id)
                            footnotes.push(definition.footnote)
                        }

                        cursor = definition.end
                    }

                    if (cursor > 0) {
                        return {
                            type: 'footnoteSection',
                            raw: src.slice(0, cursor),
                            footnotes
                        }
                    }
                }
            }
        ]
    }
}
