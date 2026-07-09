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
import type { Token } from '$lib/utils/markdown-parser.js'
import { lexAndClean } from '$lib/utils/parse-and-cache.js'

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
}

const CLOSED_FENCE_RE = /^ {0,3}(`{3,}|~{3,}).*\n[\s\S]*\n {0,3}\1[ \t]*\n*$/
const LINK_REFERENCE_RE = /\[[^\]\n]+\]\[[^\]\n]*\]/
const SHORTCUT_REFERENCE_RE = /\[[^\]\n]+\](?![[(])/ // Excludes inline links/images and full refs
const REFERENCE_DEFINITION_RE = /^\s{0,3}\[[^\]\n]+\]:/m

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

    /** Cached boundary for the next append-only update. Computed when
     * parser state is committed so `getTailWindowBoundary` stays O(1). */
    private prevTailWindowBoundary: TailWindowBoundary = { prefixCount: 0, reparseOffset: 0 }

    /** Cached reference-syntax facts for `prevSource`. These avoid scanning
     * the accumulated stream on every append. */
    private prevHasPotentialReferenceUse = false
    private prevHasReferenceDefinition = false

    /**
     * Creates a new incremental parser instance.
     *
     * @param options - Svelte markdown parser options forwarded to Marked's Lexer
     */
    constructor(options: SvelteMarkdownOptions) {
        this.options = options

        const exts = (options as Record<string, unknown>).extensions as
            { block?: unknown[]; inline?: unknown[] } | undefined
        const hasExtensionTokenizers =
            (exts?.block != null && exts.block.length > 0) ||
            (exts?.inline != null && exts.inline.length > 0)

        this.tailWindowDisabled =
            typeof options.walkTokens === 'function' ||
            options.tokenizer != null ||
            hasExtensionTokenizers
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
        if (!html.tag) return false
        if (html.raw.endsWith('/>')) return false
        if (html.raw.startsWith('</')) return false
        return html.sourceLength == null
    }

    /**
     * Source characters this token consumed. Closed HTML tokens record
     * their full span as `sourceLength` during cleanup; every other token's
     * `.raw` already equals its source span, so we fall back to `raw.length`.
     */
    private getTokenSourceLength = (token: Token): number => {
        return (token as HtmlToken).sourceLength ?? token.raw.length
    }

    private isStableAtSourceEnd = (token: Token): boolean => {
        if (token.type === 'space') return false
        if (token.raw.endsWith('\n\n')) return true

        switch (token.type) {
            case 'heading':
            case 'hr':
                return token.raw.endsWith('\n')
            case 'code':
                return CLOSED_FENCE_RE.test(token.raw)
            default:
                return false
        }
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
     *
     * @param source - The full new source string for this update
     * @returns `true` if this update only appends to `prevSource`
     * @example
     * ```typescript
     * // prevSource === '# A\n\nB'
     * this.isAppendOnlyUpdate('# A\n\nB\n\nC') // true
     * this.isAppendOnlyUpdate('# A\n\nX') // false (diverges from prevSource)
     * ```
     */
    private isAppendOnlyUpdate = (source: string): boolean =>
        this.prevSource !== '' && source.startsWith(this.prevSource)

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
        if (boundary.reparseOffset <= 0) return false
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

    private parseSource = (
        source: string,
        boundary: TailWindowBoundary,
        isAppendOnly: boolean,
        referenceInvalidatesTail: boolean
    ): ParseSourceResult => {
        if (!this.canUseTailWindow(source, boundary, isAppendOnly, referenceInvalidatesTail)) {
            return {
                tokens: lexAndClean(source, this.options, false),
                tailTokens: [],
                usedTailWindow: false
            }
        }

        const tailTokens = lexAndClean(source.slice(boundary.reparseOffset), this.options, false)
        return {
            tokens: [...this.prevTokens.slice(0, boundary.prefixCount), ...tailTokens],
            tailTokens,
            usedTailWindow: true
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
     * @param hasHtmlSpanMismatch - Whether any current token has an unknown
     *   source span
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
        hasHtmlSpanMismatch: boolean
    ): TailWindowBoundary => {
        // (#291) If any token is an HTML opening with no known source span,
        // the tail-window prefix is unsound: `.raw` is only the opening tag
        // itself, while children and the closing tag live elsewhere. Closed
        // HTML tokens carry `sourceLength`, so only truly partial HTML forces
        // the empty boundary that falls through to a full re-parse.
        if (tokens.length === 0 || hasHtmlSpanMismatch) {
            return { prefixCount: 0, reparseOffset: 0 }
        }

        const lastToken = tokens[tokens.length - 1]
        if (this.isStableAtSourceEnd(lastToken)) {
            return { prefixCount: tokens.length, reparseOffset: sourceLength }
        }

        return {
            prefixCount: tokens.length - 1,
            reparseOffset: sourceLength - this.getTokenSourceLength(lastToken)
        }
    }

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
        this.prevTailWindowBoundary = this.getNextTailWindowBoundary(
            parseResult.tokens,
            source.length,
            hasHtmlSpanMismatch
        )
    }

    /**
     * Parses the full source and diffs against the previous result.
     *
     * @param source - The full accumulated markdown source string
     * @returns The new tokens and the index where they diverge from the previous parse
     */
    update = (source: string): IncrementalUpdateResult => {
        const boundary = this.getTailWindowBoundary()
        const isAppendOnly = this.isAppendOnlyUpdate(source)
        // Whether this append introduces a reference definition. Both the
        // tail-window decision (via `referenceInvalidatesTail`) and the cached
        // -state refresh need it, so compute the boundary scan once here. When
        // `prevSource` is empty this is the first update, where no cached use
        // exists yet, so `referenceInvalidatesTail` is false either way.
        const appendAddsDefinition =
            isAppendOnly && this.appendIntroducesMatch(source, this.hasReferenceDefinition)
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

        // Reference definitions can change inline children without changing raw,
        // so force a full rerender when definitions are present alongside
        // reference-style uses. Shortcut-looking text alone stays reusable.
        // The append-only case reuses `referenceInvalidatesTail` computed above.
        const referenceSensitive = isAppendOnly
            ? referenceInvalidatesTail
            : (this.prevHasReferenceDefinition || this.hasReferenceDefinition(source)) &&
              (this.hasPotentialReferenceUse(this.prevSource) ||
                  this.hasPotentialReferenceUse(source))
        const canReuse = isAppendOnly && !referenceSensitive

        // Find first divergence point. We compare `.raw` for fast equality,
        // and for html tokens we also check the structural shape — an
        // unclosed `<div>` and a closed `<div>...</div>` both have
        // `raw === '<div>'` but very different `.tokens` children. Without
        // this check the streaming consumer would never see the partial-
        // to-closed transition. See #291.
        let divergeAt = 0
        let divergeOffset = parseResult.usedTailWindow ? boundary.reparseOffset : undefined
        if (!referenceSensitive) {
            const minLen = Math.min(this.prevTokens.length, newTokens.length)
            while (divergeAt < minLen) {
                const prev = this.prevTokens[divergeAt]
                const next = newTokens[divergeAt]
                if (prev.raw !== next.raw) break
                if (prev.type === 'html' && next.type === 'html') {
                    const prevKids = (prev as HtmlToken).tokens
                    const nextKids = (next as HtmlToken).tokens
                    if ((prevKids === undefined) !== (nextKids === undefined)) break
                    if (prevKids && nextKids && prevKids.length !== nextKids.length) break
                }
                if (
                    parseResult.usedTailWindow &&
                    divergeOffset !== undefined &&
                    divergeAt >= boundary.prefixCount
                ) {
                    divergeOffset += this.getTokenSourceLength(next)
                }
                divergeAt++
            }
        }

        this.updateCachedState(source, parseResult, isAppendOnly, appendAddsDefinition)
        return { tokens: newTokens, divergeAt, divergeOffset, canReuse }
    }
}
