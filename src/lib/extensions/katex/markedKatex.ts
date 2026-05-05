import type { MarkedExtension } from 'marked'

/** Token type emitted for inline math (`\(...\)`, opt-in `$...$`). */
export const INLINE_KATEX_TOKEN = 'inlineKatex'
/** Token type emitted for block math (`\[...\]`, `$$...$$`, AMS environments). */
export const BLOCK_KATEX_TOKEN = 'blockKatex'

/**
 * Options for the {@link markedKatex} factory.
 */
export interface MarkedKatexOptions {
    /**
     * When `true`, also tokenize `$...$` (inline) and `$$...$$` (inline) as
     * math, using the standard whitespace-boundary rule that prevents
     * currency strings like `$5,000` from being parsed as a math expression.
     *
     * Off by default. KaTeX's own `auto-render` extension excludes `$...$`
     * from its defaults with the comment "LaTeX uses $…$, but it ruins the
     * display of normal `$` in text" — we follow the same opinion.
     *
     * Block-level `$$...$$` (own-line delimiters) is always enabled, and is
     * unaffected by this option.
     *
     * @defaultValue `false`
     */
    singleDollarInline?: boolean
}

const AMS_ENVIRONMENTS = ['equation', 'align', 'alignat', 'gather', 'CD'] as const
// `\\*` in the JS string becomes `\*` in the regex source, which matches a
// literal `*` (the AMS un-numbered variant). Without the escape, `equation*`
// in a regex would mean "equatio + zero-or-more n", which silently fails to
// match `\begin{equation*}`.
const AMS_NAMES = AMS_ENVIRONMENTS.flatMap((n) => [n, `${n}\\*`]).join('|')

// `\s*` (instead of `[ \t]*\n`) lets these rules match both the canonical
// own-line form (`$$\nx\n$$`) and the single-line form (`$$x$$`) that LLMs
// emit constantly. Without this, `$$x = \frac{...}{2a}$$` survives as
// paragraph text because the inline tokenizer also rejects `$$` openers.
const blockBracketRule = /^\\\[\s*([\s\S]+?)\s*\\\](?:\n|$)/
const blockDollarRule = /^\$\$\s*([\s\S]+?)\s*\$\$(?:\n|$)/
const blockAmsRule = new RegExp(
    `^\\\\begin\\{(${AMS_NAMES})\\}[\\s\\S]+?\\\\end\\{\\1\\}(?:\\n|$)?`
)

const inlineParenRule = /^\\\(([\s\S]+?)\\\)/
// Mirrors the "standard" rule from upstream marked-katex-extension but
// extends the boundary class with `)`, `]`, `}` so expressions like
// `$0$)`, `$x$]`, `$x$}` (closing math right before a closing bracket)
// still match. Currency strings like `$5,000 across $42` remain unmatched
// because digits after the closing `$` aren't in any boundary class.
const inlineDollarRule = /^\$(?!\$)((?:\\.|[^\\\n$])+?)\$(?=[\s?!.,:)\]}？！。，：]|$)/

const earliestIndex = (src: string, needles: string[]): number | undefined => {
    let best = -1
    for (const needle of needles) {
        const i = src.indexOf(needle)
        if (i !== -1 && (best === -1 || i < best)) best = i
    }
    return best === -1 ? undefined : best
}

/**
 * Creates a marked extension that tokenizes KaTeX math expressions into
 * custom `inlineKatex` and `blockKatex` tokens.
 *
 * Default delimiter set (mirrors KaTeX's own `auto-render` defaults):
 *
 * | Delimiter pair | Level | `displayMode` |
 * |---|---|---|
 * | `\(...\)` | inline | `false` |
 * | `\[...\]` (own-line **or** single-line) | block | `true` |
 * | `$$...$$` (own-line **or** single-line) | block | `true` |
 * | `\begin{equation}...\end{equation}` and other AMS envs | block | `true` |
 *
 * Both `\[x\]` and `\[\nx\n\]` parse as block math; same for `$$x$$` and the
 * own-line `$$\nx\n$$` form. LLMs overwhelmingly emit the single-line form,
 * so accepting both keeps the extension drop-in compatible with their output
 * without losing the canonical own-line shape.
 *
 * Supported AMS environments: `equation`, `align`, `alignat`, `gather`, `CD`,
 * plus their starred variants (e.g. `equation*`).
 *
 * `$...$` inline is **off** by default — KaTeX itself opts out of single-
 * dollar inline because of currency-string clashes (`$5,000` etc.). Pass
 * `{ singleDollarInline: true }` to enable it; when enabled it uses the
 * whitespace-boundary rule from upstream `marked-katex-extension` so
 * currency strings still won't match.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import SvelteMarkdown from '@humanspeak/svelte-markdown'
 *   import { markedKatex, KatexRenderer } from '@humanspeak/svelte-markdown/extensions'
 *
 *   const renderers = { inlineKatex: KatexRenderer, blockKatex: KatexRenderer }
 * </script>
 *
 * <SvelteMarkdown
 *   source={markdown}
 *   extensions={[markedKatex()]}
 *   {renderers}
 * />
 * ```
 *
 * Pair with `KatexRenderer` from the same subpath, or supply your own
 * component that accepts `{ text: string; displayMode?: boolean }`.
 *
 * @param options - {@link MarkedKatexOptions}
 * @returns A `MarkedExtension` containing one block-level and one inline tokenizer
 */
export function markedKatex(options: MarkedKatexOptions = {}): MarkedExtension {
    const { singleDollarInline = false } = options

    // The token-cache hash serializes functions via `fn.toString()`, which
    // can't see option values that live in a closure (our tokenizers'
    // source code is identical regardless of `singleDollarInline`). This
    // marker makes the option visible to JSON.stringify so two
    // `markedKatex({ ... })` calls with different options produce
    // different cache keys — without it, toggling the option at runtime
    // returns stale tokens. Cast because `MarkedExtension` doesn't permit
    // arbitrary fields, but Marked.use() shallow-spreads our object into
    // `defaults`, so the marker survives.
    const ext: MarkedExtension & { _humanspeakKatexConfig: string } = {
        _humanspeakKatexConfig: JSON.stringify({ singleDollarInline }),
        extensions: [
            {
                name: BLOCK_KATEX_TOKEN,
                level: 'block',
                start(src: string) {
                    return earliestIndex(src, ['\\[', '$$', '\\begin{'])
                },
                tokenizer(src: string) {
                    const bracket = src.match(blockBracketRule)
                    if (bracket) {
                        return {
                            type: BLOCK_KATEX_TOKEN,
                            raw: bracket[0],
                            text: bracket[1].trim(),
                            displayMode: true
                        }
                    }
                    const dollar = src.match(blockDollarRule)
                    if (dollar) {
                        return {
                            type: BLOCK_KATEX_TOKEN,
                            raw: dollar[0],
                            text: dollar[1].trim(),
                            displayMode: true
                        }
                    }
                    const ams = src.match(blockAmsRule)
                    if (ams) {
                        // KaTeX parses `\begin{...}...\end{...}` natively, so
                        // pass the entire matched string through as `text`.
                        return {
                            type: BLOCK_KATEX_TOKEN,
                            raw: ams[0],
                            text: ams[0].replace(/\n$/, '').trim(),
                            displayMode: true
                        }
                    }
                }
            },
            {
                name: INLINE_KATEX_TOKEN,
                level: 'inline',
                start(src: string) {
                    const needles = ['\\(']
                    if (singleDollarInline) needles.push('$')
                    return earliestIndex(src, needles)
                },
                tokenizer(src: string) {
                    const paren = src.match(inlineParenRule)
                    if (paren) {
                        return {
                            type: INLINE_KATEX_TOKEN,
                            raw: paren[0],
                            text: paren[1].trim(),
                            displayMode: false
                        }
                    }
                    if (singleDollarInline) {
                        const dollar = src.match(inlineDollarRule)
                        if (dollar) {
                            return {
                                type: INLINE_KATEX_TOKEN,
                                raw: dollar[0],
                                text: dollar[1].trim(),
                                displayMode: false
                            }
                        }
                    }
                }
            }
        ]
    }
    return ext
}
