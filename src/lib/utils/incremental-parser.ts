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

    private getTokenSourceLength = (token: Token): number => {
        return (token as Token & { sourceLength?: number }).sourceLength ?? token.raw.length
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

    private hasPotentialReferenceUse = (source: string): boolean => {
        if (!source.includes('[') || !source.includes(']')) return false

        return LINK_REFERENCE_RE.test(source) || SHORTCUT_REFERENCE_RE.test(source)
    }

    private hasReferenceDefinition = (source: string): boolean => {
        if (!source.includes('[') || !source.includes(']')) return false
        return REFERENCE_DEFINITION_RE.test(source)
    }

    private hasNewReferenceDefinition = (source: string): boolean => {
        if (!source.startsWith(this.prevSource)) return false
        return this.hasReferenceDefinition(source.slice(this.prevSource.length))
    }

    private canUseTailWindow = (source: string, boundary: TailWindowBoundary): boolean => {
        if (this.tailWindowDisabled) return false
        if (this.prevSource === '' || this.prevTokens.length === 0) return false
        if (!source.startsWith(this.prevSource)) return false
        if (boundary.reparseOffset <= 0) return false

        if (
            this.hasPotentialReferenceUse(this.prevSource) &&
            this.hasNewReferenceDefinition(source)
        ) {
            return false
        }

        return true
    }

    private parseSource = (source: string, boundary: TailWindowBoundary): Token[] => {
        if (!this.canUseTailWindow(source, boundary)) {
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
        const newTokens = this.parseSource(source, boundary)

        // Apply walkTokens if configured
        if (typeof this.options.walkTokens === 'function') {
            newTokens.forEach(this.options.walkTokens)
        }

        // Reference definitions can change inline children without changing raw,
        // so force a full rerender when definitions are present alongside
        // reference-style uses. Shortcut-looking text alone stays reusable.
        const isAppendOnly = this.prevSource !== '' && source.startsWith(this.prevSource)
        const referenceSensitive = isAppendOnly
            ? this.hasPotentialReferenceUse(this.prevSource) &&
              this.hasNewReferenceDefinition(source)
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
