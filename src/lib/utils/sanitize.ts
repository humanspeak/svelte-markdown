/**
 * URL and HTML attribute sanitization utilities for XSS prevention.
 *
 * These functions are applied in the Parser before tokens reach any
 * renderer component or snippet, ensuring custom renderers cannot
 * bypass sanitization.
 *
 * @see https://github.com/humanspeak/svelte-markdown/issues/272
 * @packageDocumentation
 */

/**
 * Context passed to sanitization functions so users can apply
 * different rules per markdown token type or HTML tag.
 *
 * - For markdown links: `{ type: 'link', tag: 'a' }`
 * - For markdown images: `{ type: 'image', tag: 'img' }`
 * - For HTML tags: `{ type: 'html', tag: 'a' | 'img' | 'div' | ... }`
 */
export interface SanitizeContext {
    /** The markdown token type. */
    type: 'link' | 'image' | 'html'
    /** The HTML tag name being rendered (e.g. `'a'`, `'img'`, `'div'`). */
    tag: string
}

export type SanitizeUrlFn = (_url: string, _context: SanitizeContext) => string

export type SanitizeAttributesFn = (
    _attributes: Record<string, string>,
    _context: SanitizeContext,
    _sanitizeUrl: SanitizeUrlFn
) => Record<string, string>

/** Protocols considered safe for href/src attributes. */
const SAFE_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

/**
 * URL attributes in HTML that should be run through the sanitizer.
 * Covers standard attributes that can trigger navigation or resource loading.
 */
const URL_ATTRIBUTES = new Set(['href', 'src', 'action', 'formaction', 'cite', 'data', 'poster'])

/** Fast-path: most URLs are http/https — avoid `new URL()` for these. */
const SAFE_PREFIX_RE = /^https?:/i
const LEADING_WS_RE = /^\s+/
const RELATIVE_RE = /^[#/?.]/

/**
 * Sanitizes a URL against a protocol allowlist.
 *
 * Allows `http:`, `https:`, `mailto:`, `tel:`, and relative URLs
 * (starting with `/`, `#`, `?`, or no protocol). Blocks everything
 * else including `javascript:`, `data:`, `vbscript:`, etc.
 *
 * Handles mixed-case protocols and leading whitespace.
 *
 * The `context` parameter provides the token type and HTML tag name,
 * enabling per-element policies in custom overrides.
 */
export const defaultSanitizeUrl = (url: string, _context: SanitizeContext): string => {
    if (!url) return ''

    const trimmed = url.replace(LEADING_WS_RE, '')

    // Relative URLs are safe: #anchor, /path, ?query, ./relative, ../parent
    if (RELATIVE_RE.test(trimmed)) return trimmed

    // No colon means no protocol — safe relative URL
    if (!trimmed.includes(':')) return trimmed

    // Fast-path for http/https — avoids new URL() allocation
    if (SAFE_PREFIX_RE.test(trimmed)) return trimmed

    try {
        const parsed = new URL(trimmed, 'http://localhost')
        if (SAFE_PROTOCOLS.has(parsed.protocol)) return trimmed
    } catch {
        // Malformed URL — block it
    }

    return ''
}

/**
 * Passthrough URL sanitizer that allows all URLs unchanged.
 *
 * Use this to disable URL sanitization entirely:
 * ```svelte
 * <SvelteMarkdown source={markdown} sanitizeUrl={unsanitizedUrl} />
 * ```
 */
export const unsanitizedUrl: SanitizeUrlFn = (url: string) => url

/**
 * Passthrough attribute sanitizer that allows all attributes unchanged.
 *
 * Use this to disable attribute sanitization entirely:
 * ```svelte
 * <SvelteMarkdown source={markdown} sanitizeAttributes={unsanitizedAttributes} />
 * ```
 */
export const unsanitizedAttributes: SanitizeAttributesFn = (attributes: Record<string, string>) =>
    attributes

/**
 * Sanitizes an HTML attribute object by:
 * 1. Removing all event handler attributes (`on*`)
 * 2. Running URL-bearing attributes through the sanitizer
 *
 * The `context` parameter provides the HTML tag name, enabling
 * per-element policies in custom overrides (e.g. stricter rules
 * for `<iframe>` than `<a>`).
 *
 * Returns a new object; does not mutate the input.
 */
export const defaultSanitizeAttributes: SanitizeAttributesFn = (
    attributes: Record<string, string>,
    context: SanitizeContext,
    sanitizeUrl: SanitizeUrlFn
): Record<string, string> => {
    const result: Record<string, string> = {}

    for (const [key, value] of Object.entries(attributes)) {
        const lower = key.toLowerCase()

        // Strip event handlers (onclick, onerror, onload, etc.)
        // Strip srcdoc — allows arbitrary HTML/script execution in iframes
        if (lower.startsWith('on') || lower === 'srcdoc') continue

        // Sanitize URL-bearing attributes
        if (URL_ATTRIBUTES.has(lower)) {
            const sanitized = sanitizeUrl(value, context)
            if (sanitized) result[key] = sanitized
            continue
        }

        result[key] = value
    }

    return result
}
