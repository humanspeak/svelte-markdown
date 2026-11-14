/**
 * Nesting-depth guard for parsed markdown tokens.
 *
 * Rendering is recursive: every nested container token (blockquote, list,
 * list item, HTML element, emphasis, ...) mounts inside its parent's render
 * call. Input nested a few dozen levels deep (`> > > > ...`) exhausts the
 * JavaScript call stack and takes the whole mounted tree down with it. This
 * module caps the token-tree depth before the tokens reach the renderer:
 * anything nested deeper than the limit is shown as plain text instead of
 * being rendered.
 *
 * @module
 */

import type { Token, Tokens } from 'marked'
import type { ProvenanceCollector } from './streaming-provenance.js'
import { isSelfClosedTagSource } from './token-cleanup.js'
import { isVoidElement } from './void-elements.js'

/**
 * Default maximum block nesting depth: 16 nested blockquotes or HTML
 * elements, or 8 nested lists (a list and its items are two levels).
 */
export const DEFAULT_MAX_NESTING_DEPTH = 16

/**
 * Extra levels allowed for inline formatting (bold, emphasis, links, inline
 * HTML) on top of the block limit, so content inside the deepest allowed
 * block keeps a little formatting.
 */
export const INLINE_DEPTH_ALLOWANCE = 4

/**
 * Tokens that wrap inline content without adding a meaningful level. They
 * never count toward the limit and are never flattened themselves.
 */
const TRANSPARENT: ReadonlySet<string> = new Set(['paragraph', 'heading', 'text'])

/**
 * Resolves the `maxNestingDepth` option to a usable limit.
 *
 * @param value - The option value as supplied by the consumer
 * @returns The limit to enforce, or `Infinity` when the guard is disabled
 *
 * @example
 * ```typescript
 * resolveMaxNestingDepth(undefined) // 16
 * resolveMaxNestingDepth(32) // 32
 * resolveMaxNestingDepth(Infinity) // Infinity (guard disabled)
 * resolveMaxNestingDepth(0) // 16 (invalid, falls back to the default)
 * ```
 */
export const resolveMaxNestingDepth = (value: unknown): number => {
    if (value === Infinity) return Infinity
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
        return DEFAULT_MAX_NESTING_DEPTH
    }
    return Math.floor(value)
}

/**
 * Whether an error is the engine reporting call-stack exhaustion. Engines
 * disagree on the shape: V8 and JavaScriptCore throw `RangeError: Maximum
 * call stack size exceeded`, SpiderMonkey throws `InternalError: too much
 * recursion`, and V8 throws `SyntaxError: ... Stack overflow` when it runs
 * out of stack while compiling a regular expression. Any other error,
 * including unrelated `RangeError`s, is not a stack overflow.
 *
 * @param error - The caught value
 * @returns `true` when `error` reports stack exhaustion
 *
 * @example
 * ```typescript
 * isStackOverflow(new RangeError('Maximum call stack size exceeded')) // true
 * isStackOverflow(new RangeError('Invalid count value: -1')) // false
 * ```
 */
export const isStackOverflow = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false
    const message = error.message
    if (error.name === 'InternalError') return /recursion/i.test(message)
    if (error instanceof RangeError) return /call stack|recursion/i.test(message)
    if (error instanceof SyntaxError) return /stack overflow/i.test(message)
    return false
}

/**
 * Builds a plain-text leaf token.
 *
 * @param raw - Text to render literally
 * @returns A leaf `text` token
 */
const toTextLeaf = (raw: string): Tokens.Text => ({
    type: 'text',
    raw,
    text: raw,
    escaped: false
})

/**
 * Builds the token that renders `raw` as plain text: a bare text token in
 * inline positions, a paragraph holding one in block positions, where a bare
 * inline token would not belong.
 *
 * @param raw - Text to render literally
 * @param inline - Whether the token goes into inline content
 * @returns The replacement token
 */
const toText = (raw: string, inline: boolean): Tokens.Text | Tokens.Paragraph =>
    inline ? toTextLeaf(raw) : { type: 'paragraph', raw, text: raw, tokens: [toTextLeaf(raw)] }

/**
 * Builds the tokens rendered when the source could not be lexed at all
 * because its nesting overflowed the call stack inside the lexer itself.
 *
 * @param source - The markdown source that failed to lex
 * @param isInline - Whether the source was being lexed as inline markdown
 * @returns A single token rendering the source as plain text
 *
 * @example
 * ```typescript
 * plainTextTokens('> > > deep', false)
 * // [{ type: 'paragraph', raw: '> > > deep', text: '> > > deep', tokens: [textLeaf] }]
 * ```
 */
export const plainTextTokens = (source: string, isInline: boolean): Token[] =>
    source ? [toText(source, isInline)] : []

/**
 * Whether a token array holds anything to descend into.
 *
 * @param value - Candidate child-token array
 * @returns `true` for a non-empty array
 */
const hasChildren = (value: unknown): value is Token[] => Array.isArray(value) && value.length > 0

/**
 * Whether an HTML element token is closed by a matching closing tag in its
 * text form: void elements (`<br>`) and genuinely self-closed tags (`<x/>`)
 * are not. An unquoted attribute ending in a slash (`<a href=/x/>`) is a
 * normal opening tag.
 *
 * @param token - An html token with a `tag`
 * @returns `true` when a closing tag should follow the children
 */
const needsClosingTag = (token: Token & { tag: string }): boolean =>
    !isVoidElement(token.tag) && !isSelfClosedTagSource(token.raw)

/**
 * Text standing in for a token about to be flattened. Markdown tokens carry
 * their source in `raw`, but a nested HTML element's `raw` is only its
 * opening tag, so it is rebuilt from the opening tag, its children and a
 * closing tag. The rebuilt HTML is the parser's normalized form (`<br>` reads
 * `<br/>`), not a byte-for-byte copy of the source. Iterative: the subtree
 * may be thousands of levels deep.
 *
 * @param root - The token being replaced
 * @returns Text for the token
 */
const textOf = (root: Token): string => {
    let out = ''
    const pending: (Token | string)[] = [root]
    while (pending.length) {
        const current = pending.pop() as Token | string
        if (typeof current === 'string') {
            out += current
            continue
        }
        out += current.raw
        const html = current as Token & { tag?: string; tokens?: Token[] }
        if (current.type !== 'html' || !html.tag || !Array.isArray(html.tokens)) continue
        if (needsClosingTag(html as Token & { tag: string })) pending.push(`</${html.tag}>`)
        for (let i = html.tokens.length - 1; i >= 0; i--) pending.push(html.tokens[i])
    }
    return out
}

/** Where a token array sits: among blocks, or inside inline content. */
type Context = 'block' | 'inline'

/** Child-token arrays of a container, and how they are reached. */
interface Children {
    arrays: Token[][]
    /** Levels between the container and its child tokens. */
    offset: number
    /** Context of the child tokens. */
    context: Context
}

/**
 * Lists the child-token arrays of a container token. Returns `undefined` for
 * a leaf.
 *
 * @param token - Token to inspect
 * @param context - Context the token itself sits in
 * @returns The child arrays, or `undefined`
 */
const childrenOf = (token: Token, context: Context): Children | undefined => {
    if (token.type === 'list') {
        const items = (token as Tokens.List).items
        // Item tokens sit two levels down (list > item) and are blocks.
        const arrays = items.map((item) => item.tokens).filter(hasChildren)
        return { arrays, offset: 2, context: 'block' }
    }
    if (token.type === 'table') {
        const table = token as Tokens.Table
        const cells = [...(table.header ?? []), ...(table.rows ?? []).flat()]
        const arrays = cells.map((cell) => cell.tokens).filter(hasChildren)
        return { arrays, offset: 1, context: 'inline' }
    }
    const children = (token as { tokens?: unknown }).tokens
    if (!hasChildren(children)) return undefined
    if (TRANSPARENT.has(token.type)) return { arrays: [children], offset: 0, context: 'inline' }
    // Blockquotes hold blocks; HTML elements hold whatever their position
    // allows; everything else (strong, em, del, link, ...) holds inline content.
    const childContext =
        token.type === 'blockquote' ? 'block' : token.type === 'html' ? context : 'inline'
    return { arrays: [children], offset: 1, context: childContext }
}

/** Fixed parameters of one clamp pass. */
interface Limits {
    block: number
    inline: number
    provenance?: ProvenanceCollector
}

/**
 * Recursive worker for {@link clampNestingDepth}.
 *
 * @param tokens - Token array to clamp in place
 * @param depth - Depth of the tokens in `tokens`
 * @param context - Whether `tokens` sit among blocks or inline content
 * @param limits - The block and inline limits
 */
const clamp = (tokens: Token[], depth: number, context: Context, limits: Limits): void => {
    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]
        const children = childrenOf(token, context)
        if (!children) continue
        // A container is flattened once the deepest level it occupies (a
        // list's items sit one below the list itself) exceeds the limit.
        // Transparent wrappers (offset 0) occupy no level of their own.
        const limit = context === 'block' ? limits.block : limits.inline
        if (children.offset > 0 && depth + children.offset - 1 > limit) {
            // Cached streaming provenance must drop this subtree first.
            limits.provenance?.invalidate(token)
            tokens[i] = toText(textOf(token), context === 'inline')
            continue
        }
        for (const array of children.arrays) {
            clamp(array, depth + children.offset, children.context, limits)
        }
    }
}

/**
 * Caps the depth of a token tree in place.
 *
 * A top-level container is depth 1 and each nested container (blockquote,
 * HTML element, bold, emphasis, link, ...) adds one; a list adds two (the
 * list and its items). Paragraphs, headings and text wrappers do not count.
 * Block containers may reach `maxDepth`; inline formatting may go
 * {@link INLINE_DEPTH_ALLOWANCE} levels further.
 *
 * A container nested deeper than that is replaced by its text: a paragraph
 * in block positions, a bare text token inline. Leaf tokens are always kept.
 * Recursion is bounded by the limit, so the guard itself cannot overflow the
 * stack on hostile input.
 *
 * @param tokens - Tokens to clamp (mutated in place)
 * @param maxDepth - Block limit, from {@link resolveMaxNestingDepth}
 * @param isInline - Whether `tokens` are inline tokens (inline parsing mode)
 * @param provenance - Streaming provenance collector to invalidate before
 *   replacing a subtree
 * @returns The same `tokens` array
 *
 * @example
 * ```typescript
 * const tokens = new Lexer().lex('> > > deep')
 * clampNestingDepth(tokens, 2)
 * // blockquote > blockquote > paragraph(text('> deep'))
 * ```
 */
export const clampNestingDepth = (
    tokens: Token[],
    maxDepth: number,
    isInline = false,
    provenance?: ProvenanceCollector
): Token[] => {
    if (maxDepth === Infinity) return tokens
    const limits = { block: maxDepth, inline: maxDepth + INLINE_DEPTH_ALLOWANCE, provenance }
    clamp(tokens, 1, isInline ? 'inline' : 'block', limits)
    return tokens
}
