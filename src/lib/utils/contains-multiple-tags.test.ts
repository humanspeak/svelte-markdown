import { describe, expect, it } from 'vitest'
import { containsMultipleTags } from './token-cleanup.js'

describe('containsMultipleTags', () => {
    it('should return false for single tag', () => {
        const html = '<div>content</div>'
        expect(containsMultipleTags(html)).toBe(false)
    })

    it('should return true for multiple opening tags', () => {
        const html = '<div><span>content</span></div>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should return true for multiple closing tags', () => {
        const html = '<div><p>content</p></div>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should handle self-closing tags', () => {
        const html = '<div><br/></div>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should handle tags with attributes', () => {
        const html = '<div class="container"><span id="test">content</span></div>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should return false for text only', () => {
        const html = 'plain text content'
        expect(containsMultipleTags(html)).toBe(false)
    })

    it('should return false for empty string', () => {
        expect(containsMultipleTags('')).toBe(false)
    })

    it('should handle malformed HTML', () => {
        const html = '<div>unclosed <span>content</div>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should handle multiple sibling tags', () => {
        const html = '<div></div><p></p>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should handle deeply nested tags', () => {
        const html = '<div><span><em><strong>deep</strong></em></span></div>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should handle HTML comments', () => {
        const html = '<div><!-- comment --><span>content</span></div>'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('should handle tags with whitespace', () => {
        const html = '<div ><span >content</span ></div >'
        expect(containsMultipleTags(html)).toBe(true)
    })

    it('it should return true if it starts with and ends with the same tag and only those tags', () => {
        const html = '<div>content</div>'
        expect(containsMultipleTags(html)).toBe(true)
    })
})
