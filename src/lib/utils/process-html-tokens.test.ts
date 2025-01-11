import type { Token } from 'marked'
import { describe, expect, it } from 'vitest'
import { processHtmlTokens } from './token-cleanup.js'

describe('processHtmlTokens', () => {
    it('should process simple HTML structure', () => {
        const tokens: Token[] = [
            { type: 'html', raw: '<div>', text: 'div' },
            { type: 'text', raw: 'content', text: 'content' },
            { type: 'html', raw: '</div>', text: 'div' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({
            type: 'html',
            tag: 'div',
            tokens: [{ type: 'text', raw: 'content', text: 'content' }]
        })
    })

    it('should handle nested HTML structures', () => {
        const tokens: Token[] = [
            { type: 'html', raw: '<div>', text: 'div' },
            { type: 'html', raw: '<span>', text: 'span' },
            { type: 'text', raw: 'nested', text: 'nested' },
            { type: 'html', raw: '</span>', text: 'span' },
            { type: 'html', raw: '</div>', text: 'div' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toHaveLength(1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).tag).toBe('div')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).tokens?.[0].tag).toBe('span')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).tokens?.[0].tokens?.[0].text).toBe('nested')
    })

    it('should preserve attributes in nested structures', () => {
        const tokens: Token[] = [
            { type: 'html', raw: '<div class="wrapper">', text: 'div' },
            { type: 'html', raw: '<span style="color: red">', text: 'span' },
            { type: 'text', raw: 'colored', text: 'colored' },
            { type: 'html', raw: '</span>', text: 'span' },
            { type: 'html', raw: '</div>', text: 'div' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toHaveLength(1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).attributes).toEqual({ class: 'wrapper' })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).tokens?.[0].attributes).toEqual({ style: 'color: red' })
    })

    it('should handle malformed HTML gracefully', () => {
        const tokens: Token[] = [
            { type: 'html', raw: '<div>', text: 'div' },
            { type: 'text', raw: 'unclosed', text: 'unclosed' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toEqual(tokens)
    })

    it('should process multiple sibling elements', () => {
        const tokens: Token[] = [
            { type: 'html', raw: '<div>', text: 'div' },
            { type: 'text', raw: 'first', text: 'first' },
            { type: 'html', raw: '</div>', text: 'div' },
            { type: 'html', raw: '<span>', text: 'span' },
            { type: 'text', raw: 'second', text: 'second' },
            { type: 'html', raw: '</span>', text: 'span' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toHaveLength(2)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).tag).toBe('div')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[1] as any).tag).toBe('span')
    })

    it('should handle recursive token processing', () => {
        const tokens: Token[] = [
            { type: 'html', raw: '<div>', text: 'div' },
            {
                type: 'paragraph',
                raw: 'nested paragraph',
                text: 'nested paragraph',
                tokens: [
                    { type: 'html', raw: '<em>', text: 'em' },
                    { type: 'text', raw: 'emphasized', text: 'emphasized' },
                    { type: 'html', raw: '</em>', text: 'em' }
                ]
            },
            { type: 'html', raw: '</div>', text: 'div' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toHaveLength(1)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).tag).toBe('div')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((result[0] as any).tokens?.[0].tokens?.[0].tag).toBe('em')
    })

    it('should handle empty token arrays', () => {
        expect(processHtmlTokens([])).toEqual([])
    })

    it('should preserve non-HTML tokens', () => {
        const tokens: Token[] = [
            { type: 'text', raw: 'text', text: 'text' },
            { type: 'code', raw: 'code', text: 'code' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toEqual(tokens)
    })

    it('should handle mismatched tags', () => {
        const tokens: Token[] = [
            { type: 'html', raw: '<div>', text: 'div' },
            { type: 'text', raw: 'content', text: 'content' },
            { type: 'html', raw: '</span>', text: 'span' }
        ]

        const result = processHtmlTokens(tokens)
        expect(result).toEqual(tokens)
    })
})
