import flowchart from 'pele/diagrams/flowchart'
import { describe, expect, it } from 'vitest'
import type { MermaidRenderContext, MermaidRenderResult } from '../mermaid/mermaidEngine.js'
import { createPeleEngine } from './createPeleEngine.js'

const context: MermaidRenderContext = { dark: false, lightTheme: 'default', darkTheme: 'dark' }

const makeEngine = (renderOptions?: Parameters<typeof createPeleEngine>[0]['renderOptions']) =>
    createPeleEngine({ diagrams: [flowchart], renderOptions })

/** Narrow a render result to its sync form, failing the test if it is a Promise. */
const syncResult = (r: MermaidRenderResult | Promise<MermaidRenderResult>): MermaidRenderResult => {
    if (r instanceof Promise) throw new Error('expected a synchronous render result')
    return r
}

describe('createPeleEngine', () => {
    it('returns { svg } synchronously for a registered diagram type', () => {
        const raw = makeEngine().render('flowchart LR\n  A --> B', context)
        expect(raw).not.toBeInstanceOf(Promise)
        const result = syncResult(raw)
        expect(result.svg?.startsWith('<svg')).toBe(true)
        expect(result.error).toBeUndefined()
    })

    it('returns { error } and does not throw for a syntax error', () => {
        const result = syncResult(makeEngine().render('flowchart LR\n  A -->', context))
        expect(result.svg).toBeUndefined()
        expect(result.error).toEqual(expect.any(String))
    })

    it('returns { error } for a diagram type that was not registered', () => {
        const result = syncResult(makeEngine().render('sequenceDiagram\n  A->>B: hi', context))
        expect(result.svg).toBeUndefined()
        expect(result.error).toContain('sequence')
    })

    it('escapes diagram text so no raw <img> reaches the svg', () => {
        const result = syncResult(
            makeEngine().render('flowchart LR\n  A["<img src=x onerror=alert(1)>"] --> B', context)
        )
        expect(result.svg).toBeDefined()
        expect(result.svg).not.toContain('<img')
    })

    it('passes renderOptions through to pele', () => {
        const result = syncResult(
            makeEngine({ fontFamily: 'tst-font' }).render('flowchart LR\n  A --> B', context)
        )
        expect(result.svg).toContain('tst-font')
    })

    it('ignores dark, lightTheme, and darkTheme (theming is via --pele-* CSS variables)', () => {
        const engine = makeEngine()
        const light = syncResult(engine.render('flowchart LR\n  A --> B', context))
        const dark = syncResult(
            engine.render('flowchart LR\n  A --> B', {
                dark: true,
                lightTheme: 'forest',
                darkTheme: 'neutral'
            })
        )
        expect(dark.svg).toBe(light.svg)
    })
})
