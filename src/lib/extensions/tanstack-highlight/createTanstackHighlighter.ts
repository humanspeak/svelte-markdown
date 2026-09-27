/**
 * Streaming-compatible TanStack Highlight engine.
 *
 * Wraps `@tanstack/highlight`'s synchronous `createHighlighter` behind the
 * shared {@link CodeHighlighter} contract so it can drive the engine-agnostic
 * `HighlightedCode` renderer. TanStack Highlight is synchronous by design —
 * no WASM, no worker, no async initialization — so nothing here needs an
 * engine workaround to stay on the streaming render path.
 *
 * The consumer supplies explicitly-imported language definitions:
 *
 * ```ts
 * import { ts } from '@tanstack/highlight/languages/ts'
 * import { json } from '@tanstack/highlight/languages/json'
 * import { createTanstackHighlighter } from '.../extensions/tanstack-highlight'
 *
 * const highlighter = createTanstackHighlighter({ languages: [ts, json] })
 * ```
 *
 * Only the languages you import are bundled. Output carries semantic `th-*`
 * classes with no inline colors; supply a stylesheet from
 * `@tanstack/highlight/theme`'s `createThemeCss` (see the docs) or your own.
 *
 * @module
 */

import { createHighlighter, type LanguageDefinition } from '@tanstack/highlight/core'
import { renderFallback, type CodeHighlighter } from '../highlight/codeHighlighter.js'

/** Class used by this engine's escaped fallback `<pre>`. */
export const TANSTACK_FALLBACK_CLASS = 'th-code th-code--fallback'

export interface CreateTanstackHighlighterOptions {
    /** Explicitly-imported language definitions (e.g. `import { ts } from '@tanstack/highlight/languages/ts'`). */
    languages: ReadonlyArray<LanguageDefinition>
    /**
     * Whether an unregistered `lang` should render through the engine's own
     * plaintext path (`<pre class="th-code th-code--plaintext">`, so it picks up
     * your theme) or through the shared escaped fallback. Defaults to `true`.
     */
    plaintextFallback?: boolean
}

/**
 * Build a synchronous {@link CodeHighlighter} backed by TanStack Highlight.
 *
 * Unregistered languages resolve to plaintext inside the engine, which means
 * they still get the `th-code` wrapper and your theme's background. Set
 * `plaintextFallback: false` to use the shared escaped fallback instead.
 *
 * @throws If `createHighlighter` itself fails (e.g. a malformed language
 *   definition) — construction is a one-time setup concern, not a
 *   per-block/mid-stream one, so it is allowed to surface.
 */
export const createTanstackHighlighter = (
    options: CreateTanstackHighlighterOptions
): CodeHighlighter => {
    const highlighter = createHighlighter({ languages: options.languages })
    const plaintextFallback = options.plaintextFallback ?? true

    const hasLang = (lang: string): boolean =>
        lang !== '' && highlighter.normalizeLanguage(lang) !== 'plaintext'

    return {
        hasLang,
        highlight(code: string, lang: string): string {
            if (!plaintextFallback && !hasLang(lang)) {
                return renderFallback(code, lang, TANSTACK_FALLBACK_CLASS)
            }
            try {
                // The engine normalizes unknown/adversarial `lang` values to
                // `plaintext` and escapes every emitted text node, so the
                // untrusted info string never reaches markup unescaped.
                return highlighter.highlightToHtml(code, { lang })
            } catch {
                // Defensive: any per-block failure degrades to escaped text
                // rather than throwing mid-stream.
                return renderFallback(code, lang, TANSTACK_FALLBACK_CLASS)
            }
        }
    }
}
