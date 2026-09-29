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
}

const CLOSED_FENCE_RE = /^ {0,3}(`{3,}|~{3,}).*\n[\s\S]*\n {0,3}\1[ \t]*\n*$/
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/
/** A paragraph that is only the start of an ordered-list marker (`2`, `10`):
 *  the next chunk may complete it (`2. item`). Bullet markers need no rule —
 *  a lone `-`, `*` or `+` already lexes as a list item. */
const PARTIAL_ORDERED_MARKER_RE = /^ {0,3}\d{1,9}$/
const LINK_REFERENCE_RE = /\[[^\]\n]+\]\[[^\]\n]*\]/
const SHORTCUT_REFERENCE_RE = /\[[^\]\n]+\](?![[(])/ // Excludes inline links/images and full refs
const REFERENCE_DEFINITION_RE = /^\s{0,3}\[[^\]\n]+\]:/m
const REGEXP_SPECIAL_RE = /[.*+?^${}()|[\]\\]/g
const WHITESPACE_RUN_RE = /\s+/g

/**
 * The targeted definition re-lex (see `parseDefinitionUpdate`) only pays off
 * when it skips most of the document; at or above this share of the source,
 * a plain full re-lex is simpler and no slower.
 */
const MAX_TARGETED_RELEX_SHARE = 0.5

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
 * A `[label]:` anywhere in text — a superset of marked's definition syntax
 * (which also allows nesting in blockquotes and list items), used to bound
 * which labels an appended tail can define before it is lexed.
 */
const DEFINITION_LABEL_RE = /\[((?:\\[\s\S]|[^[\]\\])+)\]:/g

/** Non-global form of `DEFINITION_LABEL_RE` for a stateless `test`. */
const DEFINITION_MARKER_RE = new RegExp(DEFINITION_LABEL_RE.source)

const createLinkMap = (): LinkMap => Object.create(null) as LinkMap

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

    /** Cached reference-syntax facts for `prevSource`. These avoid scanning
     * the accumulated stream on every append. */
    private prevHasPotentialReferenceUse = false
    private prevHasReferenceDefinition = false

    /** Normalized source text per stable root, for label-use search. Roots
     * are reused objects at fixed offsets, so each is normalized once. */
    private normalizedRootText = new WeakMap<Token, string>()

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
     * True for an HTML opening tag whose actual source span is unknown.
     * After token cleanup, closed HTML tokens keep children on `.tokens`
     * and record their full source span as `sourceLength`. Unclosed HTML
     * openings have neither a full span nor a closing tag yet, so serving
     * them as a stable tail-window prefix would corrupt the offset math.
     */
    private hasHtmlSpanMismatch = (token: Token): boolean => {
        if (token.type !== 'html') return false
        const html = token as HtmlToken
        if (html.sourceLength != null) return false
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
     * definition exists; pair it with {@link hasReferenceDefinition} for that.
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
     * True when `source` contains a link reference definition line
     * (`[label]: url`). A definition can retroactively change how reference
     * uses elsewhere in the document render, which is what makes it relevant
     * to tail-window safety.
     *
     * @param source - Markdown source to scan
     * @returns `true` if a reference definition line is present
     * @example
     * ```typescript
     * this.hasReferenceDefinition('[docs]: /docs')  // true
     * this.hasReferenceDefinition('see [docs]')     // false
     * ```
     */
    private hasReferenceDefinition = (source: string): boolean => {
        if (!source.includes('[') || !source.includes(']')) return false
        return REFERENCE_DEFINITION_RE.test(source)
    }

    /**
     * True when an append-only update newly introduces text accepted by
     * `matches`. Reference uses and definitions cannot span newlines, so a
     * token split across the append boundary can only complete on the line
     * that straddles it; checking the appended slice plus that single boundary
     * line catches every case without rescanning the accumulated source.
     * Assumes `source` starts with `prevSource` — callers guard the non-append
     * case. (The one unbounded input is a document streamed as a single
     * newline-free line, where the boundary line grows with the document.)
     *
     * Detects NEW matches only: a boundary line that already matched before
     * the append returns `false` even if the append extends it. Callers that
     * need "the append touches a match" (e.g. a reference definition whose
     * URL is still streaming) must check the boundary line themselves, as
     * `appendTouchesReferenceDefinition` does for `update`.
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
     * True when an append-only update adds a reference definition or extends
     * one on the boundary line (the last, possibly partial line of
     * `prevSource`). Unlike `appendIntroducesMatch` alone, a boundary line
     * that was already a definition before the append still counts, so a
     * definition whose URL or title is streaming in is detected on every
     * chunk. An append that begins with a line break leaves the boundary line
     * unchanged and is not an extension. Only the appended text and the
     * boundary line are scanned. Assumes `source` starts with `prevSource`.
     *
     * @param source - Full source string for an append-only update
     * @returns `true` if the append adds or extends a reference definition
     * @example
     * ```typescript
     * // prevSource === 'See [ref].\n\n[ref]: https'
     * this.appendTouchesReferenceDefinition('See [ref].\n\n[ref]: https:') // true
     * ```
     */
    private appendTouchesReferenceDefinition = (source: string): boolean => {
        if (this.appendIntroducesMatch(source, this.hasReferenceDefinition)) return true
        const firstAppended = source.charAt(this.prevSource.length)
        if (firstAppended === '' || firstAppended === '\n' || firstAppended === '\r') {
            return false
        }
        const lineStart = this.prevSource.lastIndexOf('\n') + 1
        return this.hasReferenceDefinition(source.slice(lineStart))
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
     * True when appending to `prevSource` introduces a reference definition
     * that was not already present. Definitions can arrive wholly in the
     * appended slice or be completed across the append boundary, such as
     * `[do` followed by `cs]: /docs`. Returns false for any update that is not
     * a pure append of `prevSource`.
     *
     * @param source - The full new source, expected to start with `prevSource`
     * @returns `true` if the appended update adds a reference definition
     * @example
     * ```typescript
     * // prevSource === '[do'
     * this.hasNewReferenceDefinition('[docs]: /d') // true
     * ```
     */
    private hasNewReferenceDefinition = (source: string): boolean => {
        if (!source.startsWith(this.prevSource)) return false
        return this.appendIntroducesMatch(source, this.hasReferenceDefinition)
    }

    /**
     * True when a reference definition arriving in the appended tail can
     * retroactively change how existing reference-style uses in the stable
     * prefix render — the one case where an append-only stream is not safe
     * to serve incrementally. This is the standalone form used as
     * `canUseTailWindow`'s default argument; the hot path in `update` computes
     * the same value inline (reusing `appendAddsDefinition`) so the boundary
     * scan runs a single time per update.
     *
     * @param source - The full new source string for this update
     * @returns `true` if a newly appended definition can change how the reused
     *   prefix renders, meaning the tail window must be bypassed
     * @example
     * ```typescript
     * // prevSource === 'see [docs]\n\n' (a shortcut use already rendered)
     * this.appendedDefinitionInvalidatesTail('see [docs]\n\n[docs]: /d') // true
     * ```
     */
    private appendedDefinitionInvalidatesTail = (source: string): boolean =>
        this.prevHasPotentialReferenceUse && this.hasNewReferenceDefinition(source)

    /**
     * Decides whether an update may reuse the stable token prefix and re-lex
     * only the appended tail (`boundary.reparseOffset` onward) instead of the
     * whole document. Returns false whenever that shortcut could diverge from a
     * full parse: caller parser hooks are active, the update is not append-only,
     * the boundary is empty, or reference syntax straddles the prefix/tail split
     * in a way a tail-only re-lex cannot resolve.
     *
     * @param source - The full new source string for this update
     * @param boundary - The stable-prefix boundary from `getTailWindowBoundary`
     * @param isAppendOnly - Precomputed append-only fact from `update`; direct
     *   helper callers may omit it to compute the same fact locally
     * @param referenceInvalidatesTail - Precomputed reference-safety flag;
     *   defaults to `appendedDefinitionInvalidatesTail(source)` for standalone
     *   callers that have not computed it already
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
        isAppendOnly = this.isAppendOnlyUpdate(source),
        referenceInvalidatesTail = this.appendedDefinitionInvalidatesTail(source)
    ): boolean => {
        if (this.tailWindowDisabled) return false
        if (this.prevSource === '' || this.prevTokens.length === 0) return false
        if (!isAppendOnly) return false
        // The cached boundary is already empty on a length mismatch; checked
        // here too so a boundary from elsewhere cannot bypass the guard.
        if (boundary.reparseOffset <= 0 || this.prevHasLengthMismatch) return false
        if (referenceInvalidatesTail) return false

        // A reference definition living in the reused prefix is invisible to a
        // tail-only re-lex (marked's link map is per-lex), so any reference use
        // in the tail slice would render unresolved. The cached definition flag
        // keeps definition-free streams on the cheap path.
        if (this.prevHasReferenceDefinition) {
            const tail = source.slice(boundary.reparseOffset)
            if (this.hasPotentialReferenceUseOutsideDefinitions(tail)) {
                return false
            }
        }

        return true
    }

    /**
     * Parses an append that adds or extends a reference definition while
     * reference uses exist, re-lexing only what the definition can change:
     *
     * 1. The appended tail, with a lexer seeded with the definitions of the
     *    stable prefix (so tail uses resolve and a duplicate label keeps the
     *    first definition, as in a full lex).
     * 2. Each prefix root that uses a label whose definition changed (added,
     *    removed, or a different href/title vs the tail it replaces), seeded
     *    with the complete map.
     *
     * Every other prefix root is kept as-is. Candidate roots are found BEFORE
     * any lexing, from a superset of the possibly-changed labels (definition
     * labels in the previous tail's tokens plus every `[label]:` in the new
     * tail source), so a fallback never wastes a partial lex. Returns
     * `undefined` — the caller then does a full re-lex — whenever the
     * shortcut could diverge from a full parse or would not save work: the
     * tail plus candidate roots reach `MAX_TARGETED_RELEX_SHARE` of the
     * source, a candidate root contains a `[label]:` definition marker, a re-lexed root
     * does not reproduce exactly one root with the same type and raw, the
     * prefix offsets do not add up, or a changed label escaped the superset.
     *
     * @param source - Full source for this append-only update
     * @param boundary - Stable-prefix boundary (non-empty)
     * @returns The spliced tokens, or `undefined` to fall back to a full re-lex
     * @example
     * ```typescript
     * // prevSource === 'See [a].\n\nPlain.\n\n'
     * this.parseDefinitionUpdate('See [a].\n\nPlain.\n\n[a]: /x', boundary)
     * // re-lexes the tail and 'See [a].' only
     * ```
     */
    private parseDefinitionUpdate = (
        source: string,
        boundary: TailWindowBoundary
    ): ParseSourceResult | undefined => {
        const tailSource = source.slice(boundary.reparseOffset)
        const maxRelexedLength = source.length * MAX_TARGETED_RELEX_SHARE
        if (tailSource.length >= maxRelexedLength) return undefined

        const previousTailLinks = collectDefinitions(
            this.prevTokens.slice(boundary.prefixCount),
            createLinkMap()
        )
        const possibleLabels = new Set(Object.keys(previousTailLinks))
        for (const match of tailSource.matchAll(DEFINITION_LABEL_RE)) {
            possibleLabels.add(normalizeReferenceText(match[1].trim()))
        }
        const prefixRoots = this.prevTokens.slice(0, boundary.prefixCount)
        const candidates = this.findCitingRoots(
            source,
            prefixRoots,
            [...possibleLabels],
            boundary,
            maxRelexedLength - tailSource.length
        )
        if (!candidates) return undefined

        const prefixLinks = collectDefinitions(prefixRoots, createLinkMap())
        const tailTokens = lexAndClean(tailSource, this.options, false, prefixLinks)
        const tailLinks = collectDefinitions(tailTokens, createLinkMap())
        const changedLabels = getChangedLabels(previousTailLinks, tailLinks, prefixLinks)
        if (changedLabels.some((label) => !possibleLabels.has(label))) return undefined
        // Earlier definitions win: prefix entries override tail entries.
        const links = Object.assign(createLinkMap(), tailLinks, prefixLinks)

        const roots = this.relexCitingRoots(prefixRoots, candidates, changedLabels, links)
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
            hasLengthMismatch: this.sumSourceLength(tailTokens) !== tailSource.length
        }
    }

    /**
     * Finds the stable prefix roots whose source uses any of `labels`,
     * without lexing. Offsets are summed over the prefix and must land on
     * `boundary.reparseOffset`.
     *
     * @param source - Full source for this update
     * @param prefixRoots - Stable prefix roots from the previous parse
     * @param labels - Normalized labels that may have changed
     * @param boundary - Stable-prefix boundary the roots end at
     * @param maxLength - Source characters the candidates may span in total
     * @returns Candidate roots with their source, or `undefined` to fall back
     * @example
     * ```typescript
     * this.findCitingRoots(source, prefixRoots, ['a'], boundary, source.length / 2)
     * ```
     */
    private findCitingRoots = (
        source: string,
        prefixRoots: Token[],
        labels: string[],
        boundary: TailWindowBoundary,
        maxLength: number
    ): CitingRoot[] | undefined => {
        const matchers = labels.map(createLabelUseMatcher)
        const candidates: CitingRoot[] = []
        let candidateLength = 0
        let offset = 0
        for (let index = 0; index < prefixRoots.length; index++) {
            const root = prefixRoots[index]
            const start = offset
            offset += this.getTokenSourceLength(root)
            if (matchers.length === 0 || REFERENCE_INERT_ROOT_TYPES.has(root.type)) continue
            const text = this.getNormalizedRootText(root, source, start, offset)
            if (!matchers.some((matcher) => matcher.test(text))) continue

            const rootSource = source.slice(start, offset)
            candidateLength += rootSource.length
            if (candidateLength >= maxLength) return undefined
            // A definition inside the root (possibly nested in a blockquote
            // or list item) would be dropped by a lexer seeded with it.
            if (DEFINITION_MARKER_RE.test(rootSource)) return undefined
            candidates.push({ index, source: rootSource, text })
        }
        return offset === boundary.reparseOffset ? candidates : undefined
    }

    /**
     * Re-lexes, with the complete link map, each candidate root that uses a
     * label whose definition actually changed; see `parseDefinitionUpdate`.
     *
     * @param prefixRoots - Stable prefix roots from the previous parse
     * @param candidates - Roots that use a possibly-changed label
     * @param changedLabels - Normalized labels whose definition changed
     * @param links - The complete definition map for the current source
     * @returns Prefix roots with citing roots replaced (the input array when
     *   none changed), or `undefined` to fall back to a full re-lex
     * @example
     * ```typescript
     * this.relexCitingRoots(prefixRoots, candidates, ['a'], links)
     * ```
     */
    private relexCitingRoots = (
        prefixRoots: Token[],
        candidates: CitingRoot[],
        changedLabels: string[],
        links: LinkMap
    ): Token[] | undefined => {
        const matchers = changedLabels.map(createLabelUseMatcher)
        let roots: Token[] | undefined
        for (const candidate of candidates) {
            if (!matchers.some((matcher) => matcher.test(candidate.text))) continue
            const root = prefixRoots[candidate.index]
            const relexed = lexAndClean(candidate.source, this.options, false, links)
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
     * True when an update that invalidates the tail because of a reference
     * definition may take the targeted re-lex instead of a full one.
     *
     * @param boundary - Stable-prefix boundary for this update
     * @param isAppendOnly - Whether the update is a pure append
     * @param referenceInvalidatesTail - Whether a definition invalidates the tail
     * @returns `true` if `parseDefinitionUpdate` may be attempted
     * @example
     * ```typescript
     * if (this.canTargetDefinitionUpdate(boundary, true, true)) { ... }
     * ```
     */
    private canTargetDefinitionUpdate = (
        boundary: TailWindowBoundary,
        isAppendOnly: boolean,
        referenceInvalidatesTail: boolean
    ): boolean =>
        referenceInvalidatesTail &&
        isAppendOnly &&
        !this.tailWindowDisabled &&
        this.prevTokens.length > 0 &&
        boundary.reparseOffset > 0 &&
        !this.prevHasLengthMismatch

    /**
     * Re-lexes the whole source; the fallback for every update the tail
     * window or the targeted definition path cannot serve.
     *
     * @param source - Full source for this update
     * @returns A full-parse result (no reused prefix)
     * @example
     * ```typescript
     * this.parseFullSource('# A\n\nB') // { tokens: [heading, space, paragraph], usedTailWindow: false, ... }
     * ```
     */
    private parseFullSource = (source: string): ParseSourceResult => {
        const tokens = lexAndClean(source, this.options, false)
        return {
            tokens,
            tailTokens: [],
            usedTailWindow: false,
            reusedPrefixCount: 0,
            // The lex was already O(document), so the full sum adds no order.
            hasLengthMismatch: this.sumSourceLength(tokens) !== source.length
        }
    }

    private parseSource = (
        source: string,
        boundary: TailWindowBoundary,
        isAppendOnly: boolean,
        referenceInvalidatesTail: boolean
    ): ParseSourceResult => {
        if (this.canTargetDefinitionUpdate(boundary, isAppendOnly, referenceInvalidatesTail)) {
            const targeted = this.parseDefinitionUpdate(source, boundary)
            if (targeted) return targeted
        }

        if (!this.canUseTailWindow(source, boundary, isAppendOnly, referenceInvalidatesTail)) {
            return this.parseFullSource(source)
        }

        const tailTokens = lexAndClean(source.slice(boundary.reparseOffset), this.options, false)
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
            // construction, so only the tail needs to add up. The tail was
            // lexed from a true block boundary, so these tokens are correct
            // for THIS update even on a mismatch; the flag keeps the NEXT
            // update off the tail window, whose offsets would be wrong.
            hasLengthMismatch:
                this.sumSourceLength(tailTokens) !== source.length - boundary.reparseOffset
        }
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
        // A trailing `space` does not close a list or indented code block;
        // pull that block into the tail too (one extra token — still O(1)
        // per append).
        if (
            cut > 0 &&
            tokens[cut].type === 'space' &&
            this.canContinueAcrossBlankLine(tokens[cut - 1])
        ) {
            cut--
            reparseOffset -= this.getTokenSourceLength(tokens[cut])
        } else if (
            // Same rule with an open block after the blank line: in
            // `list space paragraph("2")` the paragraph may still become a
            // list item once its marker completes (`2` -> `2. second`), so
            // the list before the blank line is not closed yet. Pull the
            // `space` and the list into the tail too (at most three tokens
            // inspected — no scan). Only a paragraph that is nothing but a
            // partial marker qualifies: any other text after the blank line
            // (`Tail`) has already closed the list, and holding the list in
            // the tail for the whole paragraph would re-lex it every chunk.
            // Once the block after the blank line is followed by another
            // token it is a real separate block and the list joins the prefix.
            cut > 1 &&
            tokens[cut].type === 'paragraph' &&
            PARTIAL_ORDERED_MARKER_RE.test(tokens[cut].raw) &&
            tokens[cut - 1].type === 'space' &&
            this.canContinueAcrossBlankLine(tokens[cut - 2])
        ) {
            cut -= 2
            reparseOffset -=
                this.getTokenSourceLength(tokens[cut + 1]) + this.getTokenSourceLength(tokens[cut])
        }
        return { prefixCount: cut, reparseOffset }
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
     * @param appendAddsDefinition - Whether the append introduced a reference
     *   definition, already computed by `update` so the boundary scan is not
     *   repeated here
     * @returns Nothing; updates `prevSource`, `prevTokens`, and cached flags
     * @example
     * ```typescript
     * this.updateCachedState(source, parseResult, isAppendOnly, appendAddsDefinition)
     * ```
     */
    private updateCachedState = (
        source: string,
        parseResult: ParseSourceResult,
        isAppendOnly: boolean,
        appendAddsDefinition: boolean
    ): void => {
        // HTML-span-mismatch keys on `usedTailWindow` (a fact about the tokens,
        // recomputed whenever the tail window is bypassed), while the reference
        // facts key on `isAppendOnly` (facts about the source, which accumulate
        // monotonically under a pure append regardless of parse strategy).
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
        this.prevHasReferenceDefinition = isAppendOnly
            ? this.prevHasReferenceDefinition || appendAddsDefinition
            : this.hasReferenceDefinition(source)

        this.prevSource = source
        this.prevTokens = parseResult.tokens
        this.prevHasHtmlSpanMismatch = hasHtmlSpanMismatch
        this.prevHasLengthMismatch = hasLengthMismatch
        this.prevTailWindowBoundary = this.getNextTailWindowBoundary(
            parseResult.tokens,
            source.length,
            hasHtmlSpanMismatch || hasLengthMismatch
        )
    }

    /**
     * Reference definitions can change inline children without changing raw,
     * so definitions alongside reference-style uses require a full rerender.
     * Append-only updates reuse the invalidation flag computed during parsing
     * to avoid rescanning the accumulated source. Other edits check both sources.
     */
    private isReferenceSensitiveUpdate = (
        source: string,
        isAppendOnly: boolean,
        referenceInvalidatesTail: boolean
    ): boolean =>
        isAppendOnly
            ? referenceInvalidatesTail
            : (this.prevHasReferenceDefinition || this.hasReferenceDefinition(source)) &&
              (this.hasPotentialReferenceUse(this.prevSource) ||
                  this.hasPotentialReferenceUse(source))

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
        // Whether this append introduces a reference definition. Both the
        // tail-window decision (via `referenceInvalidatesTail`) and the cached
        // -state refresh need it, so compute the boundary scan once here. When
        // `prevSource` is empty this is the first update, where no cached use
        // exists yet, so `referenceInvalidatesTail` is false either way.
        // A definition whose URL/title is still streaming changes how prefix
        // references resolve on every chunk, not only on the chunk that
        // completed `]:`. Treat any append that extends a definition on the
        // boundary line as adding one. An append starting with a line break
        // leaves the boundary line untouched, so it is not an extension.
        const appendAddsDefinition = isAppendOnly && this.appendTouchesReferenceDefinition(source)
        const referenceInvalidatesTail = this.prevHasPotentialReferenceUse && appendAddsDefinition
        const parseResult = this.parseSource(
            source,
            boundary,
            isAppendOnly,
            referenceInvalidatesTail
        )
        const newTokens = parseResult.tokens

        // Apply walkTokens if configured
        if (typeof this.options.walkTokens === 'function') {
            for (const token of newTokens) {
                // Incremental parsing is sync; async callbacks use the async parse path.
                void this.options.walkTokens(token)
            }
        }

        const referenceSensitive = this.isReferenceSensitiveUpdate(
            source,
            isAppendOnly,
            referenceInvalidatesTail
        )
        const canReuse = isAppendOnly && !referenceSensitive
        const reuseMode: StreamingReuseMode = canReuse ? 'prefix' : isAppendOnly ? 'tree' : 'none'

        // Reference-sensitive updates report no stable prefix: inline children
        // may differ without `raw` changing. In tree mode the offset is
        // `undefined` so the consumer walks all render metadata.
        const { divergeAt, divergeOffset } = referenceSensitive
            ? { divergeAt: 0, divergeOffset: reuseMode === 'tree' ? undefined : 0 }
            : this.findDivergence(newTokens, parseResult, boundary)

        this.updateCachedState(source, parseResult, isAppendOnly, appendAddsDefinition)
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
