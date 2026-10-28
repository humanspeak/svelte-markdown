/**
 * Engine-agnostic contract for Mermaid diagram rendering.
 *
 * `MermaidRenderer.svelte` only ever talks to the {@link MermaidEngine}
 * interface below. The built-in engine (`createMermaidJsEngine`) wraps
 * mermaid.js; other engines ship their own factory on their own package subpath
 * and produce a {@link MermaidEngine}. Consumers pick an engine at setup time
 * and never touch a different renderer, context key, or singleton.
 *
 * Two rules every engine must follow:
 *
 * 1. `render` must **never throw** and its Promise, when it returns one, must
 *    **never reject**. The renderer sits on the streaming render path, where an
 *    exception on a half-streamed fence would tear down the whole render.
 *    Engines wrap their failures into `{ error }` instead (see
 *    {@link toMermaidError}).
 * 2. The `svg` string is injected with `{@html}`. Engines are therefore
 *    responsible for producing **safe** SVG. mermaid.js is configured with
 *    `securityLevel: 'strict'`; a custom engine must provide equivalent
 *    guarantees for untrusted diagram source.
 *
 * Engines may return synchronously (preferred: the diagram appears in the same
 * frame) or return a Promise (mermaid.js loads asynchronously).
 *
 * This module has no engine imports, so the shared renderer stays free of
 * every optional peer dependency.
 *
 * @module
 */

/** Theme inputs every engine receives. Engines may ignore the ones they do not use. */
export interface MermaidRenderContext {
    /** Whether `<html>` currently carries the `dark` class. */
    dark: boolean
    /** Engine-specific light theme name (mermaid.js: `default`, `forest`, …). */
    lightTheme: string
    /** Engine-specific dark theme name (mermaid.js: `dark`, `neutral`, …). */
    darkTheme: string
}

/** Either rendered SVG markup or a human-readable error message. */
export type MermaidRenderResult =
    { svg: string; error?: undefined } | { svg?: undefined; error: string }

/** A Mermaid diagram engine consumed by `MermaidRenderer`. */
export interface MermaidEngine {
    /**
     * Render diagram source to SVG markup. Must NEVER throw, and any returned
     * Promise must NEVER reject: wrap engine failures into `{ error }`.
     */
    render(
        _text: string,
        _context: MermaidRenderContext
    ): MermaidRenderResult | Promise<MermaidRenderResult>
}

/** Normalise any thrown value into the `{ error }` result shape. */
export const toMermaidError = (e: unknown): MermaidRenderResult => ({
    error: e instanceof Error ? e.message : String(e)
})
