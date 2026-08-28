import * as htmlparser2 from 'htmlparser2'
import type { Token, Tokens } from 'marked'
import { isVoidElement } from './void-elements.js'

/**
 * Matches HTML tags with comprehensive coverage of edge cases.
 * Pattern breakdown:
 * - <\/?         : Matches opening < and optional /
 * - [a-zA-Z]     : Tag must start with letter
 * - [a-zA-Z0-9-] : Subsequent chars can be letters, numbers, or hyphens
 * - (?:\s+[^>]*)?: Optional attributes
 * - >            : Closing bracket
 *
 * @const {RegExp}
 */
const htmlTagRegex = /<\/?([a-zA-Z][a-zA-Z0-9-]{0,})(?:\s+[^>]*)?>/

/**
 * Regex pattern for self-closing HTML tags.
 * @const {RegExp}
 */

/**
 * Analyzes a string to determine if it contains an HTML tag and its characteristics.
 *
 * @param {string} raw - Raw string potentially containing an HTML tag
 * @returns {Object|null} Returns null if no tag found, otherwise returns:
 *    {
 *      tag: string      - The name of the HTML tag
 *      isOpening: bool  - True if opening tag, false if closing
 *    }
 *
 * @example
 * isHtmlOpenTag('<div class="test">') // Returns { tag: 'div', isOpening: true }
 * isHtmlOpenTag('</span>') // Returns { tag: 'span', isOpening: false }
 * isHtmlOpenTag('plain text') // Returns null
 */
export const isHtmlOpenTag = (raw: string): { tag: string; isOpening: boolean } | null => {
    const match = htmlTagRegex.exec(raw)
    if (!match) return null
    // Canonical lowercase — see the note in `formatSelfClosingHtmlToken`.
    return { tag: match[1].toLowerCase(), isOpening: !raw.startsWith('</') }
}

/**
 * Formats individual HTML tokens to ensure self-closing tags are properly formatted.
 * This handles cases like <br> -> <br/> without affecting the token structure.
 *
 * @param {Token} token - HTML token to format
 * @returns {Token} Formatted token with proper self-closing syntax
 */
/**
 * Whether an opening-tag source string is genuinely self-closing.
 *
 * A trailing `/>` is not sufficient. Per the HTML tokenizer, `/` only starts
 * the self-closing state from before-attribute-name, after-attribute-name, or
 * after a *quoted* value. Inside an unquoted attribute value it is an ordinary
 * character, so `<a href=https://example.com/>` is a plain opening tag whose
 * href ends in a slash — reading it as self-closing drops the element's
 * children on the floor.
 *
 * @param raw Source text of a single opening tag, e.g. `<img src="x"/>`.
 */
const isSelfClosedTagSource = (raw: string): boolean => {
    if (!raw.endsWith('/>')) return false
    const beforeSlash = raw.slice(0, -2)
    // `<br/>` — the slash directly follows the tag name.
    if (/^<[a-zA-Z][^\s/>]*$/.test(beforeSlash)) return true
    // Otherwise it only self-closes after whitespace or a quoted value.
    return /[\s"']$/.test(beforeSlash)
}

const formatSelfClosingHtmlToken = (token: Token): Token => {
    // Extract tag name from raw HTML
    const tagMatch = token.raw.match(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/i)
    if (!tagMatch) return token
    // Closing tags are paired separately via `isHtmlOpenTag`; they must not
    // pick up `.tag` or they would dispatch as a second component instance.
    if (token.raw.startsWith('</')) return token

    // Canonical lowercase: HTML tag names are case-insensitive, and the nested
    // htmlparser2 path already lowercases. Emitting one casing from every path
    // is what lets every consumer — renderer lookup, snippet lookup, void-element
    // checks, the sanitize hook — read `tag` directly (issue #383). The source
    // spelling is still available on `raw`.
    const tagName = tagMatch[1].toLowerCase()
    // Two distinct things are self-closing: known void elements (`<br>`,
    // which may omit the slash) and any tag explicitly written in the
    // `<tag />` form. The allowlist decides whether the slash may be
    // *omitted* — it must not gate whether the token gets structured
    // `tag`/`attributes` at all, or custom tag renderers registered under
    // `renderers.html` never resolve and `<widget />` renders nothing
    // (issue #383).
    const isExplicitlySelfClosed = isSelfClosedTagSource(token.raw)
    if (!isExplicitlySelfClosed && !isVoidElement(tagName)) return token

    // Self-closing tags get `.tag` and `.attributes` set so downstream
    // code (pairing, dispatch, sanitization) has structured access. If
    // the source already used the `<.../>` form we keep raw as-is;
    // otherwise we normalize the `>` to `/>`.
    const formattedRaw = token.raw.endsWith('/>') ? token.raw : token.raw.replace(/\s*>$/, '/>')
    return {
        ...token,
        raw: formattedRaw,
        tag: tagName,
        attributes: extractAttributes(token.raw),
        // A self-closing element is fully resolved and childless. The empty
        // array (rather than `undefined`) marks it as such, so renderers can
        // tell it apart from an unclosed tag whose children are still unknown
        // and must not echo the raw source as text.
        tokens: []
    }
}

/**
 * Parses HTML attributes from a tag string into a structured object.
 * Handles both single and double quoted attributes, plus bare boolean
 * attributes. Quoted regions are stripped before the boolean pass so
 * space-separated words inside a value (e.g. `bar` in `title="foo bar
 * baz"`) aren't mistakenly harvested as boolean attributes (issue #297).
 *
 * @param raw - Raw HTML tag string containing attributes.
 * @returns Map of attribute names to their values. Boolean attributes
 *   are represented as `''`.
 *
 * @example
 * extractAttributes('<div class="foo" id="bar">')
 * // → { class: 'foo', id: 'bar' }
 *
 * extractAttributes('<Tip title="foo bar baz">')
 * // → { title: 'foo bar baz' }   // not { title: …, bar: '' }
 *
 * extractAttributes('<input type="checkbox" checked disabled>')
 * // → { type: 'checkbox', checked: '', disabled: '' }
 *
 * @internal
 */
export const extractAttributes = (raw: string): Record<string, string> => {
    const attributes: Record<string, string> = {}

    // First pass: handle regular and unclosed quoted attributes. The value
    // class matches only the same quote that opened it, so an apostrophe inside
    // a double-quoted value (or a double quote inside a single-quoted value)
    // does not terminate the match early. The `(?:"|$)` / `(?:'|$)` closers
    // keep support for streaming-truncated tags like `<div class="foo`.
    const quotedRegex = /([a-zA-Z][\w-]*)=(?:"([^"]*)(?:"|$)|'([^']*)(?:'|$))/g
    let match
    while ((match = quotedRegex.exec(raw)) !== null) {
        const key = match[1]
        const value = match[2] ?? match[3] ?? ''
        attributes[key] = value.trim()
    }

    // Strip quoted attribute blocks before the boolean pass so word-like
    // tokens inside a value (e.g. `bar` in `title="foo bar baz"`) aren't
    // mistakenly harvested as boolean attributes. Mirrors the quote-type-aware
    // matching above so embedded other-type quotes stay inside the value.
    const stripped = raw.replace(/[a-zA-Z][\w-]*=(?:"[^"]*(?:"|$)|'[^']*(?:'|$))/g, ' ')

    // Second pass: handle boolean attributes
    const booleanRegex = /(?:^|\s)([a-zA-Z][\w-]*?)(?=[\s>]|$)/g
    while ((match = booleanRegex.exec(stripped)) !== null) {
        const [, key] = match
        if (key && !attributes[key]) {
            attributes[key] = ''
        }
    }

    return attributes
}

/**
 * Serializes an HTML attribute map into a string for tag construction.
 * Escapes double quotes in values to prevent attribute injection.
 *
 * @param {Record<string, string>} attributes - Map of attribute names to values
 * @returns {string} Serialized attributes string with leading spaces
 *
 * @example
 * serializeAttributes({ class: 'foo', id: 'bar' })
 * // Returns ' class="foo" id="bar"'
 *
 * @internal
 */
const serializeAttributes = (attributes: Record<string, string>): string =>
    Object.entries(attributes)
        .map(([key, value]) => ` ${key}="${value.replace(/"/g, '&quot;')}"`)
        .join('')

/**
 * Fast scan used by `expandHtmlToken` to decide whether the htmlparser2
 * expansion path is worth invoking. Returns true when the input contains
 * at least two `<` characters separated by a `>` — i.e. the cheapest
 * possible witness that more than one tag is present.
 *
 * Two `indexOf` calls keep this cheap enough for the perf gate: false positives
 * just route through htmlparser2 (correct, slightly slower); false negatives
 * cannot occur for any input that contains two tags.
 *
 * @internal
 */
const hasMultipleTags = (html: string): boolean => {
    const firstClose = html.indexOf('>')
    if (firstClose === -1) return false
    return html.indexOf('<', firstClose + 1) !== -1
}

/**
 * Single-pass expansion of one html token's raw string into nested tokens.
 * Opening tags push a fresh child array onto the stack; closing tags pop it and
 * attach the collected children to the opening token via `tokens`.
 *
 * Behavior is matched to the legacy two-pass pipeline:
 *   - Self-closing tags (`<br>` etc.) are emitted with `<.../>` form.
 *   - Auto-closes injected by htmlparser2 at end-of-input (when the
 *     source did not literally contain `</tag>`) keep the children flat
 *     under the opening tag rather than nesting them — this preserves
 *     the legacy "partial result on unclosed tags" output.
 *   - Whitespace-only text between tags is dropped.
 *
 * Post-condition (depended on by `IncrementalParser`, see #291): an html
 * token's `.tokens` array is set only when the element is *resolved* — a
 * real (non-implied) closing tag was seen, or the tag was self-closing
 * (`<br/>`, `<widget />`), which resolves it with no children. Unclosed
 * openings leave `.tokens` as `undefined`, which is how downstream
 * streaming code distinguishes `<div>` (still streaming) from
 * `<div></div>` (genuinely empty).
 *
 * @internal
 */
const expandHtmlBlockNested = (html: string): Token[] => {
    const root: Token[] = []
    const stack: Token[][] = [root]
    /**
     * Open elements awaiting their close event.
     *
     * A self-closing element was already emitted whole and pushed nothing onto
     * `stack`, but htmlparser2 still emits an implied close for it, so it must
     * occupy a slot here — otherwise that close matches an enclosing element of
     * the same name and pops the parent instead (`<div><div/>after</div>`
     * orphaning `after`). It carries nothing else, since its close is only
     * absorbed, never resolved.
     */
    const opens: (
        | { tag: string; selfClosed: true }
        | {
              tag: string
              selfClosed?: false
              opening: Token
              childTokens: Token[]
              startIndex: number
          }
    )[] = []
    let currentText = ''

    const flushText = () => {
        if (currentText.length === 0) return
        if (currentText.trim()) {
            stack[stack.length - 1].push({
                type: 'text',
                raw: currentText,
                text: currentText
            } as Token)
        }
        currentText = ''
    }

    const parser = new htmlparser2.Parser(
        {
            onopentag: (name, attributes) => {
                flushText()
                // A void element, or a tag explicitly written `<tag />`.
                // htmlparser2 reports the latter's close as *implied*, which
                // would otherwise route it through the unclosed-tag branch
                // below and leave `.tokens` undefined — making renderers echo
                // the raw source as text (issue #383). Deciding it here, at
                // the producer, keeps the flat and nested paths in agreement.
                const isSelfClosed =
                    isVoidElement(name) ||
                    isSelfClosedTagSource(html.slice(parser.startIndex, parser.endIndex + 1))
                if (isSelfClosed) {
                    stack[stack.length - 1].push({
                        type: 'html',
                        raw: `<${name}${serializeAttributes(attributes)}/>`,
                        tag: name,
                        attributes,
                        tokens: []
                    } as Token)
                    opens.push({ tag: name, selfClosed: true })
                    return
                }
                const childTokens: Token[] = []
                const opening: Token = {
                    type: 'html',
                    raw: `<${name}${serializeAttributes(attributes)}>`,
                    tag: name,
                    attributes
                } as Token
                stack[stack.length - 1].push(opening)
                stack.push(childTokens)
                opens.push({ tag: name, opening, childTokens, startIndex: parser.startIndex })
            },
            ontext: (text) => {
                currentText += text
            },
            onclosetag: (name, implied) => {
                flushText()
                if (opens.length === 0) return
                const top = opens[opens.length - 1]
                if (top.tag !== name) return
                opens.pop()
                // A self-closing element pushed nothing onto `stack` and is
                // already fully resolved; consuming its implied close is all
                // that is required.
                if (top.selfClosed) return
                stack.pop()
                if (!implied) {
                    // Real `</tag>` in source — fully resolved nested token.
                    const resolvedOpening = top.opening as Token & {
                        sourceLength?: number
                        tokens?: Token[]
                    }
                    resolvedOpening.sourceLength = parser.endIndex - top.startIndex + 1
                    resolvedOpening.tokens = top.childTokens
                } else {
                    // Auto-closed by htmlparser2 at end-of-input — this
                    // opening tag is unclosed in the source. Leave `.tokens`
                    // undefined so downstream code can tell it apart from a
                    // genuinely empty closed element (`<div></div>`), and
                    // flatten any children under the parent to match the
                    // legacy partial-result behavior.
                    const parent = stack[stack.length - 1]
                    for (const child of top.childTokens) parent.push(child)
                }
            }
        },
        {
            xmlMode: false,
            recognizeSelfClosing: true
        }
    )

    parser.write(html)
    parser.end()
    flushText()

    return root
}

/**
 * Expands a single html token. Single-tag inputs (the dominant inline
 * shape — opening tag alone, closing tag alone, self-closing) skip
 * htmlparser2 entirely and go through the cheap `formatSelfClosingHtmlToken`
 * path. Anything with two or more tags routes through
 * `expandHtmlBlockNested` for inline nesting.
 *
 * @internal
 */
const expandHtmlToken = (token: Token): Token[] => {
    if (!hasMultipleTags(token.raw)) {
        return [formatSelfClosingHtmlToken(token)]
    }
    return expandHtmlBlockNested(token.raw)
}

/**
 * Pair-matches flat html opens/closes that span across separate marked
 * tokens (e.g. marked emits `<details>` and `</details>` as two
 * top-level html tokens with markdown blocks between them). Tokens that
 * `expandHtmlToken` already nested (recognizable by the populated `tokens`
 * array on an html token) are passed through opaquely — no recursion, no
 * re-walk.
 *
 * @internal
 */
const pairFlatHtmlTokens = (tokens: Token[]): Token[] => {
    const result: Token[] = []
    const stack: { tag: string; startIndex: number }[] = []

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        if (token.type !== 'html') {
            result.push(token)
            continue
        }

        // Already-nested html tokens (from expandHtmlToken) are opaque —
        // their internal structure is fully resolved.
        if ('tokens' in token && Array.isArray((token as Token & { tokens?: Token[] }).tokens)) {
            result.push(token)
            continue
        }

        const tagInfo = isHtmlOpenTag(token.raw)
        if (!tagInfo) {
            result.push(token)
            continue
        }

        // Self-closing tags (e.g. <img src="x"/>) don't participate in
        // open/close pairing — pushing them onto the stack would block
        // a later `</tag>` from finding its real opening. A bare
        // `endsWith('/>')` misreads `<a href=/foo/>` as self-closing and
        // strands its `</a>`, dropping the element entirely.
        if (isSelfClosedTagSource(token.raw)) {
            result.push(token)
            continue
        }

        if (tagInfo.isOpening) {
            stack.push({ tag: tagInfo.tag, startIndex: result.length })
            result.push(token)
        } else {
            const lastOpen = stack.pop()
            // Both sides are canonical lowercase, so `<Widget>x</widget>` is
            // one element.
            if (!lastOpen || lastOpen.tag !== tagInfo.tag) {
                result.push(token)
                continue
            }
            const startIndex = lastOpen.startIndex
            const innerTokens = result.splice(startIndex + 1, result.length - startIndex - 1)
            const openingToken = result.pop()!
            const sourceLength =
                openingToken.raw.length +
                innerTokens.reduce((sum, innerToken) => {
                    const sourceLength = (innerToken as Token & { sourceLength?: number })
                        .sourceLength
                    return sum + (sourceLength ?? innerToken.raw.length)
                }, 0) +
                token.raw.length
            result.push({
                type: 'html',
                raw: openingToken.raw,
                tag: lastOpen.tag,
                tokens: innerTokens,
                attributes: extractAttributes(openingToken.raw),
                sourceLength
            } as Token)
        }
    }

    return result
}

/**
 * A list item token annotated with its zero-based position within the parent
 * list, stamped by {@link cleanListItem} so renderers can key on a stable index.
 */
interface IndexedListItem extends Tokens.ListItem {
    listItemIndex?: number
}

/**
 * Shallow structural equality for two token arrays, comparing length and
 * per-index reference identity (not deep value equality). Used to detect when a
 * recursive clean produced no change, so the caller can preserve the original
 * object identity instead of allocating a fresh one.
 *
 * Acts as a type guard: a truthy result narrows `left` to `Token[]`.
 *
 * @param {Token[] | undefined} left - The original token array (may be undefined).
 * @param {Token[]} right - The freshly cleaned token array to compare against.
 * @returns {boolean} `true` when both arrays have the same length and each
 *   element is reference-equal; `false` otherwise (including when `left` is undefined).
 *
 * @example
 * const a = [{ type: 'text', raw: 'x', text: 'x' }]
 * tokensShallowEqual(a, [...a]) // true — same element references
 * tokensShallowEqual(a, [{ type: 'text', raw: 'x', text: 'x' }]) // false — new reference
 */
const tokensShallowEqual = (left: Token[] | undefined, right: Token[]): left is Token[] => {
    if (!left || left.length !== right.length) return false

    return left.every((token, index) => token === right[index])
}

/**
 * Cleans a single list item's nested tokens while preserving object identity
 * across streaming clean passes. Returns the original `item` reference when it
 * already carries the correct `listItemIndex` and its cleaned tokens are
 * reference-equal to the input (no nested change); otherwise returns a new
 * object with the stamped index and cleaned tokens.
 *
 * Preserving identity lets the render layer keep the item's DOM node mounted
 * instead of remounting it on every streaming flush.
 *
 * @param {Tokens.ListItem} item - The list item token to clean.
 * @param {number} index - The item's zero-based position within the parent list.
 * @returns {IndexedListItem} The original item when unchanged, otherwise a new
 *   cleaned item stamped with `listItemIndex`.
 *
 * @example
 * const item = list.items[0]
 * const cleaned = cleanListItem(item, 0)
 * // cleaned === item when nothing nested changed on a re-clean
 */
const cleanListItem = (item: Tokens.ListItem, index: number): IndexedListItem => {
    const cleanedTokens = item.tokens ? shrinkHtmlTokens(item.tokens) : []
    const indexedItem = item as IndexedListItem

    if (indexedItem.listItemIndex === index && tokensShallowEqual(item.tokens, cleanedTokens)) {
        return indexedItem
    }

    return {
        ...item,
        listItemIndex: index,
        tokens: cleanedTokens
    }
}

/**
 * Cleans a single table cell's nested tokens while preserving object identity
 * across streaming clean passes. Returns the original `cell` reference when its
 * cleaned tokens are reference-equal to the input (no nested change); otherwise
 * returns a new object with the cleaned tokens.
 *
 * Preserving identity lets the render layer keep the cell's DOM node mounted
 * instead of remounting it on every streaming flush.
 *
 * @param {Tokens.TableCell} cell - The table header or body cell to clean.
 * @returns {Tokens.TableCell} The original cell when unchanged, otherwise a new
 *   cleaned cell.
 *
 * @example
 * const cell = table.rows[0][0]
 * const cleaned = cleanTableCell(cell)
 * // cleaned === cell when nothing nested changed on a re-clean
 */
const cleanTableCell = (cell: Tokens.TableCell): Tokens.TableCell => {
    const cleanedTokens = cell.tokens ? shrinkHtmlTokens(cell.tokens) : []

    if (tokensShallowEqual(cell.tokens, cleanedTokens)) {
        return cell
    }

    return {
        ...cell,
        tokens: cleanedTokens
    }
}

/**
 * Primary entry point for HTML token processing. Transforms flat token arrays
 * into properly nested structures while preserving HTML semantics.
 *
 * Key features:
 * - Breaks down complex HTML structures into atomic tokens
 * - Formats self-closing tags with proper syntax (e.g., <br> -> <br/>)
 * - Maintains attribute information
 * - Preserves proper nesting relationships
 * - Handles malformed HTML gracefully
 *
 * @param {Token[]} tokens - Array of tokens to process
 * @returns {Token[]} Processed and properly nested token array
 *
 * @example
 * const tokens = [
 *   { type: 'html', raw: '<div class="wrapper">' },
 *   { type: 'text', raw: 'content' },
 *   { type: 'html', raw: '</div>' }
 * ];
 * shrinkHtmlTokens(tokens);
 * // Returns nested structure with proper token relationships
 *
 * @public
 */
export const shrinkHtmlTokens = (tokens: Token[]): Token[] => {
    const expanded: Token[] = []
    for (const token of tokens) {
        if (
            token.type !== 'html' &&
            'tokens' in token &&
            Array.isArray((token as Token & { tokens: Token[] }).tokens)
        ) {
            const t = token as Token & { tokens: Token[] }
            t.tokens = shrinkHtmlTokens(t.tokens)
            expanded.push(token)
        } else if (token.type === 'list') {
            token.items = token.items.map(cleanListItem)
            expanded.push(token)
        } else if (token.type === 'table') {
            const tableToken = token as Tokens.Table
            if (tableToken.header) {
                tableToken.header = tableToken.header.map(cleanTableCell)
            }
            if (tableToken.rows) {
                tableToken.rows = tableToken.rows.map((row: Tokens.TableCell[]) =>
                    row.map(cleanTableCell)
                )
            }
            expanded.push(token)
        } else if (token.type === 'html') {
            const expansion = expandHtmlToken(token)
            for (const t of expansion) expanded.push(t)
        } else {
            expanded.push(token)
        }
    }

    return pairFlatHtmlTokens(expanded)
}
