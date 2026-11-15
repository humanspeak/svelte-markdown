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

/**
 * Attributes holding a comma-separated list of image candidates
 * (`url [descriptor]`), such as `<img srcset>` and `<link imagesrcset>`.
 * Each candidate URL goes through the URL sanitizer on its own.
 */
const SRCSET_ATTRIBUTES = new Set(['srcset', 'imagesrcset'])

/** Character code of `,`, the srcset candidate separator. */
const COMMA = 0x2c

/**
 * Whether a character code is ASCII whitespace as the HTML spec defines it
 * for srcset parsing: space, tab, LF, FF or CR. Other Unicode spaces (NBSP,
 * U+2028) are part of the URL.
 *
 * @param code - A UTF-16 code unit
 * @returns `true` for spec whitespace
 */
const isSrcsetSpace = (code: number): boolean =>
    code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0c || code === 0x0d

/**
 * Whether a sanitized URL re-serializes as exactly one srcset candidate. A
 * URL containing whitespace, or starting or ending with a comma, would be
 * split by the browser into extra candidates that never went through the
 * sanitizer.
 *
 * @param url - URL returned by `sanitizeUrl`
 * @returns `true` when the URL is safe to rejoin
 */
const isSingleCandidateUrl = (url: string): boolean => {
    if (url.charCodeAt(0) === COMMA || url.charCodeAt(url.length - 1) === COMMA) return false
    for (let i = 0; i < url.length; i++) {
        if (isSrcsetSpace(url.charCodeAt(i))) return false
    }
    return true
}

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
 * Sanitizes a `srcset`-style attribute value by running each image
 * candidate's URL through `sanitizeUrl`. Candidates whose URL is blocked
 * are dropped; the rest are rejoined with their descriptors (`2x`, `640w`).
 *
 * Candidates are split the way the HTML spec does: a URL is a run of
 * non-whitespace characters, trailing commas end it, and its descriptors
 * run up to the next comma. Commas inside a URL (as in `data:` URIs) are
 * kept with the URL, so a blocked `data:` candidate cannot leak fragments
 * into the result.
 *
 * @param value - The raw attribute value
 * @param context - Token type and tag, passed through to `sanitizeUrl`
 * @param sanitizeUrl - The URL sanitizer to apply to each candidate
 * @returns The sanitized value, or `''` when no candidate survives
 *
 * @example
 * ```typescript
 * sanitizeSrcset('a.png 1x, javascript:alert(1) 2x', ctx, defaultSanitizeUrl)
 * // 'a.png 1x'
 * ```
 */
export const sanitizeSrcset = (
    value: string,
    context: SanitizeContext,
    sanitizeUrl: SanitizeUrlFn
): string => {
    const candidates: string[] = []
    const length = value.length
    let i = 0
    while (i < length) {
        // Skip whitespace and commas between candidates.
        while (i < length && (isSrcsetSpace(value.charCodeAt(i)) || value.charCodeAt(i) === COMMA))
            i++
        if (i >= length) break
        const urlStart = i
        while (i < length && !isSrcsetSpace(value.charCodeAt(i))) i++
        let urlEnd = i
        let descriptors = ''
        if (value.charCodeAt(urlEnd - 1) === COMMA) {
            // Trailing commas end the candidate. The URL's first character is
            // never a comma, so this stops before `urlStart`.
            while (value.charCodeAt(urlEnd - 1) === COMMA) urlEnd--
        } else {
            const descriptorStart = i
            while (i < length && value.charCodeAt(i) !== COMMA) i++
            descriptors = value.slice(descriptorStart, i).trim()
        }
        const sanitized = sanitizeUrl(value.slice(urlStart, urlEnd), context)
        if (sanitized && isSingleCandidateUrl(sanitized)) {
            candidates.push(descriptors ? `${sanitized} ${descriptors}` : sanitized)
        }
    }
    return candidates.join(', ')
}

/** Options for {@link allowUrlPrefixes}. */
export interface AllowUrlPrefixesOptions {
    /**
     * Whether same-origin relative URLs (`/docs`, `./a.png`, `?q=1`,
     * `#section`) are allowed even though they match no prefix. They resolve
     * against the page's own origin. Protocol-relative URLs (`//host/x`) and
     * their backslash spellings (`/\host/x`) are never treated as relative.
     * Defaults to `true`.
     */
    allowRelative?: boolean
}

/** A prefix such as `https://`, `https:` or `mailto:` that only names a protocol. */
const PROTOCOL_ONLY_RE = /^[a-z][a-z\d+.-]*:(?:\/\/)?$/i

/**
 * Stand-ins for the page's own URL, used to tell relative URLs from absolute
 * ones. They differ in scheme because the meaning of some URLs depends on the
 * page's scheme: `https:evil.com/x` is a relative path on an https page but
 * `https://evil.com/x` anywhere else. The `.invalid` TLD never resolves.
 */
const PAGE_BASES: readonly [URL, URL] = [
    new URL('https://page-a.invalid/'),
    new URL('http://page-b.invalid/')
]

/** Encoded `/` or `\`, which some servers decode before routing. */
const ENCODED_SEPARATOR_RE = /%2f|%5c/i

type PrefixMatcher = (_url: URL) => boolean

/**
 * Compiles one allowlist prefix into a matcher over parsed URLs.
 *
 * @param prefix - A protocol (`https://`, `mailto:`) or an absolute URL prefix
 * @returns A matcher for parsed URLs
 * @throws TypeError when the prefix is not a valid absolute URL
 */
const compilePrefix = (prefix: string): PrefixMatcher => {
    const trimmed = prefix.trim()
    if (PROTOCOL_ONLY_RE.test(trimmed)) {
        const protocol = trimmed.replace(/\/\/$/, '').toLowerCase()
        return (url) => url.protocol === protocol
    }
    let parsed: URL
    try {
        parsed = new URL(trimmed)
    } catch {
        throw new TypeError(`allowUrlPrefixes: invalid prefix "${prefix}"`)
    }
    if (parsed.search || parsed.hash) {
        throw new TypeError(
            `allowUrlPrefixes: prefix "${prefix}" must not have a query or fragment`
        )
    }
    // Opaque URLs (mailto:team@example.com) have no host. Match the whole
    // address, optionally followed by a query (`?subject=...`), so the prefix
    // does not also allow `team@example.com.evil.org`.
    if (!parsed.host) {
        const address = parsed.href.toLowerCase()
        return (url) => {
            const href = url.href.toLowerCase()
            return href === address || href.startsWith(`${address}?`)
        }
    }
    const path = parsed.pathname
    return (url) => {
        if (url.protocol !== parsed.protocol || url.host !== parsed.host) return false
        // A prefix ending in `/` matches by plain prefix; otherwise only on a
        // path-segment boundary, so `/images` does not match `/images-private`.
        const inPath = path.endsWith('/')
            ? url.pathname.startsWith(path)
            : url.pathname === path || url.pathname.startsWith(`${path}/`)
        // `..%2f` is not a dot segment to the URL parser, but a server that
        // decodes it before routing would serve a path outside the prefix.
        return inPath && !ENCODED_SEPARATOR_RE.test(url.pathname.slice(path.length))
    }
}

/**
 * Builds a `sanitizeUrl` function that only allows URLs starting with one of
 * the given prefixes, on top of the {@link defaultSanitizeUrl} protocol
 * check. A prefix can only narrow the default: `javascript:` stays blocked
 * even if listed.
 *
 * Prefixes are matched against the URL as a browser parses it, not as text,
 * and for every scheme the page might be served over. These are all blocked
 * for the prefix `https://cdn.example.com/`:
 * - `//evil.com/x` and `/\evil.com/x` (protocol-relative, loads from evil.com)
 * - `https:evil.com/x` (loads from evil.com on any page not served over https)
 * - `https://cdn.example.com@evil.com/x` (credentials, host is evil.com)
 * - `https://cdn.example.com.evil.com/x` (a different host)
 * - `https://cdn.example.com/../x` (compared as `https://cdn.example.com/x`)
 *
 * A prefix is either a protocol (`'https://'`, `'mailto:'`, `'tel:'`), which
 * allows any URL with that protocol, or an absolute URL prefix
 * (`'https://cdn.example.com/images/'`), which also pins host and path. A
 * path prefix without a trailing slash matches only whole path segments, and
 * the rest of the path may not contain an encoded `/` or `\` (`%2f`,
 * `%5c`). An opaque prefix such as `'mailto:team@example.com'` matches that
 * exact address, optionally followed by a query.
 *
 * Allowed URLs are returned unchanged, except protocol-relative ones
 * (`//cdn.example.com/x`), which are returned as `https:` URLs: their scheme
 * would otherwise depend on the page. To allow an http-only host, list its
 * `http://` prefix and write its URLs in full.
 *
 * @param prefixes - Allowed protocols or absolute URL prefixes
 * @param options - See {@link AllowUrlPrefixesOptions}
 * @returns A `sanitizeUrl` function
 * @throws TypeError when a prefix is not a protocol or a valid absolute URL
 *
 * @example
 * ```svelte
 * <script>
 *     import SvelteMarkdown, { allowUrlPrefixes, defaultSanitizeUrl } from '@humanspeak/svelte-markdown'
 *
 *     const cdnOnly = allowUrlPrefixes(['https://cdn.example.com/'])
 *     // Links keep the default policy. Everything else that loads a resource
 *     // (img, source, audio, srcset, ...) must come from the CDN.
 *     const sanitizeUrl = (url, context) =>
 *         context.tag === 'a' ? defaultSanitizeUrl(url, context) : cdnOnly(url, context)
 * </script>
 *
 * <SvelteMarkdown {source} {sanitizeUrl} />
 * ```
 */
export const allowUrlPrefixes = (
    prefixes: readonly string[],
    options: AllowUrlPrefixesOptions = {}
): SanitizeUrlFn => {
    const matchers = prefixes.map(compilePrefix)
    const allowRelative = options.allowRelative ?? true
    const allowed = (resolved: URL, base: URL): boolean =>
        resolved.origin === base.origin ? allowRelative : matchers.some((m) => m(resolved))
    return (url, context) => {
        const safe = defaultSanitizeUrl(url, context)
        if (!safe) return ''
        let onHttps: URL
        let onHttp: URL
        try {
            onHttps = new URL(safe, PAGE_BASES[0])
            onHttp = new URL(safe, PAGE_BASES[1])
        } catch {
            return ''
        }
        // Protocol-relative: same host, scheme taken from the page. Check and
        // return the https form so the result no longer depends on the page.
        if (onHttps.protocol !== onHttp.protocol && onHttps.host === onHttp.host) {
            return matchers.some((m) => m(onHttps)) ? onHttps.href : ''
        }
        // Otherwise the URL must be allowed whatever the page's scheme:
        // relative where it stays on the page, matched where it leaves it.
        return allowed(onHttps, PAGE_BASES[0]) && allowed(onHttp, PAGE_BASES[1]) ? safe : ''
    }
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
 * 3. Running each image candidate URL in `srcset`/`imagesrcset` through it
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

        // Sanitize each image candidate URL in srcset-style lists
        if (SRCSET_ATTRIBUTES.has(lower)) {
            const sanitized = sanitizeSrcset(value, context, sanitizeUrl)
            if (sanitized) result[key] = sanitized
            continue
        }

        result[key] = value
    }

    return result
}
