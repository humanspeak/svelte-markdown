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

    /** True iff any token in `prevTokens` is an HTML opening (closed or
     *  unclosed) whose `.raw` is shorter than its actual source span. The
     *  tail-window's sum-of-raws offset arithmetic only works when token
     *  raws sum to the source length; this flag detects when that
     *  invariant is broken so we fall through to a full re-parse. Cached
     *  to keep `getTailWindowBoundary` O(1) on the hot path. */
    private prevHasHtmlSpanMismatch = false

    /**
     * Creates a new incremental parser instance.
     *
     * @param options - Svelte markdown parser options forwarded to Marked's Lexer
     */
    constructor(options: SvelteMarkdownOptions) {
        this.options = options

        const exts = (options as Record<string, unknown>).extensions as
            | { block?: unknown[]; inline?: unknown[] }
            | undefined
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

        // (#291) If any prev token is an HTML opening (closed or
        // unclosed), the tail-window prefix is unsound: our offset
        // accounting sums token raws, but an html opening token's
        // `.raw` is only the opening tag itself — children and closing
        // tag are tracked separately on `.tokens`. Sum-of-raws therefore
        // underestimates the true source position once any html block
        // has been parsed, so we fall through to a full re-parse
        // instead of serving a corrupt prefix.
        if (this.prevHasHtmlSpanMismatch) {
            return { prefixCount: 0, reparseOffset: 0 }
        }

        let offset = 0
        for (let i = 0; i < this.prevTokens.length - 1; i++) {
            offset += this.prevTokens[i].raw.length
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
     * True for an HTML opening tag whose `.raw` is shorter than its
     * actual source span. After token-cleanup, a non-self-closing html
     * opening token's `.raw` is only the opening tag itself (e.g.
     * `<div>`); its children and closing tag (if any) live on
     * `.tokens`. The tail-window's `reparseOffset = sum(raws)` math is
     * unsound any time such a token sits in `prevTokens`, regardless
     * of whether the close has arrived yet.
     */
    private hasHtmlSpanMismatch = (token: Token): boolean => {
        if (token.type !== 'html') return false
        const html = token as HtmlToken
        if (!html.tag) return false
        if (html.raw.endsWith('/>')) return false
        if (html.raw.startsWith('</')) return false
        return true
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

    private hasAppendSensitiveReferenceSyntax = (source: string): boolean => {
        if (!source.includes('[') || !source.includes(']')) return false

        return (
            LINK_REFERENCE_RE.test(source) ||
            SHORTCUT_REFERENCE_RE.test(source) ||
            REFERENCE_DEFINITION_RE.test(source)
        )
    }

    private canUseTailWindow = (source: string, boundary: TailWindowBoundary): boolean => {
        if (this.tailWindowDisabled) return false
        if (this.prevSource === '' || this.prevTokens.length === 0) return false
        if (!source.startsWith(this.prevSource)) return false
        if (boundary.reparseOffset <= 0) return false

        const stablePrefix = this.prevSource.slice(0, boundary.reparseOffset)
        if (this.hasAppendSensitiveReferenceSyntax(stablePrefix)) return false

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
        // so force a full rerender when reference syntax is present
        const referenceSensitive =
            this.hasAppendSensitiveReferenceSyntax(this.prevSource) ||
            this.hasAppendSensitiveReferenceSyntax(source)

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
        return { tokens: newTokens, divergeAt }
    }
}
