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
        if (this.prevTokens.length === 0) {
            return { prefixCount: 0, reparseOffset: 0 }
        }

        // (#291) If any previous HTML opening has no known source span,
        // the tail-window prefix is unsound: `.raw` is only the opening
        // tag itself, while children and the closing tag live elsewhere.
        // Closed HTML tokens carry `sourceLength`, so only truly partial
        // HTML needs to fall through to a full re-parse.
        if (this.prevHasHtmlSpanMismatch) {
            return { prefixCount: 0, reparseOffset: 0 }
        }

        let offset = 0
        for (let i = 0; i < this.prevTokens.length - 1; i++) {
            offset += this.getTokenSourceLength(this.prevTokens[i])
        }

        const lastToken = this.prevTokens[this.prevTokens.length - 1]

        if (this.isStableAtSourceEnd(lastToken)) {
            return {
                prefixCount: this.prevTokens.length,
                reparseOffset: this.prevSource.length
            }
        }

        return {
            prefixCount: this.prevTokens.length - 1,
            reparseOffset: offset
        }
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
     * True when appending to `prevSource` introduces a reference definition
     * that was not already present — i.e. the definition lives entirely in the
     * newly appended tail. Returns false for any update that is not a pure
     * append of `prevSource`.
     *
     * @param source - The full new source, expected to start with `prevSource`
     * @returns `true` if the appended tail contains a new reference definition
     * @example
     * ```typescript
     * // prevSource === 'see [docs]\n\n'
     * this.hasNewReferenceDefinition('see [docs]\n\n[docs]: /d')  // true
     * this.hasNewReferenceDefinition('see [docs]\n\nmore text')   // false
     * ```
     */
    private hasNewReferenceDefinition = (source: string): boolean => {
        if (!source.startsWith(this.prevSource)) return false
        return this.hasReferenceDefinition(source.slice(this.prevSource.length))
    }

    /**
     * True when a reference definition arriving in the appended tail can
     * retroactively change how existing reference-style uses in the stable
     * prefix render — the one case where an append-only stream is not safe
     * to serve incrementally. Computed once per `update` and threaded through
     * `parseSource`/`canUseTailWindow` so the hot path evaluates it a single
     * time rather than recomputing the regexes for both the tail-window
     * decision and the reuse decision.
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
        this.hasPotentialReferenceUse(this.prevSource) && this.hasNewReferenceDefinition(source)

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
        referenceInvalidatesTail = this.appendedDefinitionInvalidatesTail(source)
    ): boolean => {
        if (this.tailWindowDisabled) return false
        if (this.prevSource === '' || this.prevTokens.length === 0) return false
        if (!source.startsWith(this.prevSource)) return false
        if (boundary.reparseOffset <= 0) return false
        if (referenceInvalidatesTail) return false

        // A reference definition living in the reused prefix is invisible to a
        // tail-only re-lex (marked's link map is per-lex), so any reference use
        // in the tail slice would render unresolved. `]:` is the cheap, no-alloc
        // prefilter for "a definition marker exists at all" — task lists and
        // bare citations never hit it, so the O(n) slice + regex is paid only by
        // documents that actually carry reference definitions.
        if (this.prevSource.includes(']:')) {
            const prefix = source.slice(0, boundary.reparseOffset)
            const tail = source.slice(boundary.reparseOffset)
            if (this.hasReferenceDefinition(prefix) && this.hasPotentialReferenceUse(tail)) {
                return false
            }
        }

        return true
    }

    private parseSource = (
        source: string,
        boundary: TailWindowBoundary,
        referenceInvalidatesTail: boolean
    ): Token[] => {
        if (!this.canUseTailWindow(source, boundary, referenceInvalidatesTail)) {
            return lexAndClean(source, this.options, false)
        }

        const tailTokens = lexAndClean(source.slice(boundary.reparseOffset), this.options, false)
        return [...this.prevTokens.slice(0, boundary.prefixCount), ...tailTokens]
    }

    /**
     * Parses the full source and diffs against the previous result.
     *
     * @param source - The full accumulated markdown source string
     * @returns The new tokens and the index where they diverge from the previous parse
     */
    update = (source: string): IncrementalUpdateResult => {
        const boundary = this.getTailWindowBoundary()
        const referenceInvalidatesTail = this.appendedDefinitionInvalidatesTail(source)
        const newTokens = this.parseSource(source, boundary, referenceInvalidatesTail)

        // Apply walkTokens if configured
        if (typeof this.options.walkTokens === 'function') {
            newTokens.forEach(this.options.walkTokens)
        }

        // Reference definitions can change inline children without changing raw,
        // so force a full rerender when definitions are present alongside
        // reference-style uses. Shortcut-looking text alone stays reusable.
        // The append-only case reuses `referenceInvalidatesTail` computed above.
        const isAppendOnly = this.prevSource !== '' && source.startsWith(this.prevSource)
        const referenceSensitive = isAppendOnly
            ? referenceInvalidatesTail
            : (this.hasReferenceDefinition(this.prevSource) ||
                  this.hasReferenceDefinition(source)) &&
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
                divergeAt++
            }
        }

        this.prevSource = source
        this.prevTokens = newTokens
        this.prevHasHtmlSpanMismatch = newTokens.some(this.hasHtmlSpanMismatch)
        return { tokens: newTokens, divergeAt, canReuse }
    }
}
