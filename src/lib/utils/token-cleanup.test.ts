import type { Token } from 'marked'
import { describe, expect, it } from 'vitest'
import { isHtmlOpenTag, shrinkHtmlTokens } from './token-cleanup.js'

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

            expect((result[0] as any).tokens).toHaveLength(1)

            expect((result[0] as any).tokens?.[0].tokens).toHaveLength(1)
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

            expect((result[0] as any).tokens).toHaveLength(1)

            expect((result[0] as any).tokens?.[0].tokens).toHaveLength(1)
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
                expect((token as any).tokens).toHaveLength(1)
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

            expect((result[0] as any).tag).toBe('div')

            expect((result[0] as any).tokens).toHaveLength(2)
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

            expect(result).toHaveLength(1)

            expect((result[0] as any).tokens).toHaveLength(2)

            expect((result[0] as any).tokens[1].attributes).toEqual({ style: 'color: hotpink' })

            expect((result[0] as any).tokens[1].tag).toEqual('span')
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

            expect((result[0] as any).tag).toEqual('details')

            expect((result[0] as any).tokens).toHaveLength(2)
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

        it('should process HTML tokens within table cells', () => {
            const tokens: Token[] = [
                {
                    type: 'table',
                    raw: '| HTML |\n|------|\n| <strong>bold</strong> |',
                    header: [
                        {
                            text: 'HTML',
                            tokens: [{ type: 'text', raw: 'HTML', text: 'HTML' }]
                        }
                    ],
                    rows: [
                        [
                            {
                                text: '<strong>bold</strong>',
                                tokens: [
                                    { type: 'html', raw: '<strong>', text: '<strong>' },
                                    { type: 'text', raw: 'bold', text: 'bold' },
                                    { type: 'html', raw: '</strong>', text: '</strong>' }
                                ]
                            }
                        ]
                    ]
                }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)

            expect((result[0] as any).rows[0][0].tokens[0].type).toBe('html')

            expect((result[0] as any).rows[0][0].tokens[0].tag).toBe('strong')
        })

        it('should handle list items missing tokens by injecting empty arrays', () => {
            const tokens: Token[] = [
                {
                    type: 'list',
                    raw: '- a',
                    items: [{ type: 'list_item', raw: '- a', text: 'a' }]
                }
            ]
            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            const list = result[0] as Token & { items: any[] }
            expect(Array.isArray(list.items)).toBe(true)
            expect(list.items[0].tokens).toEqual([])
        })

        it('should handle table cells missing tokens in header and rows', () => {
            const tokens: Token[] = [
                {
                    type: 'table',
                    raw: '| H |\n| - |\n| C |',
                    header: [{ text: 'H' }],
                    rows: [[{ text: 'C' }]]
                }
            ]
            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            const table = result[0] as any
            expect(Array.isArray(table.header)).toBe(true)
            expect(table.header[0].tokens).toEqual([])
            expect(Array.isArray(table.rows)).toBe(true)
            expect(table.rows[0][0].tokens).toEqual([])
        })

        it('should keep html token unchanged when it does not contain a tag', () => {
            const tokens: Token[] = [{ type: 'html', raw: 'not-a-tag', text: 'not-a-tag' }]
            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ type: 'html', raw: 'not-a-tag' })
        })
        it('should add listItemIndex to each list item', () => {
            const tokens: Token[] = [
                {
                    type: 'list',
                    raw: '- item1\n- item2\n- item3',
                    items: [
                        { type: 'list_item', raw: '- item1', text: 'item1', tokens: [] },
                        { type: 'list_item', raw: '- item2', text: 'item2', tokens: [] },
                        { type: 'list_item', raw: '- item3', text: 'item3', tokens: [] }
                    ]
                }
            ]
            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0].type).toBe('list')
            const listToken = result[0] as Token & { items: any[] }
            // Check that each item has the correct listItemIndex
            expect(listToken.items[0].listItemIndex).toBe(0)
            expect(listToken.items[1].listItemIndex).toBe(1)
            expect(listToken.items[2].listItemIndex).toBe(2)
        })

        it('should format individual self-closing HTML tags properly', () => {
            const tokens: Token[] = [
                { type: 'codespan', raw: '`key=10`', text: 'key=10' },
                { type: 'html', raw: '<br>', text: '<br>' },
                { type: 'codespan', raw: '`key>=2024-01-01`', text: 'key>=2024-01-01' }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(3)

            // First token should remain unchanged codespan
            expect(result[0]).toMatchObject({
                type: 'codespan',
                raw: '`key=10`',
                text: 'key=10'
            })

            // Second token should be formatted as self-closing br
            expect(result[1]).toMatchObject({
                type: 'html',
                raw: '<br/>',
                tag: 'br'
            })

            // Third token should remain unchanged codespan
            expect(result[2]).toMatchObject({
                type: 'codespan',
                raw: '`key>=2024-01-01`',
                text: 'key>=2024-01-01'
            })
        })

        it('should leave already self-closing tags unchanged', () => {
            const tokens: Token[] = [{ type: 'html', raw: '<br/>', text: '<br/>' }]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ type: 'html', raw: '<br/>' })
        })
    })
})
