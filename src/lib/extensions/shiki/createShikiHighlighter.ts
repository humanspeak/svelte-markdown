/**
 * SPIKE — streaming-compatible Shiki syntax highlighting.
 *
 * This module wraps Shiki's **synchronous** core highlighter
 * ({@link createHighlighterCoreSync}) with the pure-JavaScript regex engine so
 * that highlighting happens at render time with no WASM load and no top-level
 * `await`. That is the property that keeps the streaming diff path intact: the
 * `code` renderer stays synchronous, so `SvelteMarkdown`'s `hasAsyncExtension`
 * guard never trips and `streaming` is never silently disabled.
 *
 * The consumer supplies explicitly-imported languages and themes, e.g.
 *
 * ```ts
 * import js from 'shiki/langs/javascript.mjs'
 * import ts from 'shiki/langs/typescript.mjs'
 * import githubDark from 'shiki/themes/github-dark.mjs'
 * import { createShikiHighlighter } from '.../extensions/shiki'
 *
 * const highlighter = createShikiHighlighter({ langs: [js, ts], themes: [githubDark] })
 * ```
 *
 * Only the languages/themes you import are bundled — nothing is pulled in
 * dynamically — which is what keeps the core package's "lightweight" bundle
 * positioning honest (see `scripts/tree-shaking.mjs`).
 *
 * @module
 */

import {
    createHighlighterCoreSync,
    type LanguageInput,
    type LanguageRegistration,
    type MaybeArray,
    type ThemeInput,
    type ThemeRegistrationAny
} from 'shiki/core'
import { createJavaScriptRegexEngine } from 'shiki/engine/javascript'

/**
 * Escape the five HTML-significant characters so untrusted text can never break
 * out of its element or attribute context. Used by the unregistered-language
 * fallback, which must **escape, never interpolate** its inputs — the fenced
 * code `lang` is untrusted (agent/LLM-streamed) input in this package's
 * headline use case.
 */
export const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')

/** A minimal, synchronous highlighter facade consumed by `ShikiCode.svelte`. */
export interface ShikiHighlighter {
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

export interface CreateShikiHighlighterOptions {
    /** Explicitly-imported Shiki languages (e.g. `import js from 'shiki/langs/javascript.mjs'`). */
    langs: LanguageInput[]
    /** Explicitly-imported Shiki themes (e.g. `import theme from 'shiki/themes/github-dark.mjs'`). */
    themes: ThemeInput[]
    /**
     * Theme name to render with. Defaults to the first loaded theme. Must match
     * one of the loaded `themes`.
     */
    theme?: string
}

/**
 * Escaped, dependency-free fallback for unregistered languages. Deliberately
 * does **not** interpolate `lang` as raw markup; when present it is emitted as
 * an escaped `data-lang` attribute value only.
 */
const renderFallback = (code: string, lang: string): string => {
    const langAttr = lang ? ` data-lang="${escapeHtml(lang)}"` : ''
    return `<pre class="shiki-fallback"${langAttr}><code>${escapeHtml(code)}</code></pre>`
}

/**
 * Build a synchronous {@link ShikiHighlighter} from explicit languages/themes.
 *
 * @throws If `createHighlighterCoreSync` itself fails (e.g. a malformed
 *   language registration) — construction is a one-time setup concern, not a
 *   per-block/mid-stream one, so it is allowed to surface.
 */
export const createShikiHighlighter = (
    options: CreateShikiHighlighterOptions
): ShikiHighlighter => {
    const highlighter = createHighlighterCoreSync({
        engine: createJavaScriptRegexEngine(),
        // Shiki's sync-mode types demand already-resolved registrations, but its
        // sync loader also accepts the `{ default: … }` ESM module shape the
        // consumer gets from `import js from 'shiki/langs/javascript.mjs'`
        // (verified at runtime). Keep the ergonomic `LanguageInput`/`ThemeInput`
        // public API and bridge that known typing quirk here.
        langs: options.langs as unknown as MaybeArray<LanguageRegistration>[],
        themes: options.themes as unknown as MaybeArray<ThemeRegistrationAny>[]
    })

    const loadedLangs = new Set(highlighter.getLoadedLanguages())
    const theme = options.theme ?? highlighter.getLoadedThemes()[0]

    return {
        hasLang: (lang: string): boolean => loadedLangs.has(lang),
        highlight(code: string, lang: string): string {
            if (!lang || !loadedLangs.has(lang)) {
                return renderFallback(code, lang)
            }
            try {
                return highlighter.codeToHtml(code, { lang, theme })
            } catch {
                // Defensive: any per-block failure degrades to escaped text
                // rather than throwing mid-stream.
                return renderFallback(code, lang)
            }
        }
    }
}
