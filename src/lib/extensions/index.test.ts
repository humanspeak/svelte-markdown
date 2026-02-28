import { describe, expect, it } from 'vitest'
import {
    AlertRenderer,
    FootnoteRef,
    FootnoteSection,
    markedAlert,
    markedFootnote,
    markedMermaid,
    MermaidRenderer
} from './index.js'

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
