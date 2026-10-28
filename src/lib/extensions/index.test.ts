import { describe, expect, it } from 'vitest'
import {
    AlertRenderer,
    createMermaidJsEngine,
    FootnoteRef,
    FootnoteSection,
    getMermaidEngine,
    markedAlert,
    markedFootnote,
    markedMermaid,
    MERMAID_ENGINE_CONTEXT_KEY,
    MermaidRenderer,
    setMermaidEngine
} from './index.js'

describe('extensions barrel exports', () => {
    it('should export the mermaid engine contract helpers', () => {
        expect(typeof createMermaidJsEngine).toBe('function')
        expect(typeof setMermaidEngine).toBe('function')
        expect(typeof getMermaidEngine).toBe('function')
        expect(MERMAID_ENGINE_CONTEXT_KEY).toBe(Symbol.for('svelte-markdown:mermaid-engine'))
    })

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

    it('should export markedAlert function', () => {
        expect(typeof markedAlert).toBe('function')

        const ext = markedAlert()
        expect(ext.extensions).toHaveLength(1)
        expect(ext.extensions![0].name).toBe('alert')
    })

    it('should export AlertRenderer component', () => {
        expect(AlertRenderer).toBeDefined()
        expect(typeof AlertRenderer).toBe('function')
    })

    it('should export markedFootnote function', () => {
        expect(typeof markedFootnote).toBe('function')

        const ext = markedFootnote()
        expect(ext.extensions).toHaveLength(2)
        expect(ext.extensions![0].name).toBe('footnoteRef')
        expect(ext.extensions![1].name).toBe('footnoteSection')
    })

    it('should export FootnoteRef component', () => {
        expect(FootnoteRef).toBeDefined()
        expect(typeof FootnoteRef).toBe('function')
    })

    it('should export FootnoteSection component', () => {
        expect(FootnoteSection).toBeDefined()
        expect(typeof FootnoteSection).toBe('function')
    })
})
