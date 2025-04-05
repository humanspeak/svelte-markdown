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
    source: Token[] | string
    renderers?: Partial<T>
    options?: Partial<SvelteMarkdownOptions>
    isInline?: boolean
    parsed?: (tokens: Token[] | TokensList) => void // eslint-disable-line no-unused-vars
}

export interface SvelteMarkdownOptions extends MarkedOptions {
    headerIds?: boolean
    headerPrefix?: string
}
