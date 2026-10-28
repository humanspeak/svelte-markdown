import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMermaidJsEngine } from './createMermaidJsEngine.js'

const mockRender = vi.fn()
const mockInitialize = vi.fn()

vi.mock('mermaid', () => ({
    default: {
        render: mockRender,
        initialize: mockInitialize
    }
}))

const context = { dark: false, lightTheme: 'default', darkTheme: 'dark' }

describe('createMermaidJsEngine', () => {
    beforeEach(() => {
        mockRender.mockReset()
        mockInitialize.mockReset()
        mockRender.mockResolvedValue({ svg: '<svg>diagram</svg>' })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('resolves to the SVG returned by mermaid.render', async () => {
        const engine = createMermaidJsEngine()
        await expect(engine.render('graph TD; A-->B;', context)).resolves.toEqual({
            svg: '<svg>diagram</svg>'
        })
        expect(mockRender).toHaveBeenCalledWith(
            expect.stringMatching(/^mermaid-/),
            expect.stringContaining("'theme': 'default'")
        )
    })

    it('resolves to an error result and never rejects when render fails', async () => {
        mockRender.mockRejectedValueOnce(new Error('Invalid syntax'))
        const engine = createMermaidJsEngine()
        await expect(engine.render('nope', context)).resolves.toEqual({ error: 'Invalid syntax' })
    })

    it('stringifies a non-Error rejection into an error result', async () => {
        mockRender.mockRejectedValueOnce('string error')
        const engine = createMermaidJsEngine()
        await expect(engine.render('nope', context)).resolves.toEqual({ error: 'string error' })
    })

    it('initializes mermaid once across renders of the same engine', async () => {
        const engine = createMermaidJsEngine()
        await engine.render('A', context)
        await engine.render('B', context)
        expect(mockInitialize).toHaveBeenCalledTimes(1)
        expect(mockInitialize).toHaveBeenCalledWith({
            startOnLoad: false,
            securityLevel: 'strict'
        })
    })

    it('uses the dark theme when dark is true', async () => {
        const engine = createMermaidJsEngine()
        await engine.render('A-->B', { ...context, dark: true })
        expect(mockRender).toHaveBeenCalledWith(
            expect.stringMatching(/^mermaid-/),
            expect.stringContaining("'theme': 'dark'")
        )
    })
})
