/**
 * The HTML void elements — the single source of truth for "this tag can never
 * have children".
 *
 * Kept in one module because the parsing and rendering halves previously
 * carried their own copy — `token-cleanup` asking "may this tag omit its
 * closing slash?" and `Parser` asking "may this tag receive children?" — and a
 * tag added to one copy but not the other fails silently, exactly the class of
 * bug tracked in issue #383.
 *
 * @module
 */

/** Tag names that are self-closing by definition and take no children. */
const VOID_ELEMENTS: ReadonlySet<string> = new Set([
    'br',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'area',
    'base',
    'col',
    'embed',
    'keygen',
    'param',
    'source',
    'track',
    'wbr'
])

/**
 * Case-insensitive test for a void element name. The only public entry point,
 * so callers cannot bypass the normalization.
 */
export const isVoidElement = (tagName: string): boolean => VOID_ELEMENTS.has(tagName.toLowerCase())
