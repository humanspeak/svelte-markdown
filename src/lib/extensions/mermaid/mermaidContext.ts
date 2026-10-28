/**
 * Mermaid engine injection channels shared by every engine.
 *
 * `MermaidRenderer` is instantiated deep inside `SvelteMarkdown` via the
 * `renderers` prop, which only forwards token-derived props (`text`). There is
 * no ergonomic way to thread a per-instance `engine` prop through the standard
 * renderers map, so `MermaidRenderer` resolves one in priority order:
 *
 * 1. an explicit `engine` prop (only reachable if the consumer wraps
 *    `MermaidRenderer` in their own component),
 * 2. Svelte {@link https://svelte.dev/docs/svelte#setcontext | context} set by
 *    an ancestor of `<SvelteMarkdown>` under {@link MERMAID_ENGINE_CONTEXT_KEY},
 * 3. a module-level singleton set via {@link setMermaidEngine}.
 *
 * If none is set, the built-in mermaid.js engine is used.
 *
 * @module
 */

import type { MermaidEngine } from './mermaidEngine.js'

/**
 * Context key an ancestor of `<SvelteMarkdown>` can set to inject a Mermaid
 * engine.
 *
 * A global-registry symbol so the same key resolves across module boundaries
 * (engine subpaths can share it without importing each other).
 */
export const MERMAID_ENGINE_CONTEXT_KEY: unique symbol = Symbol.for(
    'svelte-markdown:mermaid-engine'
)

let singleton: MermaidEngine | undefined

/**
 * Register a process/module-wide Mermaid engine used by every `MermaidRenderer`
 * that receives neither a prop nor a context engine. Pass `undefined` to clear
 * (used in tests).
 */
export const setMermaidEngine = (engine: MermaidEngine | undefined): void => {
    singleton = engine
}

/** Read the current module-level singleton engine, if any. */
export const getMermaidEngine = (): MermaidEngine | undefined => singleton
