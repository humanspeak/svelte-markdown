import { describe, expect, it } from 'vitest'
import { MERMAID_ENGINE_CONTEXT_KEY } from './mermaidContext.js'
import { toMermaidError } from './mermaidEngine.js'

describe('toMermaidError', () => {
    it('uses the message of an Error', () => {
        expect(toMermaidError(new Error('Parse error on line 1'))).toEqual({
            error: 'Parse error on line 1'
        })
    })

    it('stringifies non-Error throws', () => {
        expect(toMermaidError('string error')).toEqual({ error: 'string error' })
        expect(toMermaidError(42)).toEqual({ error: '42' })
    })
})

describe('MERMAID_ENGINE_CONTEXT_KEY', () => {
    it('is a global-registry symbol so engine subpaths share it', () => {
        expect(MERMAID_ENGINE_CONTEXT_KEY).toBe(Symbol.for('svelte-markdown:mermaid-engine'))
    })
})
