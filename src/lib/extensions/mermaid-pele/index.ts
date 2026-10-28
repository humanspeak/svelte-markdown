/**
 * pele Mermaid engine for the shared `MermaidRenderer`.
 *
 * Shipped ONLY via the `@humanspeak/svelte-markdown/extensions/mermaid-pele`
 * subpath — intentionally NOT re-exported from the `extensions` barrel.
 * `createPeleEngine.js` statically imports `pele/core` from plain JS, so a
 * barrel re-export would force every barrel consumer's bundler to resolve
 * `pele` (an optional peer dependency) even when they never render diagrams
 * with it (guarded by `barrel-optional-deps.test.ts`).
 *
 * The renderer, context key, and singleton live on the engine-free
 * `extensions/mermaid` subpath and are re-exported here for convenience.
 *
 * @module
 */

export {
    MERMAID_ENGINE_CONTEXT_KEY,
    MermaidRenderer,
    getMermaidEngine,
    markedMermaid,
    setMermaidEngine,
    type MermaidEngine,
    type MermaidRenderContext,
    type MermaidRenderResult
} from '../mermaid/index.js'
export { createPeleEngine, type CreatePeleEngineOptions } from './createPeleEngine.js'
