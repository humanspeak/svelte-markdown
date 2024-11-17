import type { Token } from 'marked'
import { describe, expect, it } from 'vitest'
import { isHtmlOpenTag, shrinkHtmlTokens } from './token-cleanup'

describe('Token Cleanup Utilities', () => {
    describe('isHtmlOpenTag', () => {
        it('should correctly identify opening HTML tags', () => {
            expect(isHtmlOpenTag('<div>')).toEqual({ tag: 'div', isOpening: true })
            expect(isHtmlOpenTag('<custom-element>')).toEqual({
                tag: 'custom-element',
                isOpening: true
            })
            expect(isHtmlOpenTag('<p id="para">')).toEqual({ tag: 'p', isOpening: true })
            expect(isHtmlOpenTag('<div class="test">')).toEqual({ tag: 'div', isOpening: true })
            expect(isHtmlOpenTag('<span style="color: hotpink">')).toEqual({
                tag: 'span',
                isOpening: true
            })
        })

        it('should correctly identify closing HTML tags', () => {
            expect(isHtmlOpenTag('</div>')).toEqual({ tag: 'div', isOpening: false })
            expect(isHtmlOpenTag('</custom-element>')).toEqual({
                tag: 'custom-element',
                isOpening: false
            })
        })

        it('should return null for invalid HTML', () => {
            expect(isHtmlOpenTag('not html')).toBeNull()
            expect(isHtmlOpenTag('<>')).toBeNull()
            expect(isHtmlOpenTag('')).toBeNull()
        })
    })

    describe('shrinkHtmlTokens', () => {
        it('should handle basic HTML token shrinking', () => {
            const tokens: Token[] = [
                { type: 'html', raw: '<div>', text: 'div' },
                { type: 'text', raw: 'content', text: 'content' },
                { type: 'html', raw: '</div>', text: 'div' }
            ]

            const result = shrinkHtmlTokens(tokens)
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

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0].tokens).toHaveLength(1)
            expect(result[0].tokens?.[0].tokens).toHaveLength(1)
        })

        it('should handle nested Same HTML structures', () => {
            const tokens: Token[] = [
                { type: 'html', raw: '<div>', text: 'div' },
                { type: 'html', raw: '<div>', text: 'div' },
                { type: 'text', raw: 'nested', text: 'nested' },
                { type: 'html', raw: '</div>', text: 'div' },
                { type: 'html', raw: '</div>', text: 'div' }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0].tokens).toHaveLength(1)
            expect(result[0].tokens?.[0].tokens).toHaveLength(1)
        })

        it('should handle multiple sibling HTML elements', () => {
            const tokens: Token[] = [
                { type: 'html', raw: '<div>', text: 'div' },
                { type: 'text', raw: 'first', text: 'first' },
                { type: 'html', raw: '</div>', text: 'div' },
                { type: 'html', raw: '<div>', text: 'div' },
                { type: 'text', raw: 'second', text: 'second' },
                { type: 'html', raw: '</div>', text: 'div' }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(2)
            result.forEach((token) => {
                expect(token.tokens).toHaveLength(1)
            })
        })

        it('should handle complex nested structures with attributes', () => {
            const tokens: Token[] = [
                {
                    type: 'html',
                    raw: '<div class="outer container" id="super-outer">',
                    text: 'div'
                },
                { type: 'html', raw: '<p id="para">', text: 'p' },
                { type: 'text', raw: 'paragraph', text: 'paragraph' },
                { type: 'html', raw: '</p>', text: 'p' },
                { type: 'html', raw: '<span class="inner">', text: 'span' },
                { type: 'text', raw: 'span text', text: 'span text' },
                { type: 'html', raw: '</span>', text: 'span' },
                { type: 'html', raw: '</div>', text: 'div' }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0].tag).toBe('div')
            expect(result[0].tokens).toHaveLength(2)
        })

        it('should handle malformed HTML gracefully', () => {
            const tokens: Token[] = [
                { type: 'html', raw: '<div>', text: 'div' },
                { type: 'text', raw: 'unclosed content', text: 'unclosed content' }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(2)
        })

        it('should handle tags with attrinutes that have spaces in them', () => {
            const tokens: Token[] = [
                {
                    type: 'paragraph',
                    raw: 'Happy coding! <span style="color: hotpink">♥</span>',
                    text: 'Happy coding! <span style="color: hotpink">♥</span>',
                    tokens: [
                        {
                            type: 'text',
                            raw: 'Happy coding! ',
                            text: 'Happy coding! ',
                            escaped: false
                        },
                        {
                            type: 'html',
                            raw: '<span style="color: hotpink">',
                            inLink: false,
                            inRawBlock: false,
                            block: false,
                            text: '<span style="color: hotpink">'
                        },
                        {
                            type: 'text',
                            raw: '♥',
                            text: '♥',
                            escaped: false
                        },
                        {
                            type: 'html',
                            raw: '</span>',
                            inLink: false,
                            inRawBlock: false,
                            block: false,
                            text: '</span>'
                        }
                    ]
                }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result[0].tokens).toHaveLength(2)
            expect(result[0].tokens[1].attributes).toEqual({ style: 'color: hotpink' })
            expect(result[0].tokens[1].tag).toEqual('span')
        })

        it('should break up multiple html tags that are in the same html block', () => {
            const tokens: Token[] = [
                {
                    type: 'html',
                    block: true,
                    raw: "<details>\n<summary>Want to see something cool?</summary>\nHere's a hidden surprise! 🎉\n</details>\n\n",
                    pre: false,
                    text: "<details>\n<summary>Want to see something cool?</summary>\nHere's a hidden surprise! 🎉\n</details>\n\n"
                }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0].tag).toEqual('details')
            expect(result[0].tokens).toHaveLength(2)
        })

        it('should handle empty token arrays', () => {
            expect(shrinkHtmlTokens([])).toHaveLength(0)
        })

        it('should preserve non-HTML tokens', () => {
            const tokens: Token[] = [
                { type: 'text', raw: 'text', text: 'text' },
                { type: 'code', raw: 'code', text: 'code' },
                { type: 'space', raw: ' ', text: ' ' }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toEqual(tokens)
        })

        it('should handle performance with large token arrays', () => {
            const generateLargeTokenArray = (size: number): Token[] => {
                const tokens: Token[] = []
                for (let i = 0; i < size; i++) {
                    tokens.push(
                        { type: 'html', raw: '<div>', text: 'div' },
                        { type: 'text', raw: `content${i}`, text: `content${i}` },
                        { type: 'html', raw: '</div>', text: 'div' }
                    )
                }
                return tokens
            }

            const largeTokenArray = generateLargeTokenArray(1000)
            const startTime = performance.now()
            const result = shrinkHtmlTokens(largeTokenArray)
            const endTime = performance.now()

            expect(result).toHaveLength(1000)
            expect(endTime - startTime).toBeLessThan(1000) // Should process in under 1 second
        })
    })
})
