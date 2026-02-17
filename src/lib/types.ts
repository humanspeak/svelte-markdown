/**
 * Type definitions for the Svelte Markdown component.
 *
 * This module provides TypeScript type definitions for the core functionality
 * of the Svelte Markdown parser and renderer. It defines the primary interface
 * for component props and integrates with the marked library's token system.
 *
 * Typical usage example:
 * ```typescript
 * import type { SvelteMarkdownProps } from './types';
 *
 * const markdownProps: SvelteMarkdownProps = {
 *   source: "# Hello World",
 *   isInline: false
 * };
 * ```
 *
 * @packageDocumentation
 */

import type { Token, TokensList } from 'marked'
import type { MarkedOptions, Renderers } from './utils/markdown-parser.js'

export type SvelteMarkdownProps<T extends Renderers = Renderers> = {
    /**
     * Markdown content to render.
     *
     * Pass a `string` for raw markdown that will be parsed, or a pre-parsed
     * `Token[]` array to skip parsing entirely. An empty string renders nothing.
     */
    source: Token[] | string

    /**
     * Partial map of renderer overrides merged with the built-in defaults.
     *
     * Only the keys you provide are replaced — all others keep their default
     * component.  Use the `allowRenderersOnly` / `excludeRenderersOnly`
     * helpers to disable entire categories of renderers.
     */
    renderers?: Partial<T>

    /**
     * Options forwarded to the `marked` lexer, extended with header-ID
     * generation settings.  Merged with {@link defaultOptions}.
     */
    options?: Partial<SvelteMarkdownOptions>

    /**
     * When `true`, the source is parsed with `Lexer.lexInline()` instead of
     * `Lexer.lex()`, producing only inline tokens (no block elements).
     *
     * @defaultValue `false`
     */
    isInline?: boolean

    /**
     * Callback invoked after the source has been parsed into tokens.
     *
     * Receives the full token array before rendering begins. Useful for
     * inspecting or transforming the parsed AST.
     *
     * @param tokens - The parsed token array or `TokensList`.
     */
    parsed?: (tokens: Token[] | TokensList) => void // eslint-disable-line no-unused-vars
}

export interface SvelteMarkdownOptions extends MarkedOptions {
    /**
     * When `true`, an `id` attribute is generated for every heading element
     * using `github-slugger`.
     *
     * @defaultValue `true`
     */
    headerIds?: boolean

    /**
     * String prepended to every generated heading `id`.
     *
     * @defaultValue `''`
     */
    headerPrefix?: string
}
