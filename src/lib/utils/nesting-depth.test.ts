import { Lexer, type Token } from 'marked'
import { describe, expect, it, vi } from 'vitest'
import { buildParserOptions } from './extension-options.js'
import {
    clampNestingDepth,
    DEFAULT_MAX_NESTING_DEPTH,
    INLINE_DEPTH_ALLOWANCE,
    isStackOverflow,
    plainTextTokens,
    resolveMaxNestingDepth
} from './nesting-depth.js'
import { lexAndClean } from './parse-and-cache.js'
import { ProvenanceCollector } from './streaming-provenance.js'

type Node = Token & { tokens?: Node[]; items?: Node[]; tag?: string }

const leaf = (raw: string) => ({ type: 'text', raw, text: raw, escaped: false })
const textParagraph = (raw: string) => ({ type: 'paragraph', raw, text: raw, tokens: [leaf(raw)] })

/**
 * Tokens of `type` nested directly inside one another, following the first
 * match at each level; `step` reaches the next level (default: `.tokens`).
 */
const chain = (
    tokens: Node[] | undefined,
    type: string,
    step: (node: Node) => Node[] | undefined = (node) => node.tokens
): Node[] => {
    const found: Node[] = []
    for (let level = tokens; level;) {
        const next = level.find((token) => token.type === type)
        if (!next) break
        found.push(next)
        level = step(next)
    }
    return found
}

const chainOf = (tokens: Node[] | undefined, type: string) => chain(tokens, type).length
/** Nested lists, following the last item of each list. */
const nestedLists = (tokens: Node[] | undefined) =>
    chain(tokens, 'list', (list) => list.items!.at(-1)!.tokens)
const listChain = (tokens: Node[] | undefined) => nestedLists(tokens).length

const quotes = (n: number) => '> '.repeat(n) + 'deep'
const lists = (n: number, item = 'item') =>
    Array.from({ length: n }, (_, i) => '  '.repeat(i) + '- ' + item).join('\n')
const tags = (n: number) => '<div>'.repeat(n) + 'deep' + '</div>'.repeat(n)

describe('resolveMaxNestingDepth', () => {
    it('defaults when unset or invalid', () => {
        expect(resolveMaxNestingDepth(undefined)).toBe(DEFAULT_MAX_NESTING_DEPTH)
        expect(resolveMaxNestingDepth(0)).toBe(DEFAULT_MAX_NESTING_DEPTH)
        expect(resolveMaxNestingDepth(-3)).toBe(DEFAULT_MAX_NESTING_DEPTH)
        expect(resolveMaxNestingDepth(NaN)).toBe(DEFAULT_MAX_NESTING_DEPTH)
        expect(resolveMaxNestingDepth('8')).toBe(DEFAULT_MAX_NESTING_DEPTH)
    })

    it('accepts positive numbers and Infinity', () => {
        expect(resolveMaxNestingDepth(4)).toBe(4)
        expect(resolveMaxNestingDepth(4.9)).toBe(4)
        expect(resolveMaxNestingDepth(Infinity)).toBe(Infinity)
    })
})

describe('isStackOverflow', () => {
    const named = (name: string, message: string) => Object.assign(new Error(message), { name })

    it('recognises every engine’s stack-exhaustion error', () => {
        // V8 and JavaScriptCore
        expect(isStackOverflow(new RangeError('Maximum call stack size exceeded'))).toBe(true)
        expect(isStackOverflow(new RangeError('Maximum call stack size exceeded.'))).toBe(true)
        // SpiderMonkey (Firefox)
        expect(isStackOverflow(named('InternalError', 'too much recursion'))).toBe(true)
        // V8 compiling a regular expression with no stack left
        expect(
            isStackOverflow(new SyntaxError('Invalid regular expression: /a/: Stack overflow'))
        ).toBe(true)
    })

    it('rejects every other error', () => {
        expect(isStackOverflow(new RangeError('Invalid count value: -1'))).toBe(false)
        expect(isStackOverflow(new RangeError('Invalid array length'))).toBe(false)
        expect(isStackOverflow(named('InternalError', 'allocation size overflow'))).toBe(false)
        expect(isStackOverflow(new SyntaxError('Unexpected token'))).toBe(false)
        expect(isStackOverflow(new TypeError('Maximum call stack size exceeded'))).toBe(false)
        expect(isStackOverflow('Maximum call stack size exceeded')).toBe(false)
        expect(isStackOverflow(undefined)).toBe(false)
    })
})

describe('plainTextTokens', () => {
    it('wraps block source in a paragraph covering the whole source', () => {
        expect(plainTextTokens('> > x', false)).toEqual([textParagraph('> > x')])
    })

    it('returns a bare text token for inline source and nothing for empty source', () => {
        expect(plainTextTokens('*x*', true)).toEqual([leaf('*x*')])
        expect(plainTextTokens('', false)).toEqual([])
    })
})

describe('clampNestingDepth', () => {
    it('leaves shallow documents untouched', () => {
        const source = '# Title\n\n> quote with **bold**\n\n- a\n  - b\n\n| h |\n| - |\n| c |\n'
        const expected = new Lexer().lex(source)
        const actual = clampNestingDepth(new Lexer().lex(source), DEFAULT_MAX_NESTING_DEPTH)
        expect(actual).toEqual(expected)
    })

    it('does nothing when the limit is Infinity', () => {
        const tokens = clampNestingDepth(new Lexer().lex(quotes(40)), Infinity) as Node[]
        expect(chainOf(tokens, 'blockquote')).toBe(40)
    })

    it('replaces an over-deep blockquote with a text paragraph', () => {
        const tokens = clampNestingDepth(new Lexer().lex('> > > deep'), 2) as Node[]
        const inner = tokens[0].tokens![0]
        expect(inner.type).toBe('blockquote')
        expect(inner.tokens).toEqual([textParagraph('> deep')])
    })

    it('keeps the formatting of content inside the deepest allowed blockquote', () => {
        const source =
            '> '.repeat(16) + '# Head\n' + '> '.repeat(16) + '\n' + '> '.repeat(16) + '**bold** x'
        const tokens = clampNestingDepth(new Lexer().lex(source), 16) as Node[]
        expect(chainOf(tokens, 'blockquote')).toBe(16)
        const inner = chain(tokens, 'blockquote').at(-1)!
        expect(inner.tokens!.map((token) => token.type)).toEqual(['heading', 'space', 'paragraph'])
        expect(inner.tokens![2].tokens![0].type).toBe('strong')
    })

    it('keeps the formatting of the deepest allowed list item', () => {
        const tokens = clampNestingDepth(new Lexer().lex(lists(8, '**item**')), 16) as Node[]
        const nested = nestedLists(tokens)
        expect(nested).toHaveLength(8)
        const deepestText = nested.at(-1)!.items![0].tokens![0]
        expect(deepestText.tokens![0].type).toBe('strong')
    })

    it('replaces a whole list with a text paragraph once its items would not fit', () => {
        const tokens = clampNestingDepth(new Lexer().lex(lists(3)), 2) as Node[]
        const itemTokens = tokens[0].items![0].tokens!
        expect(itemTokens.some((token) => token.type === 'list')).toBe(false)
        expect(itemTokens.at(-1)).toEqual(textParagraph('- item\n  - item'))
    })

    it('wraps a replaced top-level block in a paragraph', () => {
        expect([...clampNestingDepth(new Lexer().lex('- a\n- b'), 1)]).toEqual([
            textParagraph('- a\n- b')
        ])
    })

    it('gives inline formatting a small allowance past the block limit', () => {
        const nested = (n: number) => '<b>'.repeat(n) + 'x' + '</b>'.repeat(n)
        const allowed = lexAndClean(
            nested(2 + INLINE_DEPTH_ALLOWANCE),
            { maxNestingDepth: 2 },
            false
        )
        expect(chainOf((allowed as Node[])[0].tokens, 'html')).toBe(2 + INLINE_DEPTH_ALLOWANCE)
        const capped = lexAndClean(nested(10), { maxNestingDepth: 2 }, false) as Node[]
        expect(chainOf(capped[0].tokens, 'html')).toBe(2 + INLINE_DEPTH_ALLOWANCE)
    })

    it('replaces over-deep inline content with a bare text token', () => {
        const tokens = clampNestingDepth(new Lexer().lex('**a *b* c**'), 1, false) as Node[]
        // paragraph (free) > strong (1, inline limit 5) > em (2): all kept.
        expect(tokens[0].tokens![0].tokens![1].type).toBe('em')
        const inline = clampNestingDepth(new Lexer().inlineTokens('**a *b* c**'), 1, true)
        expect((inline as Node[])[0].type).toBe('strong')
    })

    it('clamps content inside table cells', () => {
        const source = '| h |\n| --- |\n| ' + '<b>'.repeat(8) + 'x' + '</b>'.repeat(8) + ' |\n'
        const tokens = lexAndClean(source, { gfm: true, maxNestingDepth: 1 }, false) as Node[]
        expect(tokens[0].type).toBe('table')
        const cell = (tokens[0] as unknown as { rows: { tokens: Node[] }[][] }).rows[0][0]
        // table (1) > cell content (2..): inline limit 1 + 4 = 5 levels deep.
        expect(chainOf(cell.tokens, 'html')).toBe(4)
    })

    it('replaces a table nested past the limit', () => {
        const tokens = clampNestingDepth(new Lexer().lex('> > | a |\n> > | - |\n> > | b |\n'), 2)
        const inner = (tokens as Node[])[0].tokens![0].tokens![0]
        expect(inner.type).toBe('paragraph')
        expect(inner.raw).toContain('| a |')
    })

    it('invalidates streaming provenance before replacing a subtree', () => {
        const tokens = new Lexer().lex('> > deep')
        const provenance = new ProvenanceCollector()
        const invalidate = vi.spyOn(provenance, 'invalidate')
        clampNestingDepth(tokens, 1, false, provenance)
        expect(invalidate).toHaveBeenCalledTimes(1)
        expect((invalidate.mock.calls[0][0] as Node).type).toBe('blockquote')
    })
})

describe('lexAndClean nesting guard', () => {
    it.each([
        ['blockquotes', quotes(60), (t: Node[]) => chainOf(t, 'blockquote'), 16],
        ['lists', lists(40), listChain, 8],
        ['html tags', tags(60), (t: Node[]) => chainOf(t, 'html'), 16]
    ])('caps deeply nested %s at the default depth', (_name, source, measure, cap) => {
        expect(measure(lexAndClean(source, {}, false) as Node[])).toBe(cap)
    })

    it('honours a custom maxNestingDepth', () => {
        const capped = lexAndClean(quotes(60), { maxNestingDepth: 4 }, false) as Node[]
        expect(chainOf(capped, 'blockquote')).toBe(4)
        const open = lexAndClean(quotes(40), { maxNestingDepth: Infinity }, false) as Node[]
        expect(chainOf(open, 'blockquote')).toBe(40)
    })

    it('rebuilds the text of flattened html elements', () => {
        const source = '<div><p><span>x <br/><em></em> y</span></p></div>'
        const tokens = lexAndClean(source, { maxNestingDepth: 2 }, false) as Node[]
        expect(tokens[0].tokens![0].tokens![0]).toEqual(
            textParagraph('<span>x <br/><em></em> y</span>')
        )
    })

    it('keeps the children of an element whose unquoted attribute ends in a slash', () => {
        const source = '<div>see <a href=https://example.com/>click **me**</a> now</div>'
        const tokens = lexAndClean(source, { maxNestingDepth: 1 }, false) as Node[]
        const text = JSON.stringify(tokens)
        expect(text).toContain('click **me**</a>')
    })

    it('keeps over-deep text visible', () => {
        expect(JSON.stringify(lexAndClean(tags(60), {}, false))).toContain('deep')
    })

    it('falls back to plain text when the lexer itself overflows the stack', () => {
        const source = quotes(20000)
        expect(lexAndClean(source, {}, false)).toEqual([textParagraph(source)])
    })

    it.each([
        ['TypeError', () => new TypeError('boom')],
        ['unrelated RangeError', () => new RangeError('Invalid count value: -1')]
    ])('rethrows a %s from an extension', (_name, makeError) => {
        const options = {
            extensions: {
                block: [
                    () => {
                        throw makeError()
                    }
                ]
            }
        }
        expect(() => lexAndClean('x', options as never, false)).toThrow(makeError().message)
    })
})

describe('buildParserOptions', () => {
    it('resolves maxNestingDepth so equivalent values share one cache key', () => {
        expect(buildParserOptions({}, []).maxNestingDepth).toBe(DEFAULT_MAX_NESTING_DEPTH)
        expect(buildParserOptions({ maxNestingDepth: NaN }, []).maxNestingDepth).toBe(
            DEFAULT_MAX_NESTING_DEPTH
        )
        expect(buildParserOptions({ maxNestingDepth: Infinity }, []).maxNestingDepth).toBe(Infinity)
    })
})
