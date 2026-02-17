import { describe, expect, it } from 'vitest'
import { parseHtmlBlock } from './token-cleanup.js'

describe('parseHtmlBlock', () => {
    it('should parse simple HTML tags', () => {
        const html = '<div>Hello</div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens).toHaveLength(3)
        expect(tokens[0]).toEqual({
            type: 'html',
            raw: '<div>',
            tag: 'div',
            attributes: {}
        })
        expect(tokens[1]).toEqual({
            type: 'text',
            raw: 'Hello',
            text: 'Hello'
        })
        expect(tokens[2]).toEqual({
            type: 'html',
            raw: '</div>',
            tag: 'div'
        })
    })

    it('should handle nested HTML structures', () => {
        const html = '<div><span>Nested</span></div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens).toHaveLength(5)
        expect(tokens.map((t) => t.raw)).toEqual(['<div>', '<span>', 'Nested', '</span>', '</div>'])
    })

    it('should preserve HTML attributes', () => {
        const html = '<div class="container" id="main">Content</div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens[0]).toEqual({
            type: 'html',
            raw: '<div class="container" id="main">',
            tag: 'div',
            attributes: {
                class: 'container',
                id: 'main'
            }
        })
    })

    it('should handle self-closing tags', () => {
        const html = '<div>Before<br/>After</div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens.map((t) => t.raw)).toEqual(['<div>', 'Before', '<br/>', 'After', '</div>'])
    })

    it('should handle multiple text nodes', () => {
        const html = '<div>First Second</div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens[1]).toEqual({
            type: 'text',
            raw: 'First Second',
            text: 'First Second'
        })
    })

    it('should handle complex attributes', () => {
        const html = '<div style="color: red; margin: 10px" data-test="value">Content</div>'
        const tokens = parseHtmlBlock(html)

        expect((tokens[0] as any).attributes).toEqual({
            style: 'color: red; margin: 10px',
            'data-test': 'value'
        })
    })

    it('should handle malformed HTML gracefully', () => {
        const html = '<div>Unclosed'
        const tokens = parseHtmlBlock(html)

        expect(tokens).toHaveLength(2)
        expect(tokens[0]).toEqual({
            type: 'html',
            raw: '<div>',
            tag: 'div',
            attributes: {}
        })
        expect(tokens[1]).toEqual({
            type: 'text',
            raw: 'Unclosed',
            text: 'Unclosed'
        })
    })

    it('should handle empty elements', () => {
        const html = '<div></div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens).toHaveLength(2)
        expect(tokens.map((t) => t.raw)).toEqual(['<div>', '</div>'])
    })

    it('should handle multiple root elements', () => {
        const html = '<div>First</div><span>Second</span>'
        const tokens = parseHtmlBlock(html)

        expect(tokens.map((t) => t.raw)).toEqual([
            '<div>',
            'First',
            '</div>',
            '<span>',
            'Second',
            '</span>'
        ])
    })

    it('should preserve whitespace in text content', () => {
        const html = '<div>\n  Indented\n  Text\n</div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens[1]).toEqual({
            type: 'text',
            raw: '\n  Indented\n  Text\n',
            text: '\n  Indented\n  Text\n'
        })
    })

    it('should emit trailing text after closing tags', () => {
        const tokens = parseHtmlBlock('<div>content</div> tail')
        expect(tokens).toHaveLength(4)
        expect(tokens[3]).toMatchObject({ type: 'text', raw: ' tail', text: ' tail' })
    })

    it('should handle HTML entities in text', () => {
        const html = '<div>&lt;escaped&gt; &amp; &quot;quoted&quot;</div>'
        const tokens = parseHtmlBlock(html)

        expect(tokens[1]).toEqual({
            type: 'text',
            raw: '<escaped> & "quoted"',
            text: '<escaped> & "quoted"'
        })
    })
})
