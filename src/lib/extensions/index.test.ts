import { describe, expect, it } from 'vitest'
import { markedMermaid, MermaidRenderer } from './index.js'

describe('extensions barrel exports', () => {
    it('should export markedMermaid function', () => {
        expect(typeof markedMermaid).toBe('function')

        const ext = markedMermaid()
        expect(ext.extensions).toHaveLength(1)
        expect(ext.extensions![0].name).toBe('mermaid')
    })

    it('should export MermaidRenderer component', () => {
        expect(MermaidRenderer).toBeDefined()
        expect(typeof MermaidRenderer).toBe('function')
    })
})
