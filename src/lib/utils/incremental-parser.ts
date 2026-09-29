/**
 * Incremental Markdown Parser for Streaming
 *
 * Optimizes streaming scenarios (LLM token-by-token updates) by performing
 * a full re-parse but diffing the result against the previous token array.
 * Only changed/appended tokens are returned as updates, allowing Svelte to
 * skip re-rendering unchanged components.
 *
 * @module incremental-parser
 */

import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token, Tokens, TokensList } from '$lib/utils/markdown-parser.js'
import { lexAndClean } from '$lib/utils/parse-and-cache.js'
import {
    countStreamStat,
    isSameStableNode,
    STREAM_STATS_ENABLED
} from '$lib/utils/streaming-token-reuse.js'
import { isTailWindowSafe } from '$lib/utils/tail-window.js'
import { isHtmlOpenTag } from '$lib/utils/token-cleanup.js'
import { isVoidElement } from '$lib/utils/void-elements.js'

/**
 * The shape of an HTML token after the cleanup pipeline. Marked's base
 * `Token` type doesn't discriminate html, so the cleanup-added fields
 * are surfaced here for the few places we need to read them.
 */
type HtmlToken = Token & {
    sourceLength?: number
    tag?: string
    tokens?: Token[]
}

interface TailWindowBoundary {
    prefixCount: number
    reparseOffset: number
}

interface ParseSourceResult {
    tokens: Token[]
    tailTokens: Token[]
    usedTailWindow: boolean
    /**
     * Leading roots of `tokens` that ARE the previous parse's root objects
     * (same identity, same index) by construction: the copied prefix on the
     * plain tail-window path, 0 everywhere else (the targeted definition path
     * may replace prefix roots). The divergence scan starts here.
     */
    reusedPrefixCount: number
    /**
     * True when the roots do not add up to the source length (see
     * `IncrementalParser.prevHasLengthMismatch`). Tail-window results sum
     * only the re-lexed tail (the prefix covers `reparseOffset` by
     * construction); full re-lexes sum every root.
     */
    hasLengthMismatch: boolean
    /** Every reference definition in `tokens` (marked's `def` tokens). */
    links: LinkMap
    /**
     * True when a definition changed in a way that can change how an
     * already-rendered root resolves a reference, so a raw-equal prefix is
     * not a safe reuse contract (`reuseMode: 'tree'` / divergeAt 0).
     */
    referenceSensitive: boolean
}

const CLOSED_FENCE_RE = /^ {0,3}(`{3,}|~{3,}).*\n[\s\S]*\n {0,3}\1[ \t]*\n*$/
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/
/** A paragraph that is only the start of an ordered-list marker (`2`, `10`):
 *  the next chunk may complete it (`2. item`). Bullet markers need no rule —
 *  a lone `-`, `*` or `+` already lexes as a list item. */
const PARTIAL_ORDERED_MARKER_RE = /^ {0,3}\d{1,9}$/
/** A block that opens like a reference definition's title (`"`, `'`, `(`).
 *  marked accepts a title on the line after the destination, indented by
 *  any whitespace, so a partial one lexes as a paragraph or indented code
 *  until it closes and joins the preceding `def`. */
const DEFINITION_TITLE_START_RE = /^[ \t]*["'(]/
/** Start of a CommonMark type-1 HTML block (`<pre`, `<script`, `<style`,
 *  `<textarea`), which only its matching closing tag ends. */
const RAW_TEXT_BLOCK_START_RE = /^ {0,3}<(pre|script|style|textarea)(?=[\s>]|$)/i
/** Start of a CommonMark type-4 HTML block (a declaration, `<!DOCTYPE`). */
const DECLARATION_START_RE = /^ {0,3}<![a-zA-Z]/
const LINK_REFERENCE_RE = /\[[^\]\n]+\]\[[^\]\n]*\]/
const SHORTCUT_REFERENCE_RE = /\[[^\]\n]+\](?![[(])/ // Excludes inline links/images and full refs
const REFERENCE_DEFINITION_RE = /^\s{0,3}\[[^\]\n]+\]:/m
const REGEXP_SPECIAL_RE = /[.*+?^${}()|[\]\\]/g
const WHITESPACE_RUN_RE = /\s+/g

/**
 * Every reference definition contains `]:` (the label's closing bracket and
 * the colon are adjacent in CommonMark, whatever container the definition
 * sits in). Source without it cannot add, change or remove a definition, so
 * this is the one textual pre-filter left: prose skips all definition work.
 * Whether a definition exists, and what it says, is decided from marked's
 * own `def` tokens.
 */
const DEFINITION_SIGIL = ']:'

/** marked's reference-definition map (`lexer.tokens.links`). */
type LinkMap = TokensList['links']

/**
 * Block tokens whose children are inline-only (or absent). Definitions are
 * block-level, so these never hold one and the definition walk skips them.
 */
const DEFINITION_FREE_TYPES = new Set([
    'paragraph',
    'heading',
    'text',
    'table',
    'code',
    'space',
    'hr'
])

/** Root types a reference use can never change the rendering of. */
const REFERENCE_INERT_ROOT_TYPES = new Set(['space', 'def', 'code', 'hr'])

/** A stable prefix root that may use a changed reference label. */
interface CitingRoot {
    /** Index in the prefix */
    index: number
    /** The root's exact source span */
    source: string
    /** `source` normalized for label-use search */
    text: string
}

/**
 * True for the raw of an html root that opens a CommonMark HTML block of
 * types 1–5 without containing its terminator. Those blocks are not ended by
 * a blank line — they run to their terminator, or to the end of the input
 * while unclosed — so the next chunk can still extend them across any number
 * of blank lines. Shapes cleanup leaves for them (marked 15):
 *
 *   '<!-- a comment\n\n'   => html{ raw: '<!-- a comment', block: true } + space
 *   '<!-- a comment\n\nsp' => html{ raw: '<!-- a comment\n\nsp', block: true }
 *   '<?php x;\n\n'         => html{ raw: '<?php x;', block: true } + space
 *   '<![CDATA[ a\n\n'      => html{ raw: '<![CDATA[ a', block: true } + space
 *   '<pre>\nkeep\n\n  th'  => html{ raw: '<pre>\nkeep\n\n  th', block: true }
 *
 * No `tag` and no `sourceLength`: the tag-based detector cannot see the first
 * four. A type-1 opening that cleanup expanded carries `tag` and is caught
 * there too; checked here so `<pre` before its `>` is covered as well.
 * Inspects the start in O(1); only a matching opener searches its own raw.
 *
 * @param raw - Raw source of an html root token without a known span
 * @returns `true` if the block is still waiting for its terminator
 * @example
 * ```typescript
 * isUnterminatedHtmlBlock('<!-- a comment') // true
 * isUnterminatedHtmlBlock('<!-- a comment\n\nspanning -->') // false
 * isUnterminatedHtmlBlock('<div>') // false (tag-based detector's job)
 * ```
 */
const isUnterminatedHtmlBlock = (raw: string): boolean => {
    const start = raw.indexOf('<')
    if (start < 0 || start > 3) return false
    if (raw.startsWith('<!--', start)) return !raw.includes('-->', start + 2)
    if (raw.startsWith('<?', start)) return !raw.includes('?>', start + 1)
    if (raw.startsWith('<![CDATA[', start)) return !raw.includes(']]>', start + 9)
    if (DECLARATION_START_RE.test(raw)) return !raw.includes('>', start + 2)
    const rawText = RAW_TEXT_BLOCK_START_RE.exec(raw)
    return rawText !== null && !raw.toLowerCase().includes(`</${rawText[1].toLowerCase()}>`)
}

/**
 * True for a root that can be a piece of an expanded html block: an `html`
 * root, or a root-level `text` (marked never emits `text` at the root; only
 * cleanup's html expansion does).
 *
 * @param token - A root token
 * @returns `true` for `html` and root-level `text`
 * @example
 * ```typescript
 * isHtmlPiece({ type: 'text', raw: '\n<' } as Token) // true
 * ```
 */
const isHtmlPiece = (token: Token): boolean => token.type === 'html' || token.type === 'text'

/*
 * marked's inline lexer state (`lexer.state.inLink` / `inRawBlock`) is shared
 * by every block of one lex: an inline `<code>` left open in one paragraph
 * makes the text of the following paragraphs `escaped`, and an inline `<a `
 * left open stops later bare URLs from autolinking, until the closing tag.
 * The state is kept as two bits.
 */
const DEFAULT_INLINE_STATE = 0
const IN_LINK = 1
const IN_RAW_BLOCK = 2
/** marked's `startATag` / `startPreScriptTag`; the matching closing tags
 *  (`</a>`, `</pre>`...) clear the state. */
const START_A_TAG_RE = /^<a /i
const START_RAW_TAG_RE = /^<(pre|code|kbd|script)(\s|>)/i
const RAW_TAGS = new Set(['pre', 'code', 'kbd', 'script'])
/** Inline containers: their `tokens` were lexed by marked's inline lexer. */
const INLINE_CONTAINER_TYPES = new Set(['paragraph', 'heading', 'text'])

type InlineStateToken = Token & {
    inLink?: boolean
    inRawBlock?: boolean
    tag?: string
    tokens?: Token[]
    items?: { tokens?: Token[] }[]
    header?: { tokens?: Token[] }[]
    rows?: { tokens?: Token[] }[][]
}

/**
 * marked's inline state after one INLINE token, given the state before it.
 * An html token marked emitted carries the state after it (`inLink`,
 * `inRawBlock`); cleanup keeps those fields unless it paired the tag with its
 * closing tag, and a pair can only close the state (its closing tag clears
 * it, as marked's `endATag` / `endPreScriptTag` do). A link clears `inLink`
 * once its text is lexed. The walk descends into nested inline tokens.
 *
 * @param token - An inline token
 * @param state - The state bits before it
 * @returns The state bits after it
 * @example
 * ```typescript
 * stepInlineState({ type: 'html', raw: '<code>', inLink: false, inRawBlock: true } as Token, 0) // IN_RAW_BLOCK
 * ```
 */
const stepInlineState = (token: Token, state: number): number => {
    const inline = token as InlineStateToken
    if (inline.type === 'html' && typeof inline.inRawBlock === 'boolean') {
        return (inline.inLink ? IN_LINK : 0) | (inline.inRawBlock ? IN_RAW_BLOCK : 0)
    }
    if (!Array.isArray(inline.tokens)) return state
    if (inline.type === 'link') return stepInlineTokens(inline.tokens, state | IN_LINK) & ~IN_LINK
    if (inline.type !== 'html' || !inline.tag) return stepInlineTokens(inline.tokens, state)
    // A paired inline tag: the opening tag, the children, the closing tag.
    let inner = state
    if (!(inner & IN_LINK) && START_A_TAG_RE.test(inline.raw)) inner |= IN_LINK
    if (!(inner & IN_RAW_BLOCK) && START_RAW_TAG_RE.test(inline.raw)) inner |= IN_RAW_BLOCK
    inner = stepInlineTokens(inline.tokens, inner)
    if (inline.tag === 'a') inner &= ~IN_LINK
    if (RAW_TAGS.has(inline.tag)) inner &= ~IN_RAW_BLOCK
    return inner
}

/** Folds `stepInlineState` over inline tokens. */
const stepInlineTokens = (tokens: readonly Token[], state: number): number => {
    for (const token of tokens) state = stepInlineState(token, state)
    return state
}

/**
 * marked's inline state after BLOCK tokens, given the state before them:
 * inline containers (paragraph, heading, list `text`, table cells) fold
 * their inline tokens; block containers (blockquote, list items, paired
 * html blocks) are descended into; block html itself never touches it.
 *
 * @param tokens - Block tokens in document order
 * @param state - The state bits before them
 * @returns The state bits after them
 * @example
 * ```typescript
 * stepBlockState(lexAndClean('a <code>\n\n', options, false), 0) // IN_RAW_BLOCK
 * ```
 */
const stepBlockState = (tokens: readonly Token[], state: number): number => {
    for (const token of tokens) {
        const block = token as InlineStateToken
        if (INLINE_CONTAINER_TYPES.has(block.type)) {
            if (block.tokens) state = stepInlineTokens(block.tokens, state)
        } else if (block.type === 'list') {
            for (const item of block.items ?? []) state = stepBlockState(item.tokens ?? [], state)
        } else if (block.type === 'table') {
            for (const cell of [...(block.header ?? []), ...(block.rows ?? []).flat()]) {
                state = stepInlineTokens(cell.tokens ?? [], state)
            }
        } else if (Array.isArray(block.tokens)) {
            state = stepBlockState(block.tokens, state)
        }
    }
    return state
}

const createLinkMap = (): LinkMap => Object.create(null) as LinkMap

/** Shared empty map for read-only "no definitions" arguments. */
const NO_LINKS: LinkMap = Object.freeze(createLinkMap())

/**
 * True when `links` defines at least one label. O(1).
 *
 * @param links - A definition map
 * @returns `true` if the map is not empty
 * @example
 * ```typescript
 * hasAnyLabel(createLinkMap()) // false
 * ```
 */
const hasAnyLabel = (links: LinkMap): boolean => {
    // marked never stores an empty label, so the first key answers it.
    for (const label in links) if (label) return true
    return false
}

/**
 * Copy of `links` without the labels `removed` defines.
 *
 * @param links - Definitions to copy
 * @param removed - Definitions whose labels are left out
 * @returns A new map (`links` is not mutated)
 * @example
 * ```typescript
 * withoutLabels({ a: A, b: B }, { b: B }) // { a: A }
 * ```
 */
const withoutLabels = (links: LinkMap, removed: LinkMap): LinkMap => {
    const kept = createLinkMap()
    for (const label in links) {
        if (!(label in removed)) kept[label] = links[label]
    }
    return kept
}

/**
 * Collects the reference definitions under `tokens` into `links` in document
 * order, keeping the first definition of a label — exactly the map marked
 * builds during a full lex (marked emits no `def` token for a duplicate
 * label, and nested definitions in blockquotes, list items and html blocks
 * keep their `def` token). Inline-only blocks are not descended into.
 *
 * @param tokens - Tokens in document order
 * @param links - Map to fill (mutated and returned)
 * @returns `links`
 * @example
 * ```typescript
 * collectDefinitions(tokens, createLinkMap()) // { docs: { href: '/docs', title: undefined } }
 * ```
 */
const collectDefinitions = (tokens: readonly Token[], links: LinkMap): LinkMap => {
    for (const token of tokens) {
        if (token.type === 'def') {
            const definition = token as Tokens.Def
            if (!(definition.tag in links)) {
                links[definition.tag] = { href: definition.href, title: definition.title }
            }
            continue
        }
        if (DEFINITION_FREE_TYPES.has(token.type)) continue
        const container = token as { items?: unknown; tokens?: unknown }
        if (Array.isArray(container.items)) collectDefinitions(container.items as Token[], links)
        if (Array.isArray(container.tokens)) collectDefinitions(container.tokens as Token[], links)
    }
    return links
}

/**
 * Labels whose resolution differs between two definition maps, ignoring
 * labels `shadowing` defines (an earlier definition wins, so those cannot
 * change).
 *
 * @param before - Definitions from the region being replaced
 * @param after - Definitions from the freshly lexed region
 * @param shadowing - Definitions that precede both regions
 * @returns Normalized labels that were added, removed, or changed
 * @example
 * ```typescript
 * getChangedLabels({ a: { href: '/x' } }, { a: { href: '/xy' } }, {}) // ['a']
 * ```
 */
const getChangedLabels = (before: LinkMap, after: LinkMap, shadowing: LinkMap): string[] => {
    const changed: string[] = []
    for (const label of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (label in shadowing) continue
        const previous = before[label]
        const next = after[label]
        if (
            previous?.href !== next?.href ||
            previous?.title !== next?.title ||
            !previous !== !next
        ) {
            changed.push(label)
        }
    }
    return changed
}

/**
 * Normalizes text the way marked normalizes a reference label (case fold via
 * lower/upper/lower, whitespace runs collapsed to one space), so a label's
 * uses can be found by substring search.
 *
 * @param text - Source text
 * @returns The normalized text
 * @example
 * ```typescript
 * normalizeReferenceText('See [Foo\n  Bar]') // 'see [foo bar]'
 * ```
 */
const normalizeReferenceText = (text: string): string =>
    text.toLowerCase().toUpperCase().toLowerCase().replace(WHITESPACE_RUN_RE, ' ')

/**
 * Matches a use of a normalized label in normalized text: `[label]`, which
 * covers shortcut `[label]`, collapsed `[label][]` and full `[text][label]`
 * references. marked trims the label, so one space inside either bracket is
 * allowed.
 *
 * @param label - Normalized label (marked's `tokens.links` key)
 * @returns A matcher for normalized root text
 * @example
 * ```typescript
 * createLabelUseMatcher('1').test('see [1] and [2]') // true
 * ```
 */
const createLabelUseMatcher = (label: string): RegExp =>
    new RegExp(`\\[ ?${label.replace(REGEXP_SPECIAL_RE, '\\$&')} ?\\]`)

/** How a streaming consumer may reuse the previous parse's token objects. */
export type StreamingReuseMode = 'prefix' | 'tree' | 'none'

/**
 * Result of an incremental parse update.
 */
export interface IncrementalUpdateResult {
    /** The full new token array */
    tokens: Token[]
    /** Index of the first token that differs from the previous parse */
    divergeAt: number
    /** Source offset where the divergent token begins, when known without scanning the stable prefix */
    divergeOffset?: number
    /** Whether consumers can safely reuse stable token objects from the previous parse */
    canReuse: boolean
    /**
     * How consumers may reuse token objects from the previous parse:
     * - `'prefix'`: the first `divergeAt` roots are stable (same as `canReuse`).
     * - `'tree'`: append-only, but a reference definition may have changed
     *   inline children anywhere; compare index-aligned across the whole array
     *   with the semantic comparator (`reuseStableTokenTree`). `divergeAt` is 0
     *   and `divergeOffset` is `undefined` (full render-metadata walk).
     * - `'none'`: not append-only; replace the token array.
     */
    reuseMode: StreamingReuseMode
    /** Whether this update re-lexed only the appended tail (vs the whole source) */
    usedTailWindow: boolean
    /**
     * Leading roots of `tokens` that are the SAME objects, at the same
     * indices, as in the previous update's `tokens` array (the reused prefix
     * of a tail-window update; 0 otherwise). A consumer that rendered that
     * previous array unchanged can skip these indices when reusing objects.
     */
    reusedPrefixCount: number
}

/**
 * Streaming-optimized parser that performs full re-parses but diffs results
 * against the previous token array to minimize DOM updates.
 *
 * For append-only streaming (typical LLM use case), most tokens are identical
 * between updates. By comparing `raw` strings, we identify which tokens changed
 * so Svelte can skip re-rendering unchanged components.
 *
 * @example
 * ```typescript
 * const parser = new IncrementalParser({ gfm: true })
 *
 * // First update — all tokens are "new"
 * const r1 = parser.update('# Hello')
 * // r1.divergeAt === 0
 *
 * // Second update — heading unchanged, paragraph appended
 * const r2 = parser.update('# Hello\n\nWorld')
 * // r2.divergeAt === 1 (heading at index 0 unchanged)
 * ```
 */
export class IncrementalParser {
    /** Previous parse result for diffing */
    private prevTokens: Token[] = []

    /** Previous full source string for append-only tail reparsing */
    private prevSource = ''

    /** Parser options passed to the Marked lexer */
    private options: SvelteMarkdownOptions

    /** Whether caller-supplied parser hooks make tail-window reparsing unsafe */
    private tailWindowDisabled: boolean

    /** True iff any token in `prevTokens` is an HTML opening whose actual
     *  source span is unknown. Closed HTML spans record `sourceLength`
     *  during cleanup and remain safe for tail-window offset arithmetic;
     *  unclosed spans do not. Cached to keep `getTailWindowBoundary` O(1)
     *  on the hot path. */
    private prevHasHtmlSpanMismatch = false

    /** True iff the root tokens of `prevTokens` do not add up to
     *  `prevSource.length` — marked consumed source without emitting a token
     *  of the same length (it normalizes `\r\n` to `\n`, and a duplicate
     *  reference definition emits no token). Tail-window offsets are computed
     *  from token lengths, so while this holds the tail window is not used.
     *  Recomputed on every full re-lex, so a document whose mismatch goes
     *  away regains the tail window. */
    private prevHasLengthMismatch = false

    /** Cached boundary for the next append-only update. Computed when
     * parser state is committed so `getTailWindowBoundary` stays O(1). */
    private prevTailWindowBoundary: TailWindowBoundary = { prefixCount: 0, reparseOffset: 0 }

    /** Cached reference-use fact for `prevSource` (a cheap regex superset,
     * refreshed from the appended slice only). Avoids scanning the
     * accumulated stream on every append. */
    private prevHasPotentialReferenceUse = false

    /** Every reference definition in `prevTokens`, from marked's own `def`
     * tokens (nested ones included). Replaced after each update: collected
     * from the roots after a full re-lex, or the prefix's definitions plus
     * the re-lexed tail's after a tail-window update. Each label has at most
     * one `def` token in a parse, so the prefix's definitions are this map
     * minus the previous tail's. */
    private knownLinks: LinkMap = createLinkMap()

    /** Normalized source text per stable root, for label-use search. Roots
     * are reused objects at fixed offsets, so each is normalized once. */
    private normalizedRootText = new WeakMap<Token, string>()

    /** marked's inline lexer state after each root whose state is not the
     * default (see `stepBlockState`); absent means the default. Recorded
     * for the re-lexed roots of each update (`recordInlineStates`), so the
     * boundary check reads one entry instead of walking the prefix. */
    private inlineStateAfter = new WeakMap<Token, number>()

    /**
     * Creates a new incremental parser instance.
     *
     * @param options - Svelte markdown parser options forwarded to Marked's Lexer
     */
    constructor(options: SvelteMarkdownOptions) {
        this.options = options

        // Marked's `use()` stores each extension's tokenizer FUNCTION (by
        // reference) in `options.extensions.block` / `.inline`. A registered
        // tokenizer only forces a full re-lex per chunk if it might depend on
        // prefix content; block-anchored, stateless tokenizers (marked with
        // `TAIL_WINDOW_SAFE` — katex, alert, mermaid) can safely run inside the
        // tail-window, exactly like Marked's built-in block rules. Custom
        // extensions and footnotes (cross-block ref/def state) carry no marker
        // and keep the conservative full-reparse behavior.
        const exts = (options as Record<string, unknown>).extensions as
            { block?: unknown[]; inline?: unknown[] } | undefined
        const tokenizerEntries = [...(exts?.block ?? []), ...(exts?.inline ?? [])]

        this.tailWindowDisabled =
            typeof options.walkTokens === 'function' ||
            options.tokenizer != null ||
            tokenizerEntries.some((entry) => !isTailWindowSafe(entry))
    }

    private getTailWindowBoundary = (): TailWindowBoundary => {
        // Precomputed at commit time by `getNextTailWindowBoundary` (which
        // already collapses to the empty boundary on an HTML span mismatch),
        // so the hot path is a single field read.
        return this.prevTailWindowBoundary
    }

    /**
     * True for an HTML construct that is still open: an opening tag whose
     * actual source span is unknown, or a comment / processing instruction /
     * declaration / CDATA section / raw-text element before its terminator
     * (`isUnterminatedHtmlBlock`). After token cleanup, closed HTML tokens
     * keep children on `.tokens` and record their full source span as
     * `sourceLength`. Unclosed HTML openings have neither a full span nor a
     * closing tag yet, so serving them as a stable tail-window prefix would
     * corrupt the offset math or split the construct at a blank line.
     */
    private hasHtmlSpanMismatch = (token: Token): boolean => {
        if (token.type !== 'html') return false
        const html = token as HtmlToken
        if (html.sourceLength != null) return false
        // A comment, processing instruction, declaration, CDATA section or
        // raw-text element (`<pre>`, `<script>`, ...) still before its
        // terminator: a blank line does not end it (plan 006).
        if (isUnterminatedHtmlBlock(html.raw)) return true
        if (html.raw.startsWith('</')) return false
        if (html.tag) return !html.raw.endsWith('/>')
        // An opening tag still waiting for its closing tag. Cleanup leaves it
        // as a FLAT root with no `.tag`, `.tokens` or `.sourceLength`
        // (`'<div>\n\n'` => `{ type: 'html', raw: '<div>', block: true }`
        // + `space`); only `pairFlatHtmlTokens` adds those once `</div>`
        // arrives and swallows the siblings in between. Freezing it before
        // then would leave its future children as flat roots, so the
        // document stays on the full re-lex path until it closes (#291).
        // Genuinely self-closed tags (`<div/>`, `<br>` -> `<br/>`) get a
        // `.tag` from cleanup and are handled above, so a tag-less `/>`
        // source here is an opening with an unquoted attribute value
        // (`<a href=/foo/>`); void elements never take children.
        const tagInfo = isHtmlOpenTag(html.raw)
        return tagInfo !== null && tagInfo.isOpening && !isVoidElement(tagInfo.tag)
    }

    /**
     * Source characters this token consumed. Closed HTML tokens record
     * their full span as `sourceLength` during cleanup; every other token's
     * `.raw` already equals its source span, so we fall back to `raw.length`.
     */
    private getTokenSourceLength = (token: Token): number => {
        return (token as HtmlToken).sourceLength ?? token.raw.length
    }

    /**
     * Total source characters `tokens` consumed, per `getTokenSourceLength`.
     * The tail-window offset arithmetic is only valid when this equals the
     * length of the source the tokens were lexed from; see
     * `prevHasLengthMismatch`.
     *
     * @param tokens - Root tokens from one lex, in document order
     * @returns The summed source span of `tokens`
     * @example
     * ```typescript
     * this.sumSourceLength(lexAndClean('# A\n\nB', options, false)) // 6 (= source length)
     * this.sumSourceLength(lexAndClean('a\r\n\r\nb', options, false)) // 4, not 6
     * ```
     */
    private sumSourceLength = (tokens: readonly Token[]): number => {
        let total = 0
        for (const token of tokens) total += this.getTokenSourceLength(token)
        return total
    }

    /**
     * True when `source` contains reference-style link syntax that could
     * resolve against a definition — either a full reference (`[text][id]`)
     * or a shortcut (`[text]`). It says nothing about whether a matching
     * definition exists; definitions are read from the lexed tokens.
     *
     * @param source - Markdown source to scan
     * @returns `true` if a full or shortcut reference use is present
     * @example
     * ```typescript
     * this.hasPotentialReferenceUse('see [docs]')   // true  (shortcut)
     * this.hasPotentialReferenceUse('see [a][b]')   // true  (full ref)
     * this.hasPotentialReferenceUse('see [x](/y)')  // false (inline link)
     * ```
     */
    private hasPotentialReferenceUse = (source: string): boolean => {
        if (!source.includes('[') || !source.includes(']')) return false

        return LINK_REFERENCE_RE.test(source) || SHORTCUT_REFERENCE_RE.test(source)
    }

    /**
     * True when `source` contains reference-style link syntax outside
     * reference definition lines. Definition labels (`[docs]: /docs`) look
     * like shortcut references to `SHORTCUT_REFERENCE_RE`, but they are not
     * renderable uses and should not keep a stream reference-sensitive after
     * the definition has already been handled.
     *
     * @param source - Markdown source or source slice to scan
     * @returns `true` if a full or shortcut reference use appears on a
     *   non-definition line
     * @example
     * ```typescript
     * this.hasPotentialReferenceUseOutsideDefinitions('[docs]: /docs') // false
     * this.hasPotentialReferenceUseOutsideDefinitions('see [docs]')     // true
     * ```
     */
    private hasPotentialReferenceUseOutsideDefinitions = (source: string): boolean => {
        if (!source.includes('[') || !source.includes(']')) return false

        for (const line of source.split('\n')) {
            if (REFERENCE_DEFINITION_RE.test(line)) continue
            if (this.hasPotentialReferenceUse(line)) return true
        }

        return false
    }

    /**
     * True when an append-only update newly introduces text accepted by
     * `matches`. Reference uses cannot span newlines, so a use split across
     * the append boundary can only complete on the line that straddles it;
     * checking the appended slice plus that single boundary line catches
     * every case without rescanning the accumulated source. Assumes `source`
     * starts with `prevSource` — callers guard the non-append case. (The one
     * unbounded input is a document streamed as a single newline-free line,
     * where the boundary line grows with the document.)
     *
     * Detects NEW matches only: a boundary line that already matched before
     * the append returns `false` even if the append extends it.
     *
     * @param source - Full source string for an append-only update
     * @param matches - Predicate identifying the reference syntax of interest
     * @returns `true` if the append introduces a match not already present
     * @example
     * ```typescript
     * // prevSource === 'see [do'
     * this.appendIntroducesMatch('see [docs]', this.hasPotentialReferenceUseOutsideDefinitions) // true
     * ```
     */
    private appendIntroducesMatch = (
        source: string,
        matches: (_candidate: string) => boolean
    ): boolean => {
        if (matches(source.slice(this.prevSource.length))) return true

        const lineStart = this.prevSource.lastIndexOf('\n') + 1
        // Already present on the boundary line before the append ⇒ not new.
        if (matches(this.prevSource.slice(lineStart))) return false
        return matches(source.slice(lineStart))
    }

    /**
     * True when `source` is a pure append onto the previously parsed source —
     * i.e. this is not the first update and `source` begins with `prevSource`.
     * Computed once per `update` and threaded into `canUseTailWindow` /
     * `parseSource` so the full-length `startsWith` scan runs a single time.
     * When the caller already verified that `source` starts with `appendsTo`
     * and `appendsTo` is `prevSource` (normally the same string object, so the
     * equality check is O(1)), that scan is skipped (plan 011).
     *
     * @param source - The full new source string for this update
     * @param appendsTo - A string the caller verified `source` starts with
     * @returns `true` if this update only appends to `prevSource`
     * @example
     * ```typescript
     * // prevSource === '# A\n\nB'
     * this.isAppendOnlyUpdate('# A\n\nB\n\nC') // true
     * this.isAppendOnlyUpdate('# A\n\nX') // false (diverges from prevSource)
     * ```
     */
    private isAppendOnlyUpdate = (source: string, appendsTo?: string): boolean =>
        this.prevSource !== '' &&
        (appendsTo === this.prevSource || source.startsWith(this.prevSource))

    /**
     * Decides whether an update may reuse the stable token prefix and re-lex
     * only the appended tail (`boundary.reparseOffset` onward) instead of the
     * whole document. Returns false whenever that shortcut could diverge from a
     * full parse: caller parser hooks are active, the update is not
     * append-only, the boundary is empty, or the previous roots do not add up
     * to the source. Reference definitions do not bypass the tail window: the
     * tail is lexed with the prefix's definitions (see `parseTailWindow`), and
     * a changed definition is handled after that lex, from its tokens.
     *
     * @param source - The full new source string for this update
     * @param boundary - The stable-prefix boundary from `getTailWindowBoundary`
     * @param isAppendOnly - Precomputed append-only fact from `update`; direct
     *   helper callers may omit it to compute the same fact locally
     * @returns `true` if the appended tail can be re-lexed in isolation
     * @example
     * ```typescript
     * const boundary = this.getTailWindowBoundary()
     * if (this.canUseTailWindow(source, boundary)) {
     *     // safe to re-lex only source.slice(boundary.reparseOffset)
     * }
     * ```
     */
    private canUseTailWindow = (
        source: string,
        boundary: TailWindowBoundary,
        isAppendOnly = this.isAppendOnlyUpdate(source)
    ): boolean => {
        if (this.tailWindowDisabled) return false
        if (this.prevSource === '' || this.prevTokens.length === 0) return false
        if (!isAppendOnly) return false
        // The cached boundary is already empty on a length mismatch; checked
        // here too so a boundary from elsewhere cannot bypass the guard.
        return boundary.reparseOffset > 0 && !this.prevHasLengthMismatch
    }

    /**
     * All reference definitions under `tokens`, from marked's `def` tokens;
     * see `collectDefinitions`. The single entry point for definition walks,
     * so their cost is observable.
     *
     * @param tokens - Tokens in document order
     * @returns A new definition map
     * @example
     * ```typescript
     * this.collectLinks(tailTokens) // { a: { href: '/x', title: undefined } }
     * ```
     */
    private collectLinks = (tokens: readonly Token[]): LinkMap =>
        collectDefinitions(tokens, createLinkMap())

    /**
     * Lexes an appended tail seeded with the definitions that precede it, so
     * tail references resolve against the prefix and a duplicate label keeps
     * the prefix's definition, exactly as in a one-shot lex. A tail without
     * `[` can neither use nor define a reference, so it is lexed unseeded
     * (skipping the map copy).
     *
     * @param tailSource - Source from the reparse offset to the end
     * @param links - Definitions of the stable prefix
     * @returns The tail's root tokens
     * @example
     * ```typescript
     * this.lexTail('See [a].', { a: { href: '/x', title: undefined } }) // paragraph with a link
     * ```
     */
    private lexTail = (tailSource: string, links: LinkMap): Token[] =>
        lexAndClean(
            tailSource,
            this.options,
            false,
            hasAnyLabel(links) && tailSource.includes('[') ? links : undefined
        )

    /**
     * Parses an append-only update in the tail window: the tail is lexed
     * seeded with the prefix's definitions, then whether a definition changed
     * is read from the tail's `def` tokens.
     *
     * 1. Tail without `]:` — it cannot add, change or remove a definition
     *    (the previous tail's source is a prefix of it), so no definition work.
     * 2. Otherwise the tail's definitions are compared with the ones the
     *    previous tail contributed. No change, or no reference use anywhere
     *    in the previous source: a plain tail-window update.
     * 3. A changed label with possible uses: re-lex the prefix roots that
     *    cite it (`parseDefinitionUpdate`), else a full re-lex; either way the
     *    update is reference-sensitive.
     *
     * @param source - Full source for this append-only update
     * @param boundary - Stable-prefix boundary (non-empty)
     * @returns The parse result for this update
     * @example
     * ```typescript
     * // prevSource === 'See [a].\n\n'
     * this.parseTailWindow('See [a].\n\n> [a]: /x\n', boundary) // re-lexes the tail and 'See [a].'
     * ```
     */
    private parseTailWindow = (source: string, boundary: TailWindowBoundary): ParseSourceResult => {
        const tailSource = source.slice(boundary.reparseOffset)
        if (!tailSource.includes(DEFINITION_SIGIL)) {
            const tailTokens = this.lexTail(tailSource, this.knownLinks)
            return this.createTailWindowResult(source, boundary, tailTokens, this.knownLinks)
        }

        const previousTailLinks = this.collectLinks(this.prevTokens.slice(boundary.prefixCount))
        const prefixLinks = withoutLabels(this.knownLinks, previousTailLinks)
        const tailTokens = this.lexTail(tailSource, prefixLinks)
        const tailLinks = this.collectLinks(tailTokens)
        const changedLabels = getChangedLabels(previousTailLinks, tailLinks, prefixLinks)
        // Earlier definitions win: prefix entries override tail entries (the
        // seeded tail lex emits no `def` for a prefix label anyway).
        const links = Object.assign(createLinkMap(), tailLinks, prefixLinks)
        if (changedLabels.length === 0 || !this.prevHasPotentialReferenceUse) {
            return this.createTailWindowResult(source, boundary, tailTokens, links)
        }
        return (
            this.parseDefinitionUpdate(source, boundary, tailTokens, changedLabels, links) ??
            this.parseFullSource(source, true)
        )
    }

    /**
     * The plain tail-window result: the previous prefix roots (same objects)
     * followed by the freshly lexed tail.
     *
     * @param source - Full source for this update
     * @param boundary - Stable-prefix boundary (non-empty)
     * @param tailTokens - Roots lexed from `source.slice(boundary.reparseOffset)`
     * @param links - Every definition in the resulting tokens
     * @returns A tail-window parse result that is not reference-sensitive
     * @example
     * ```typescript
     * this.createTailWindowResult(source, boundary, tailTokens, this.knownLinks)
     * ```
     */
    private createTailWindowResult = (
        source: string,
        boundary: TailWindowBoundary,
        tailTokens: Token[],
        links: LinkMap
    ): ParseSourceResult => {
        if (STREAM_STATS_ENABLED) {
            countStreamStat('copiedRoots', boundary.prefixCount + tailTokens.length)
        }
        return {
            // `slice` + `concat` is several times faster than spreading the
            // prefix at thousands of roots (plan 011).
            tokens: this.prevTokens.slice(0, boundary.prefixCount).concat(tailTokens),
            tailTokens,
            usedTailWindow: true,
            reusedPrefixCount: boundary.prefixCount,
            // Offset integrity (O(tail)): the prefix covers `reparseOffset` by
            // construction, so only the tail needs to add up. On a mismatch
            // `parseSource` discards this result for a full re-lex: the tail's
            // blank-line split can differ from a one-shot parse.
            hasLengthMismatch:
                this.sumSourceLength(tailTokens) !== source.length - boundary.reparseOffset,
            links,
            referenceSensitive: false
        }
    }

    /**
     * Completes a tail-window update whose tail changed the definition of a
     * label the prefix may use: each prefix root that cites a changed label
     * is re-lexed with the complete definition map; every other prefix root
     * is kept as-is. The tail is already lexed, so this re-lexes at most the
     * prefix — never more characters than a full re-lex. Returns `undefined`
     * (the caller then does a full re-lex) when the prefix offsets do not add
     * up, or a re-lexed root does not reproduce exactly one root with the
     * same type, raw and span.
     *
     * @param source - Full source for this append-only update
     * @param boundary - Stable-prefix boundary (non-empty)
     * @param tailTokens - The tail, lexed seeded with the prefix's definitions
     * @param changedLabels - Normalized labels whose definition changed
     * @param links - The complete definition map for `source`
     * @returns The spliced tokens, or `undefined` to fall back to a full re-lex
     * @example
     * ```typescript
     * // prevSource === 'See [a].\n\nPlain.\n\n'
     * this.parseDefinitionUpdate(source, boundary, tailTokens, ['a'], links)
     * // re-lexes 'See [a].' only
     * ```
     */
    private parseDefinitionUpdate = (
        source: string,
        boundary: TailWindowBoundary,
        tailTokens: Token[],
        changedLabels: string[],
        links: LinkMap
    ): ParseSourceResult | undefined => {
        const prefixRoots = this.prevTokens.slice(0, boundary.prefixCount)
        const candidates = this.findCitingRoots(source, prefixRoots, changedLabels, boundary)
        if (!candidates) return undefined
        const roots = this.relexCitingRoots(prefixRoots, candidates, links)
        if (!roots) return undefined
        if (STREAM_STATS_ENABLED) countStreamStat('copiedRoots', roots.length + tailTokens.length)
        return {
            tokens: [...roots, ...tailTokens],
            tailTokens,
            usedTailWindow: true,
            reusedPrefixCount: 0,
            // Offset integrity (O(tail)): the prefix roots end at
            // `reparseOffset` (checked in `findCitingRoots`) and each re-lexed
            // root keeps its span (checked in `relexCitingRoots`).
            hasLengthMismatch:
                this.sumSourceLength(tailTokens) !== source.length - boundary.reparseOffset,
            links,
            referenceSensitive: true
        }
    }

    /**
     * Finds the stable prefix roots whose source uses any of `labels`,
     * without lexing. Offsets are summed over the prefix and must land on
     * `boundary.reparseOffset`.
     *
     * @param source - Full source for this update
     * @param prefixRoots - Stable prefix roots from the previous parse
     * @param labels - Normalized labels whose definition changed
     * @param boundary - Stable-prefix boundary the roots end at
     * @returns Citing roots with their source, or `undefined` to fall back
     * @example
     * ```typescript
     * this.findCitingRoots(source, prefixRoots, ['a'], boundary)
     * ```
     */
    private findCitingRoots = (
        source: string,
        prefixRoots: Token[],
        labels: string[],
        boundary: TailWindowBoundary
    ): CitingRoot[] | undefined => {
        const matchers = labels.map(createLabelUseMatcher)
        const candidates: CitingRoot[] = []
        let offset = 0
        for (let index = 0; index < prefixRoots.length; index++) {
            const root = prefixRoots[index]
            const start = offset
            offset += this.getTokenSourceLength(root)
            if (REFERENCE_INERT_ROOT_TYPES.has(root.type)) continue
            const text = this.getNormalizedRootText(root, source, start, offset)
            if (!matchers.some((matcher) => matcher.test(text))) continue
            candidates.push({ index, source: source.slice(start, offset), text })
        }
        return offset === boundary.reparseOffset ? candidates : undefined
    }

    /**
     * Re-lexes each citing root with the complete link map; see
     * `parseDefinitionUpdate`. A root that itself holds a definition (nested
     * in a blockquote, list item or html block) is seeded WITHOUT its own
     * labels, so its lexer registers them and emits their `def` tokens again
     * instead of dropping them as duplicates.
     *
     * @param prefixRoots - Stable prefix roots from the previous parse
     * @param candidates - Roots that use a changed label
     * @param links - The complete definition map for the current source
     * @returns Prefix roots with citing roots replaced (the input array when
     *   there are none), or `undefined` to fall back to a full re-lex
     * @example
     * ```typescript
     * this.relexCitingRoots(prefixRoots, candidates, links)
     * ```
     */
    private relexCitingRoots = (
        prefixRoots: Token[],
        candidates: CitingRoot[],
        links: LinkMap
    ): Token[] | undefined => {
        let roots: Token[] | undefined
        for (const candidate of candidates) {
            // Re-lexed alone, the root starts from marked's default inline
            // state; inside an open inline `<code>` / `<a ` it would not.
            if (
                candidate.index > 0 &&
                this.getInlineStateAfter(prefixRoots[candidate.index - 1]) !== DEFAULT_INLINE_STATE
            ) {
                return undefined
            }
            const root = prefixRoots[candidate.index]
            const seed = candidate.source.includes(DEFINITION_SIGIL)
                ? withoutLabels(links, this.collectLinks([root]))
                : links
            const relexed = lexAndClean(candidate.source, this.options, false, seed)
            if (relexed.length !== 1) return undefined
            if (relexed[0].type !== root.type || relexed[0].raw !== root.raw) return undefined
            // Offset integrity: the root must still consume its exact span.
            if (this.getTokenSourceLength(relexed[0]) !== candidate.source.length) return undefined
            roots ??= prefixRoots.slice()
            roots[candidate.index] = relexed[0]
        }
        return roots ?? prefixRoots
    }

    /**
     * Normalized source text of a stable prefix root, cached per root object.
     *
     * @param root - A stable prefix root
     * @param source - Full source the root's offsets refer to
     * @param start - Root start offset in `source`
     * @param end - Root end offset in `source`
     * @returns `normalizeReferenceText` of the root's source span
     * @example
     * ```typescript
     * this.getNormalizedRootText(root, source, 0, root.raw.length)
     * ```
     */
    private getNormalizedRootText = (
        root: Token,
        source: string,
        start: number,
        end: number
    ): string => {
        let text = this.normalizedRootText.get(root)
        if (text === undefined) {
            text = normalizeReferenceText(source.slice(start, end))
            this.normalizedRootText.set(root, text)
        }
        return text
    }

    /**
     * Re-lexes the whole source; the fallback for every update the tail
     * window or the targeted definition path cannot serve. Definitions are
     * collected from the roots only when the source contains `]:`, and
     * compared with the previous parse's to decide reference sensitivity.
     *
     * @param source - Full source for this update
     * @param isAppendOnly - Whether `source` appends to the previous source
     * @returns A full-parse result (no reused prefix)
     * @example
     * ```typescript
     * this.parseFullSource('# A\n\nB', true) // { tokens: [heading, space, paragraph], usedTailWindow: false, ... }
     * ```
     */
    private parseFullSource = (source: string, isAppendOnly: boolean): ParseSourceResult => {
        const tokens = lexAndClean(source, this.options, false)
        // The lex was already O(document), so neither the scan for `]:`, the
        // definition walk nor the full length sum adds an order.
        const links = source.includes(DEFINITION_SIGIL) ? this.collectLinks(tokens) : NO_LINKS
        return {
            tokens,
            tailTokens: [],
            usedTailWindow: false,
            reusedPrefixCount: 0,
            hasLengthMismatch: this.sumSourceLength(tokens) !== source.length,
            links,
            referenceSensitive: this.definitionsAffectUses(source, links, isAppendOnly)
        }
    }

    /**
     * Whether the definitions of a fully re-lexed source can change how a
     * root that kept its `raw` renders. For an append, that needs a label
     * whose definition changed and a possible reference use in the previous
     * source. For any other edit (no prefix is reused anyway) it stays as
     * conservative as before: definitions on either side plus a possible use.
     *
     * @param source - Full source for this update
     * @param links - Every definition in the new tokens
     * @param isAppendOnly - Whether `source` appends to the previous source
     * @returns `true` if the update must be treated as reference-sensitive
     * @example
     * ```typescript
     * // prevSource === 'See [a].\n\n' (a use, no definition yet)
     * this.definitionsAffectUses('See [a].\n\n[a]: /x', { a: A }, true) // true
     * ```
     */
    private definitionsAffectUses = (
        source: string,
        links: LinkMap,
        isAppendOnly: boolean
    ): boolean => {
        if (isAppendOnly) {
            return (
                this.prevHasPotentialReferenceUse &&
                getChangedLabels(this.knownLinks, links, NO_LINKS).length > 0
            )
        }
        return (
            (hasAnyLabel(this.knownLinks) || hasAnyLabel(links)) &&
            (this.prevHasPotentialReferenceUse || this.hasPotentialReferenceUse(source))
        )
    }

    /**
     * Produces this update's tokens: the tail window when it may be used,
     * else a full re-lex. A tail-window (or targeted definition) result whose
     * roots do not add up to the source is discarded for a full re-lex: marked
     * dropped or rewrote source in the tail (a duplicate definition, CRLF),
     * and the separately lexed tail can then split blank lines differently
     * from a one-shot parse (`space "\n\n" + space "\n"` vs `space "\n\n\n"`).
     * That costs one extra lex on the rare update where it happens; the flag
     * the full result carries keeps later updates off the tail window.
     *
     * @param source - Full source for this update
     * @param boundary - Stable-prefix boundary from `getTailWindowBoundary`
     * @param isAppendOnly - Whether `source` appends to the previous source
     * @returns The parse result for this update
     * @example
     * ```typescript
     * this.parseSource(source, this.getTailWindowBoundary(), true)
     * ```
     */
    private parseSource = (
        source: string,
        boundary: TailWindowBoundary,
        isAppendOnly: boolean
    ): ParseSourceResult => {
        if (!this.canUseTailWindow(source, boundary, isAppendOnly)) {
            return this.parseFullSource(source, isAppendOnly)
        }
        const result = this.parseTailWindow(source, boundary)
        return result.usedTailWindow && result.hasLengthMismatch
            ? this.parseFullSource(source, isAppendOnly)
            : result
    }

    /**
     * True when any token in `tokens` has an unknown HTML source span. Tail
     * reparsing can reuse a prefix only when prefix token lengths still map to
     * source offsets; unclosed HTML openings break that invariant.
     *
     * @param tokens - Tokens to inspect for unknown HTML spans
     * @returns `true` if at least one token makes tail-window offsets unsafe
     * @example
     * ```typescript
     * this.hasAnyHtmlSpanMismatch(tailTokens) // scan only the reparsed tail
     * ```
     */
    private hasAnyHtmlSpanMismatch = (tokens: Token[]): boolean => {
        return tokens.some(this.hasHtmlSpanMismatch)
    }

    /**
     * Computes and caches the next stable-prefix boundary once per committed
     * parser state. The hot-path `getTailWindowBoundary` then returns this
     * object without summing every prefix token on every append.
     *
     * @param tokens - Latest token array after parsing the current source
     * @param sourceLength - Character length of the current source
     * @param offsetsUnsafe - Whether token lengths cannot be mapped to source
     *   offsets: an HTML token has an unknown source span, or the roots do not
     *   add up to `sourceLength`
     * @returns The prefix token count and source offset to reuse on the next
     *   append-only update
     * @example
     * ```typescript
     * this.prevTailWindowBoundary = this.getNextTailWindowBoundary(tokens, source.length, false)
     * ```
     */
    private getNextTailWindowBoundary = (
        tokens: Token[],
        sourceLength: number,
        offsetsUnsafe: boolean
    ): TailWindowBoundary => {
        // (#291) If any token is an HTML opening with no known source span,
        // the tail-window prefix is unsound: `.raw` is only the opening tag
        // itself, while children and the closing tag live elsewhere. Closed
        // HTML tokens carry `sourceLength`, so only truly partial HTML forces
        // the empty boundary that falls through to a full re-parse. The same
        // holds when the roots do not add up to the source length (CRLF, a
        // duplicate reference definition): `sourceLength - raw.length` would
        // land in the wrong place.
        if (tokens.length === 0 || offsetsUnsafe) {
            return { prefixCount: 0, reparseOffset: 0 }
        }

        // The LAST token is never stable, whatever its type. marked moves a
        // block's trailing newline out of its raw once the next character is
        // another newline (marked 15, GFM):
        //   "```\nx\n```\n" => code "```\nx\n```\n"
        //   "```\nx\n```\n\n" => code "```\nx\n```" + space "\n\n"
        //   "# H\n" => heading "# H\n";  "# H\n\n" => heading "# H" + space "\n\n"
        //   "P\n" => paragraph "P\n";    "P\n\n" => paragraph "P" + space "\n\n"
        // (lists, blockquotes, tables, html and defs behave the same). So a
        // token at the source end can still change its `raw` split, and
        // freezing it one chunk early breaks parity with a one-shot parse
        // (`raw.length` feeds source-offset render keys). No block raw ever
        // ends in a blank line either — the blank line is always a separate
        // `space` token — and an unclosed fence must stay in the tail anyway.
        // Once another token follows it, it joins the prefix via this cut.
        let cut = tokens.length - 1
        let reparseOffset = sourceLength - this.getTokenSourceLength(tokens[cut])
        for (let held = this.countHeldTokens(tokens); held > 0; held--) {
            cut--
            reparseOffset -= this.getTokenSourceLength(tokens[cut])
        }
        if (this.isUnsafeCut(tokens, cut)) return { prefixCount: 0, reparseOffset: 0 }
        return { prefixCount: cut, reparseOffset }
    }

    /**
     * True when the tail must not start at `cut`, because the tail would be
     * lexed in a context a one-shot parse does not have. O(1): inspects the
     * two roots around the cut and one cached fact; the next update then
     * re-lexes in full, and the tail window is used again as soon as the cut
     * moves past the condition.
     *
     * 1. The cut splits ONE marked html block that cleanup expanded into
     *    several roots. marked lexes `<li>x</li>\n<` as one html token and
     *    cleanup turns it into `html <li>` + text `\n<`; the next chunk still
     *    extends that block, so a tail lexed from the second piece becomes a
     *    separate document (`\n</u` => space + paragraph) where a one-shot
     *    parse keeps one html block (`<li>` spanning `</u`). Root-level `text`
     *    only comes from such an expansion; two adjacent html-ish roots with
     *    no `space` between them are treated the same (a false positive only
     *    costs a full re-lex).
     * 2. marked's inline lexer state is not the default at the cut: an inline
     *    `<pre>`/`<code>`/`<kbd>`/`<script>` or `<a ` opened before it is not
     *    closed yet (see `stepInlineState`), and the tail would be lexed with
     *    a fresh state (`a <code>\n\nb` => `b` is escaped text one-shot).
     *
     * @param tokens - Latest root tokens
     * @param cut - Index of the first tail root
     * @returns `true` if the next update must re-lex the whole source
     * @example
     * ```typescript
     * this.isUnsafeCut(lexAndClean('<li>x</li>\n<', options, false), 1) // true
     * this.isUnsafeCut(lexAndClean('<li>x</li>\n\n', options, false), 1) // false
     * ```
     */
    private isUnsafeCut = (tokens: Token[], cut: number): boolean =>
        cut > 0 &&
        ((isHtmlPiece(tokens[cut]) && isHtmlPiece(tokens[cut - 1])) ||
            this.getInlineStateAfter(tokens[cut - 1]) !== DEFAULT_INLINE_STATE)

    /**
     * marked's inline lexer state after `root`, as recorded by
     * `recordInlineStates` (the default when nothing was recorded).
     *
     * @param root - A root token of the current parse
     * @returns The inline state bits after the root
     * @example
     * ```typescript
     * this.getInlineStateAfter(tokens[cut - 1]) // DEFAULT_INLINE_STATE
     * ```
     */
    private getInlineStateAfter = (root: Token): number =>
        this.inlineStateAfter.get(root) ?? DEFAULT_INLINE_STATE

    /**
     * Records marked's inline lexer state after each root from `from` on,
     * folding from the state after the root before it. Roots before `from`
     * are the previous parse's objects and keep their recorded state. Only
     * roots whose raw contains `<` can change the state, so prose costs one
     * `includes` per root. Runs on the re-lexed tail on the tail-window
     * path and on every root only after a full re-lex.
     *
     * @param tokens - Root tokens of the committed parse
     * @param from - First root that is not a reused prefix root
     * @example
     * ```typescript
     * this.recordInlineStates(parseResult.tokens, parseResult.reusedPrefixCount)
     * ```
     */
    private recordInlineStates = (tokens: Token[], from: number): void => {
        let state = from > 0 ? this.getInlineStateAfter(tokens[from - 1]) : DEFAULT_INLINE_STATE
        for (let index = from; index < tokens.length; index++) {
            const root = tokens[index]
            if (root.raw.includes('<')) state = stepBlockState([root], state)
            if (state === DEFAULT_INLINE_STATE) this.inlineStateAfter.delete(root)
            else this.inlineStateAfter.set(root, state)
        }
    }

    /**
     * How many tokens BEFORE the last one must stay in the tail because the
     * stream sits on a boundary the next chunk can still move. Inspects at
     * most the last three tokens — never scans — and each rule holds a block
     * only while the stream is on its ambiguous boundary; once another block
     * follows, the held block joins the prefix.
     *
     * 1. The last token is `space` and the stream is inside a whitespace-only
     *    line (its raw does not end with a line break): that line may still
     *    become indentation, and marked then assigns the previous block's
     *    trailing newline differently (`# H\n ` => heading `# H` + space,
     *    `# H\n    i` => heading `# H\n` + code). Holds any block type.
     * 2. The last token is `space` ending a line after a list or indented
     *    code: a blank line does not close those blocks.
     * 3. `list|indented code, space, paragraph` where the paragraph is only a
     *    partial ordered marker (`2` -> `2. second`): the list is not closed
     *    yet. Any other text after the blank line has closed the list.
     * 4. `def, block` where the block opens like a title (`"`, `'`, `(`): the
     *    title may still close and join the definition (`[d]: /d\n"Ti` =>
     *    def + paragraph; `[d]: /d\n"Title"` => one def).
     *
     * @param tokens - Latest root tokens (non-empty)
     * @returns 0, 1 or 2 tokens to pull into the tail before the last token
     * @example
     * ```typescript
     * this.countHeldTokens(lexAndClean('# H\n ', options, false)) // 1
     * this.countHeldTokens(lexAndClean('[d]: /d\n"Ti', options, false)) // 1
     * this.countHeldTokens(lexAndClean('1. a\n\n2', options, false)) // 2
     * ```
     */
    private countHeldTokens = (tokens: Token[]): number => {
        const cut = tokens.length - 1
        if (cut < 1) return 0
        const last = tokens[cut]
        const previous = tokens[cut - 1]
        if (last.type === 'space') {
            return !last.raw.endsWith('\n') || this.canContinueAcrossBlankLine(previous) ? 1 : 0
        }
        if (previous.type === 'def') return DEFINITION_TITLE_START_RE.test(last.raw) ? 1 : 0
        return cut > 1 &&
            last.type === 'paragraph' &&
            PARTIAL_ORDERED_MARKER_RE.test(last.raw) &&
            previous.type === 'space' &&
            this.canContinueAcrossBlankLine(tokens[cut - 2])
            ? 2
            : 0
    }

    /**
     * Blocks a blank or whitespace-only line does NOT terminate: the next
     * chunk may continue them (another list item, a further indented code
     * line), so they must be re-lexed together with the tail. A fenced
     * block (open or closed) is excluded: once a `space` follows it, a
     * closed fence is done, and an open fence absorbs blank lines into its
     * own raw so it is the last token and already in the tail. Only
     * fence-less (indented) code qualifies.
     *
     * @param token - The token immediately before a trailing `space` token
     * @returns `true` for a list or an indented code block
     * @example
     * ```typescript
     * this.canContinueAcrossBlankLine(listToken) // true
     * ```
     */
    private canContinueAcrossBlankLine = (token: Token): boolean =>
        token.type === 'list' ||
        (token.type === 'code' &&
            !CLOSED_FENCE_RE.test(token.raw) &&
            !FENCE_OPEN_RE.test(token.raw))

    /**
     * Commits parser state and refreshes cached bookkeeping facts for the next
     * update. When the current parse reused a stable prefix, only the reparsed
     * tail is inspected for HTML span mismatches so append-only streaming stays
     * proportional to the newly parsed region.
     *
     * @param source - Full source string for the just-completed update
     * @param parseResult - Parsed tokens plus metadata describing whether the
     *   tail-window shortcut was used
     * @param isAppendOnly - Whether `source` appended to the previous source
     * @returns Nothing; updates `prevSource`, `prevTokens`, and cached flags
     * @example
     * ```typescript
     * this.updateCachedState(source, parseResult, isAppendOnly)
     * ```
     */
    private updateCachedState = (
        source: string,
        parseResult: ParseSourceResult,
        isAppendOnly: boolean
    ): void => {
        // HTML-span-mismatch keys on `usedTailWindow` (a fact about the tokens,
        // recomputed whenever the tail window is bypassed), while the reference
        // use fact keys on `isAppendOnly` (a fact about the source, which
        // accumulates monotonically under a pure append regardless of parse
        // strategy). Definitions come from the parse result's tokens.
        const hasHtmlSpanMismatch = parseResult.usedTailWindow
            ? this.prevHasHtmlSpanMismatch || this.hasAnyHtmlSpanMismatch(parseResult.tailTokens)
            : this.hasAnyHtmlSpanMismatch(parseResult.tokens)
        // Computed by `parseSource`: O(tail) on the tail-window paths, a full
        // sum only after a full re-lex (which was already O(document)).
        const { hasLengthMismatch } = parseResult

        // `isAppendOnly` already guarantees `source.startsWith(prevSource)`, so
        // call `appendIntroducesMatch` directly rather than re-checking it.
        this.prevHasPotentialReferenceUse = isAppendOnly
            ? this.prevHasPotentialReferenceUse ||
              this.appendIntroducesMatch(source, this.hasPotentialReferenceUseOutsideDefinitions)
            : this.hasPotentialReferenceUseOutsideDefinitions(source)
        this.knownLinks = parseResult.links

        this.prevSource = source
        this.prevTokens = parseResult.tokens
        this.prevHasHtmlSpanMismatch = hasHtmlSpanMismatch
        this.prevHasLengthMismatch = hasLengthMismatch
        // Reused prefix roots keep their recorded state; only the re-lexed
        // roots are walked (every root after a full re-lex).
        this.recordInlineStates(parseResult.tokens, parseResult.reusedPrefixCount)
        this.prevTailWindowBoundary = this.getNextTailWindowBoundary(
            parseResult.tokens,
            source.length,
            hasHtmlSpanMismatch || hasLengthMismatch
        )
    }

    /**
     * Finds the first root that differs from the previous parse and the
     * absolute source offset where it begins.
     *
     * We compare with the semantic comparator, and for html tokens that
     * includes the structural shape — an unclosed `<div>` and a closed
     * `<div>...</div>` both have `raw === '<div>'` but very different
     * `.tokens` children. Without this check the streaming consumer would
     * never see the partial-to-closed transition. See #291.
     *
     * The scan starts at `parseResult.reusedPrefixCount`: on the plain
     * tail-window path the first `boundary.prefixCount` roots are the previous
     * parse's objects at the same indices (copied by `parseSource`), so
     * comparing them could only return `true`. Skipping them keeps the scan
     * proportional to the re-lexed tail instead of the document (plan 011).
     * Every other path reports 0 and compares from index 0.
     *
     * `divergeOffset` lets `SvelteMarkdown.svelte` skip render-metadata work
     * for the reused prefix. The tail-window path seeds it with the already
     * -known `boundary.reparseOffset` (the reused prefix is covered) and only
     * sums tokens past the prefix. The full-reparse path (which still
     * re-lexes the whole source, e.g. when a built-in extension is not
     * tail-safe) starts at 0 and sums every matched token from index 0, so an
     * append-only update with a stable prefix can still skip the prefix
     * metadata walk even though the tail-window was bypassed.
     *
     * @param newTokens - Tokens from the current parse
     * @param parseResult - How the current parse was produced
     * @param boundary - The tail-window boundary used for this parse
     * @returns The divergence index and offset (`undefined` when unknown)
     * @example
     * ```typescript
     * const { divergeAt, divergeOffset } = this.findDivergence(tokens, parseResult, boundary)
     * ```
     */
    private findDivergence = (
        newTokens: Token[],
        parseResult: ParseSourceResult,
        boundary: TailWindowBoundary
    ): { divergeAt: number; divergeOffset: number | undefined } => {
        let divergeAt = parseResult.reusedPrefixCount
        let divergeOffset: number | undefined = parseResult.usedTailWindow
            ? boundary.reparseOffset
            : 0
        const minLen = Math.min(this.prevTokens.length, newTokens.length)
        while (divergeAt < minLen) {
            const prev = this.prevTokens[divergeAt]
            const next = newTokens[divergeAt]
            if (STREAM_STATS_ENABLED) countStreamStat('comparedRoots')
            if (!isSameStableNode(prev, next)) break
            if (parseResult.usedTailWindow) {
                // Tail-window path (unchanged): tokens up to `prefixCount`
                // are the reused prefix already covered by `reparseOffset`.
                if (divergeOffset !== undefined && divergeAt >= boundary.prefixCount) {
                    divergeOffset += this.getTokenSourceLength(next)
                }
            } else if (divergeOffset !== undefined) {
                // Full-reparse path: accumulate the absolute offset from
                // index 0. A matched-prefix HTML token with an unknown
                // source span (unclosed opening) breaks the offset→source
                // mapping — null the offset so the consumer falls back to a
                // full metadata walk. A wrong offset silently corrupts
                // source keys and DOM identity; `undefined` is always safe.
                if (this.hasHtmlSpanMismatch(next)) {
                    divergeOffset = undefined
                } else {
                    divergeOffset += this.getTokenSourceLength(next)
                }
            }
            divergeAt++
        }
        return { divergeAt, divergeOffset }
    }

    /**
     * Parses the full source and diffs against the previous result.
     *
     * @param source - The full accumulated markdown source string
     * @param appendsTo - Optional string the caller has ALREADY verified that
     *   `source` starts with (e.g. its previous buffer before appending a
     *   chunk). When it is the previously parsed source, the parser skips its
     *   own full-length `startsWith` check. Passing a string `source` does not
     *   start with breaks parsing; omit it when unsure.
     * @returns The new tokens and the index where they diverge from the previous parse
     */
    update = (source: string, appendsTo?: string): IncrementalUpdateResult => {
        const boundary = this.getTailWindowBoundary()
        const isAppendOnly = this.isAppendOnlyUpdate(source, appendsTo)
        // Whether a reference definition changed is decided AFTER lexing, from
        // marked's `def` tokens (see `parseTailWindow` / `parseFullSource`):
        // a definition whose URL or title is still streaming, or one nested
        // in a blockquote or list item, changes how earlier references
        // resolve, and only the tokens say so reliably.
        const parseResult = this.parseSource(source, boundary, isAppendOnly)
        const newTokens = parseResult.tokens

        // Apply walkTokens if configured
        if (typeof this.options.walkTokens === 'function') {
            for (const token of newTokens) {
                // Incremental parsing is sync; async callbacks use the async parse path.
                void this.options.walkTokens(token)
            }
        }

        const { referenceSensitive } = parseResult
        const canReuse = isAppendOnly && !referenceSensitive
        const reuseMode: StreamingReuseMode = canReuse ? 'prefix' : isAppendOnly ? 'tree' : 'none'

        // Reference-sensitive updates report no stable prefix: inline children
        // may differ without `raw` changing. In tree mode the offset is
        // `undefined` so the consumer walks all render metadata.
        const { divergeAt, divergeOffset } = referenceSensitive
            ? { divergeAt: 0, divergeOffset: reuseMode === 'tree' ? undefined : 0 }
            : this.findDivergence(newTokens, parseResult, boundary)

        this.updateCachedState(source, parseResult, isAppendOnly)
        return {
            tokens: newTokens,
            divergeAt,
            divergeOffset,
            canReuse,
            reuseMode,
            usedTailWindow: parseResult.usedTailWindow,
            reusedPrefixCount: parseResult.reusedPrefixCount
        }
    }
}
