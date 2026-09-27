/**
 * Engine-agnostic contract for streaming-compatible syntax highlighting.
 *
 * `HighlightedCode.svelte` (the shared `code` renderer) only ever talks to
 * this two-method interface. Each engine ships its own factory on its own
 * package subpath — `extensions/shiki` and `extensions/tanstack-highlight` —
 * and both produce a {@link CodeHighlighter}. Consumers pick an engine at setup
 * time and never touch a different renderer, context key, or singleton.
 *
 * The contract has one hard rule: `highlight` must be **synchronous and must
 * never throw**. The `code` renderer sits on the streaming render path, where
 * an exception on a half-streamed fence would tear down the whole render and a
 * promise would trip the async-extension guard and silently disable
 * streaming. Factories are expected to wrap engine failures and degrade to
 * {@link renderFallback}.
 *
 * This module has no engine imports, so the shared renderer stays free of
 * every optional peer dependency.
 *
 * @module
 */

/** A minimal, synchronous highlighter facade consumed by `HighlightedCode.svelte`. */
export interface CodeHighlighter {
    /**
     * Highlight `code` for `lang`, returning an HTML string. For an
     * unregistered (or empty) `lang`, returns an escaped `<pre><code>` fallback
     * instead of throwing — critical mid-stream, where an exception would tear
     * down the render.
     */
    highlight(_code: string, _lang: string): string
    /** Whether `lang` (name or alias) is registered on the highlighter. */
    hasLang(_lang: string): boolean
}

/**
 * Escape the five HTML-significant characters so untrusted text can never break
 * out of its element or attribute context. Used by every fallback path, which
 * must **escape, never interpolate** its inputs — the fenced code `lang` is
 * untrusted (agent/LLM-streamed) input in this package's headline use case.
 */
export const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

/** Class emitted by {@link renderFallback} when a factory does not override it. */
export const FALLBACK_CLASS = 'highlight-fallback'

/**
 * Escaped, dependency-free fallback used when no highlighter is configured,
 * when a language is unregistered, or when an engine throws. Deliberately does
 * **not** interpolate `lang` as raw markup; when present it is emitted as an
 * escaped `data-lang` attribute value only.
 *
 * @param code - Untrusted code text; escaped.
 * @param lang - Untrusted fenced info string; escaped into `data-lang` only.
 * @param className - `<pre>` class, so each engine can keep its own hook
 *   (`shiki-fallback`, …). Defaults to {@link FALLBACK_CLASS}.
 */
export const renderFallback = (code: string, lang: string, className = FALLBACK_CLASS): string => {
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : ''
    return `<pre class="${className}"${langAttr}><code>${escapeHtml(code)}</code></pre>`
}
