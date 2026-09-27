/**
 * Streaming-compatible Shiki engine.
 *
 * This module wraps Shiki's **synchronous** core highlighter
 * ({@link createHighlighterCoreSync}) with the pure-JavaScript regex engine so
 * that highlighting happens at render time with no WASM load and no top-level
 * `await`. That is the property that keeps the streaming diff path intact: the
 * `code` renderer stays synchronous, so `SvelteMarkdown`'s `hasAsyncExtension`
 * guard never trips and `streaming` is never silently disabled.
 *
 * The factory produces the shared {@link CodeHighlighter} contract consumed by
 * the engine-agnostic `HighlightedCode` renderer (re-exported from this subpath
 * as `ShikiCode` for backward compatibility).
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
import { renderFallback, type CodeHighlighter } from '../highlight/codeHighlighter.js'

export { escapeHtml } from '../highlight/codeHighlighter.js'

/**
 * Backward-compatible alias for the shared {@link CodeHighlighter} contract.
 * New code should import `CodeHighlighter` from `extensions/highlight`.
 */
export type ShikiHighlighter = CodeHighlighter

/** Class used by this engine's escaped fallback `<pre>`. */
export const SHIKI_FALLBACK_CLASS = 'shiki-fallback'

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
 * Build a synchronous {@link CodeHighlighter} from explicit languages/themes.
 *
 * For an **unregistered or empty** `lang`, and for any per-block highlighting
 * failure, the result degrades to an escaped `<pre class="shiki-fallback">`
 * rather than throwing mid-stream. The untrusted `lang` is emitted only as an
 * escaped `data-lang` attribute.
 *
 * @throws If `createHighlighterCoreSync` itself fails (e.g. a malformed
 *   language registration) — construction is a one-time setup concern, not a
 *   per-block/mid-stream one, so it is allowed to surface.
 */
export const createShikiHighlighter = (options: CreateShikiHighlighterOptions): CodeHighlighter => {
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
                return renderFallback(code, lang, SHIKI_FALLBACK_CLASS)
            }
            try {
                return highlighter.codeToHtml(code, { lang, theme })
            } catch {
                // Defensive: any per-block failure degrades to escaped text
                // rather than throwing mid-stream.
                return renderFallback(code, lang, SHIKI_FALLBACK_CLASS)
            }
        }
    }
}
