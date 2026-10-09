import { Lexer, type Token } from 'marked'
import { describe, expect, it } from 'vitest'
import { lexAndClean } from './parse-and-cache.js'
import {
    isFromUnterminatedHtmlBlock,
    isHtmlOpenTag,
    isUnterminatedHtmlBlock,
    shrinkHtmlTokens
} from './token-cleanup.js'

type TestListItem = Token & { tokens: Token[]; listItemIndex: number }
type TestTableCell = Token & { tokens: Token[] }

/** Fresh two-item `list` token fixture for identity-preservation tests. */
const buildListTokens = (): Token[] => [
    {
        type: 'list',
        raw: '- first\n- second',
        items: [
            {
                type: 'list_item',
                raw: '- first',
                text: 'first',
                tokens: [{ type: 'text', raw: 'first', text: 'first' }]
            },
            {
                type: 'list_item',
                raw: '- second',
                text: 'second',
                tokens: [{ type: 'text', raw: 'second', text: 'second' }]
            }
        ]
    }
]

/** Fresh single-row `table` token fixture for identity-preservation tests. */
const buildTableTokens = (): Token[] => [
    {
        type: 'table',
        raw: '| A | B |\n| - | - |\n| first | second |',
        header: [
            { text: 'A', tokens: [{ type: 'text', raw: 'A', text: 'A' }] },
            { text: 'B', tokens: [{ type: 'text', raw: 'B', text: 'B' }] }
        ],
        rows: [
            [
                { text: 'first', tokens: [{ type: 'text', raw: 'first', text: 'first' }] },
                { text: 'second', tokens: [{ type: 'text', raw: 'second', text: 'second' }] }
            ]
        ]
    }
]

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

        it('should lowercase tag names so pairing matches the nested htmlparser2 path', () => {
            expect(isHtmlOpenTag('<Widget>')).toEqual({ tag: 'widget', isOpening: true })
            expect(isHtmlOpenTag('</Widget>')).toEqual({ tag: 'widget', isOpening: false })
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

        it('should preserve unchanged list item identity across clean passes', () => {
            const tokens = buildListTokens()

            const firstClean = shrinkHtmlTokens(tokens)
            const firstList = firstClean[0] as Token & { items: TestListItem[] }
            const firstItem = firstList.items[0]
            const secondItem = firstList.items[1]

            const secondClean = shrinkHtmlTokens(firstClean)
            const secondList = secondClean[0] as Token & {
                items: TestListItem[]
            }

            expect(secondList.items[0]).toBe(firstItem)
            expect(secondList.items[1]).toBe(secondItem)
            expect(secondList.items[0].listItemIndex).toBe(0)
            expect(secondList.items[1].listItemIndex).toBe(1)
        })

        it('should preserve unchanged sibling list item identity when another item changes', () => {
            const tokens = buildListTokens()

            const firstClean = shrinkHtmlTokens(tokens)
            const firstList = firstClean[0] as Token & { items: TestListItem[] }
            const changedItem = firstList.items[0]
            const unchangedItem = firstList.items[1]
            changedItem.tokens = [
                { type: 'html', raw: '<strong>', text: '<strong>' },
                { type: 'text', raw: 'first', text: 'first' },
                { type: 'html', raw: '</strong>', text: '</strong>' }
            ]

            const secondClean = shrinkHtmlTokens(firstClean)
            const secondList = secondClean[0] as Token & {
                items: TestListItem[]
            }

            expect(secondList.items[0]).not.toBe(changedItem)
            expect(secondList.items[0].tokens[0]).toMatchObject({
                type: 'html',
                tag: 'strong'
            })
            expect(secondList.items[1]).toBe(unchangedItem)
        })

        it('should preserve unchanged table body cell identity across clean passes', () => {
            const tokens = buildTableTokens()

            const firstClean = shrinkHtmlTokens(tokens)
            const firstTable = firstClean[0] as Token & {
                rows: TestTableCell[][]
            }
            const firstCell = firstTable.rows[0][0]
            const secondCell = firstTable.rows[0][1]

            const secondClean = shrinkHtmlTokens(firstClean)
            const secondTable = secondClean[0] as Token & {
                rows: TestTableCell[][]
            }

            expect(secondTable.rows[0][0]).toBe(firstCell)
            expect(secondTable.rows[0][1]).toBe(secondCell)
        })

        it('should preserve unchanged sibling table body cell identity when another cell changes', () => {
            const tokens = buildTableTokens()

            const firstClean = shrinkHtmlTokens(tokens)
            const firstTable = firstClean[0] as Token & {
                rows: TestTableCell[][]
            }
            const changedCell = firstTable.rows[0][0]
            const unchangedCell = firstTable.rows[0][1]
            changedCell.tokens = [
                { type: 'html', raw: '<em>', text: '<em>' },
                { type: 'text', raw: 'first', text: 'first' },
                { type: 'html', raw: '</em>', text: '</em>' }
            ]

            const secondClean = shrinkHtmlTokens(firstClean)
            const secondTable = secondClean[0] as Token & {
                rows: TestTableCell[][]
            }

            expect(secondTable.rows[0][0]).not.toBe(changedCell)
            expect(secondTable.rows[0][0].tokens[0]).toMatchObject({
                type: 'html',
                tag: 'em'
            })
            expect(secondTable.rows[0][1]).toBe(unchangedCell)
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

        // Issue #383: custom tags written as `<widget />` must get structured
        // `.tag`/`.attributes` so Parser can dispatch `renderers.html`. The
        // void-element allowlist only decides whether to rewrite `>` to `/>`.
        it('attaches tag and attributes on self-closing custom tags', () => {
            const tokens: Token[] = [
                {
                    type: 'html',
                    raw: '<widget id="w" foo="bar" />',
                    text: '<widget id="w" foo="bar" />'
                }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                type: 'html',
                raw: '<widget id="w" foo="bar" />',
                tag: 'widget',
                attributes: { id: 'w', foo: 'bar' }
            })
        })

        it('lowercases self-closing custom tag names', () => {
            const result = shrinkHtmlTokens([
                { type: 'html', raw: '<Widget />', text: '<Widget />' }
            ])
            expect(result[0]).toMatchObject({ type: 'html', tag: 'widget' })
        })

        it('pairs mixed-case custom tags onto a lowercase tag name', () => {
            const tokens: Token[] = [
                { type: 'html', raw: '<Widget>', text: '<Widget>' },
                { type: 'text', raw: 'x', text: 'x' },
                { type: 'html', raw: '</widget>', text: '</widget>' }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({
                type: 'html',
                tag: 'widget',
                tokens: [{ type: 'text', raw: 'x', text: 'x' }]
            })
        })

        it('uses the same lowercase tag for inline pairing and nested htmlparser2', () => {
            const inline = shrinkHtmlTokens([
                { type: 'html', raw: '<Widget>', text: '<Widget>' },
                { type: 'text', raw: 'x', text: 'x' },
                { type: 'html', raw: '</Widget>', text: '</Widget>' }
            ])
            const nested = shrinkHtmlTokens([
                {
                    type: 'html',
                    raw: '<div><Widget>x</Widget></div>',
                    text: '<div><Widget>x</Widget></div>'
                }
            ])

            expect((inline[0] as Token & { tag: string }).tag).toBe('widget')
            const inner = (
                nested[0] as Token & { tokens: Array<Token & { tag?: string }> }
            ).tokens.find((token) => token.tag === 'widget')
            expect(inner).toBeDefined()
        })

        it('should escape quotes in attribute values when parsing HTML blocks', () => {
            const tokens: Token[] = [
                {
                    type: 'html',
                    block: true,
                    raw: '<div data-value="safe">content</div>',
                    pre: false,
                    text: '<div data-value="safe">content</div>'
                }
            ]

            const result = shrinkHtmlTokens(tokens)
            expect(result).toHaveLength(1)
            expect((result[0] as any).tag).toBe('div')
            // Attributes should be preserved
            expect((result[0] as any).attributes).toHaveProperty('data-value', 'safe')
        })

        // Pins the single-pass shape (issue #284). A multi-tag html token
        // arriving in a single marked emit must come out fully nested
        // *without* re-traversal — i.e. the inner descendants are reachable
        // strictly via the outer token's `tokens` field, not as siblings
        // in a flat result.
        it('should produce a single nested token from a multi-tag html block in one pass', () => {
            const tokens: Token[] = [
                {
                    type: 'html',
                    block: true,
                    raw: '<div class="card"><header><h3>Card</h3></header><p>Body <strong>bold</strong> tail</p><footer><small>id=1</small><br/></footer></div>',
                    pre: false,
                    text: '<div class="card"><header><h3>Card</h3></header><p>Body <strong>bold</strong> tail</p><footer><small>id=1</small><br/></footer></div>'
                }
            ]

            const result = shrinkHtmlTokens(tokens)

            // One nested root, not 8+ flat siblings
            expect(result).toHaveLength(1)
            const root = result[0] as Token & {
                tag: string
                tokens: Token[]
                attributes: Record<string, string>
            }
            expect(root.type).toBe('html')
            expect(root.tag).toBe('div')
            expect(root.attributes).toEqual({ class: 'card' })

            // Children are reached via root.tokens (single-pass nesting),
            // not present as additional top-level tokens
            const headerTok = root.tokens[0] as Token & { tag: string; tokens: Token[] }
            expect(headerTok.tag).toBe('header')
            const h3 = headerTok.tokens[0] as Token & { tag: string; tokens: Token[] }
            expect(h3.tag).toBe('h3')
            expect(h3.tokens[0]).toMatchObject({ type: 'text', text: 'Card' })

            const p = root.tokens[1] as Token & { tag: string; tokens: Token[] }
            expect(p.tag).toBe('p')
            // <strong>bold</strong> nested inside the <p>, with surrounding text
            expect(p.tokens.map((t) => (t as any).tag ?? (t as any).type)).toEqual([
                'text',
                'strong',
                'text'
            ])

            const footer = root.tokens[2] as Token & { tag: string; tokens: Token[] }
            expect(footer.tag).toBe('footer')
            // <br/> survives as a self-closing token inside the footer
            const br = footer.tokens[1] as Token & { tag: string; raw: string }
            expect(br.tag).toBe('br')
            expect(br.raw).toBe('<br/>')
        })
    })

    describe('root source lengths', () => {
        // The incremental parser maps root tokens back to source offsets by
        // summing `sourceLength ?? raw.length`. Cleanup rewrites some tokens'
        // `raw` (`<br>` -> `<br/>`, lowercased and re-serialized tags), so
        // every root it returns must still add up to the lexed source.
        const rootSourceLength = (tokens: Token[]): number =>
            tokens.reduce(
                (sum, token) =>
                    sum +
                    ((token as Token & { sourceLength?: number }).sourceLength ?? token.raw.length),
                0
            )

        it.each([
            '<br>',
            '<hr>',
            '<img src="/a.png" alt="a">',
            '<input disabled>',
            '<DIV CLASS="x">text</DIV>',
            '<div>\n\n**b**\n\n</div>',
            '<br/>',
            'Intro.\n\n<br>\n\n',
            '<p>a<br>b</p>\n',
            '<br>\n<hr>\n\n',
            '<span>a &amp; b</span> tail\n',
            '<DIV CLASS="x"><b>x</b>\n\ntext\n\n</DIV>\n'
        ])('root tokens of %j add up to the source length', (source) => {
            const tokens = shrinkHtmlTokens(new Lexer().lex(source))
            expect(rootSourceLength(tokens)).toBe(source.length)
        })

        it('does not change raw, tag, attributes or tokens of a void tag', () => {
            const [br] = shrinkHtmlTokens(new Lexer().lex('<br>')) as (Token & {
                tag: string
                attributes: Record<string, string>
                tokens: Token[]
                sourceLength: number
            })[]
            expect(br).toMatchObject({ raw: '<br/>', tag: 'br', attributes: {}, tokens: [] })
            expect(br.sourceLength).toBe(4)
        })
    })
    // Plan 008: cleanup records which roots came from an html block that is
    // still waiting for its terminator, without changing what it produces.
    describe('unterminated html blocks', () => {
        it('recognizes an html block still waiting for its terminator', () => {
            expect(isUnterminatedHtmlBlock('<!-- a comment')).toBe(true)
            expect(isUnterminatedHtmlBlock('<?pi\n<li>x</li>')).toBe(true)
            expect(isUnterminatedHtmlBlock('<!-- a comment -->')).toBe(false)
            expect(isUnterminatedHtmlBlock('<div>')).toBe(false)
        })

        it('marks every root expanded from an unterminated block', () => {
            const pi = shrinkHtmlTokens(new Lexer().lex('<?pi\n<li>x</li>\n\n'))
            expect(pi.map((token) => token.type)).toEqual(['text', 'space'])
            expect(isFromUnterminatedHtmlBlock(pi[0])).toBe(true)
            expect(isFromUnterminatedHtmlBlock(pi[1])).toBe(false)

            const comment = shrinkHtmlTokens(new Lexer().lex('<!--\n<hr>\n\n'))
            expect(comment[0]).toMatchObject({ type: 'html', raw: '<!--\n<hr/>', sourceLength: 9 })
            expect(isFromUnterminatedHtmlBlock(comment[0])).toBe(true)
        })

        it('does not mark roots of a terminated block or plain html', () => {
            for (const source of ['<!--\n<hr>\n-->\n\n', '<div><b>x</b></div>\n\n', '<br>\n\n']) {
                for (const token of shrinkHtmlTokens(new Lexer().lex(source))) {
                    expect(isFromUnterminatedHtmlBlock(token), source).toBe(false)
                }
            }
        })

        it('leaves the one-shot parse of both reproductions unchanged', () => {
            const options = { gfm: true }
            // Captured before the marker was added (plan 008 Step 3).
            const expected: [string, unknown[]][] = [
                [
                    '<?pi\n<li>x</li>\n',
                    [{ type: 'text', raw: 'x\n', text: 'x\n', sourceLength: 16 }]
                ],
                [
                    '<?pi\n<li>x</li>\n\n',
                    [
                        { type: 'text', raw: 'x', text: 'x', sourceLength: 15 },
                        { type: 'space', raw: '\n\n' }
                    ]
                ],
                [
                    '<?pi\n<li>x</li>\n\n[',
                    [{ type: 'text', raw: 'x\n\n[', text: 'x\n\n[', sourceLength: 18 }]
                ],
                [
                    '<!--\n<hr>\n',
                    [
                        {
                            type: 'html',
                            block: true,
                            raw: '<!--\n<hr>\n',
                            pre: false,
                            text: '<!--\n<hr>\n',
                            tag: 'hr',
                            attributes: {},
                            tokens: []
                        }
                    ]
                ],
                [
                    '<!--\n<hr>\n\n',
                    [
                        {
                            type: 'html',
                            block: true,
                            raw: '<!--\n<hr/>',
                            pre: false,
                            text: '<!--\n<hr>',
                            sourceLength: 9,
                            tag: 'hr',
                            attributes: {},
                            tokens: []
                        },
                        { type: 'space', raw: '\n\n' }
                    ]
                ],
                [
                    '<!--\n<hr>\n\n!',
                    [
                        {
                            type: 'html',
                            block: true,
                            raw: '<!--\n<hr>\n\n!',
                            pre: false,
                            text: '<!--\n<hr>\n\n!',
                            tag: 'hr',
                            attributes: {},
                            tokens: []
                        }
                    ]
                ]
            ]
            for (const [source, tokens] of expected) {
                expect(
                    JSON.parse(JSON.stringify(lexAndClean(source, options, false))),
                    source
                ).toEqual(tokens)
            }
        })
    })
})
