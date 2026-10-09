import { Tokenizer, type MarkedExtension, type MarkedOptions, type Token } from 'marked'
import { describe, expect, it } from 'vitest'
import { buildParserOptions } from './extension-options.js'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'
import { ProvenanceCollector, sliceMapped } from './streaming-provenance.js'
import { reuseStableTokenArray, reuseStableTokenTree } from './streaming-token-reuse.js'

const leaves = (
    tokens: Token[],
    collector: ProvenanceCollector
): { text: string; origins: number[][] }[] => {
    const result: { text: string; origins: number[][] }[] = []
    const walk = (node: Record<string, unknown>) => {
        const children = node.tokens as Token[] | undefined
        if (children?.length)
            children.forEach((child) => walk(child as unknown as Record<string, unknown>))
        else if (typeof node.text === 'string') {
            const provenance = collector.get(node)
            expect(provenance?.exact, `exact leaf ${JSON.stringify(node.text)}`).toBe(true)
            expect(provenance?.text?.value).toBe(node.text)
            result.push({
                text: node.text,
                origins: Array.from({ length: node.text.length }, (_, i) =>
                    sliceMapped(provenance!.text!, i, i + 1).runs.flatMap((run) =>
                        run.sources.flatMap((span) => [span.start, span.end])
                    )
                )
            })
        }
        for (const key of ['items', 'header'])
            (Array.isArray(node[key]) ? (node[key] as Record<string, unknown>[]) : [])?.forEach(
                walk
            )
        ;(node.rows as Record<string, unknown>[][] | undefined)?.forEach((row) => row.forEach(walk))
    }
    tokens.forEach((token) => walk(token as unknown as Record<string, unknown>))
    return result
}
const parse = (source: string, options: MarkedOptions = { gfm: true }) => {
    const collector = new ProvenanceCollector()
    const tokens = lexAndClean(source, options, false, undefined, collector)
    return leaves(tokens, collector)
}
describe('grammar source provenance', () => {
    it('distinguishes the revealed bold a from the appended repeated a', () => {
        expect(parse('**a')).toEqual([
            {
                text: '**a',
                origins: [
                    [0, 1],
                    [1, 2],
                    [2, 3]
                ]
            }
        ])
        expect(parse('**a** a')).toEqual([
            { text: 'a', origins: [[2, 3]] },
            {
                text: ' a',
                origins: [
                    [5, 6],
                    [6, 7]
                ]
            }
        ])
    })
    it('uses label captures, never URL or repeated final text', () => {
        expect(parse('[a a](/a) a')).toEqual([
            {
                text: 'a a',
                origins: [
                    [1, 2],
                    [2, 3],
                    [3, 4]
                ]
            },
            {
                text: ' a',
                origins: [
                    [9, 10],
                    [10, 11]
                ]
            }
        ])
        expect(parse('[a\\]a](/a)')).toEqual([
            {
                text: 'a]a',
                origins: [
                    [1, 2],
                    [3, 4],
                    [4, 5]
                ]
            }
        ])
    })
    it('retains consumed offsets of dropped duplicate definitions', () => {
        expect(parse('[x]: /x\n[x]: /x\na')).toEqual([{ text: 'a', origins: [[16, 17]] }])
    })
})

describe('recursive built-in proof cases', () => {
    it.each([
        '> - a\n>   **a**\n',
        '- [x] a\n\ta',
        '> > a\n> lazy a\n> > a',
        '- a\n  - a\n    > a\n    > lazy a',
        '- a\n\n  a\n\n- a',
        '> a\n---\n> a',
        '| a | a\\|a |\n| - | - |\n| a | a |',
        '# a ###\n\na\r\n\r\na',
        '\\* &#97; &amp; &#x1F600; &#0; &#xD800;',
        '<DIV>a&amp;a&NotEqualTilde;&#x1F600;<BR>a</DIV>'
    ])('maps every supported leaf exactly: %j', (source) => {
        parse(source)
    })
})

const corpus = [
    '<DIV>a<SPAN>a',
    '<DIV>a<SPAN>a</SPAN></DIV>',
    '<DIV>  <BR> a </DIV>',
    '~~a~~ `a` a',
    '1. a\n   - a\n     a',
    '> > - a\n> lazy a\n> >   a',
    '> - a\nb\n>   a',
    '> - a\nlazy a\n>   a',
    '> > a\nlazy a\n> > a',
    '> - a\nb\n>   a\n>   **a**',
    '- [x] a\n\n  a\n\n- [ ] a',
    '> \ta\n> \ta',
    'a <SPAN>a&amp;a</SPAN> a',
    '**a** a',
    '[a a](/a) a',
    '[a\\]a](/a)',
    '> - a\n>   **a**\n',
    '- [x] a\n\ta',
    '> > a\n> lazy a\n> > a',
    '- a\n  - a\n    > a\n    > lazy a',
    '- a\n\n  a\n\n- a',
    '> a\n---\n> a',
    '| a | a\\|a |\n| - | - |\n| a | a |',
    '# a ###\n\na\r\n\r\na',
    '\\* &#97; &amp; &#x1F600; &#0; &#xD800;',
    '<DIV>a&amp;a&NotEqualTilde;&#x1F600;<BR>a</DIV>',
    '[x]: /x\n[x]: /x\na',
    '# a\n\n[a] [a] a\n\n[x]: /x\n\n[a]: /a'
]
describe('occurrence adoption and incremental bases', () => {
    it.each(corpus)('equals one-shot origins at every two-chunk split: %j', (source) => {
        const expected = parse(source)
        for (let split = 0; split <= source.length; split++) {
            const collector = new ProvenanceCollector()
            const parser = new IncrementalParser({ gfm: true }, collector)
            const previous = parser.update(source.slice(0, split)).tokens
            const next = parser.update(source)
            const occurrences = collector.capture(next.tokens)
            const adopted =
                next.reuseMode === 'tree'
                    ? reuseStableTokenTree(previous, next.tokens)
                    : reuseStableTokenArray(previous, next.tokens, next.divergeAt)
            collector.bind(
                adopted,
                occurrences,
                next.reuseMode === 'tree' ? 0 : next.reusedPrefixCount
            )
            expect(leaves(adopted, collector), `split ${split}`).toEqual(expected)
        }
    })
    it('binds a cloned parent and reused child from actual adoption helpers', () => {
        const collector = new ProvenanceCollector()
        const old = lexAndClean('**a** a', { gfm: true }, false, undefined, collector)
        const next = lexAndClean('**a** ab', { gfm: true }, false, undefined, collector, 20)
        const occurrences = collector.capture(next)
        const adopted = reuseStableTokenTree(old, next)
        expect(adopted[0]).not.toBe(next[0])
        expect((adopted[0] as { tokens: Token[] }).tokens[0]).toBe(
            (old[0] as { tokens: Token[] }).tokens[0]
        )
        collector.bind(adopted, occurrences)
        expect(leaves(adopted, collector)[0].origins).toEqual([[22, 23]])
        expect(Object.keys(adopted[0])).not.toContain('provenance')
    })
    it('does not remap completed roots on later appends', () => {
        const collector = new ProvenanceCollector()
        const parser = new IncrementalParser({ gfm: true }, collector)
        const first = parser.update('# Fixed\n\n**a')
        const stable = collector.get(first.tokens[0])
        collector.capture(first.tokens)
        const repeated = { ...collector.counters }
        collector.capture(first.tokens)
        expect(collector.counters.capturedNodes).toBe(repeated.capturedNodes)
        expect(collector.counters.projectedLeaves).toBe(repeated.projectedLeaves)
        const before = { ...collector.counters }
        const next = parser.update('# Fixed\n\n**a** a')
        const capturedBefore = collector.counters.capturedNodes
        collector.capture(next.tokens)
        expect(collector.counters.capturedNodes).toBe(capturedBefore)
        expect(collector.counters.captureCacheHits).toBeGreaterThan(before.captureCacheHits)
        expect(next.usedTailWindow).toBe(true)
        expect(collector.get(next.tokens[0])).toBe(stable)
        expect(collector.counters.mappedInputUnits - before.mappedInputUnits).toBeLessThan(20)
        expect(collector.counters.projectedLeaves - before.projectedLeaves).toBe(2)
    })
})

describe('additional transformation boundaries', () => {
    it.each([
        '> > a\nlazy a\n> > a',
        '> - a\nlazy a\n>   a',
        '- [x] a\n\n  a\n\n- [ ] a',
        'a\n    a',
        'a\n[x]: /x',
        '    a\n',
        '  ```\n    a\n a\n  ```',
        '<div> a </div>\n\n<BR>',
        'a <SPAN>a&amp;a</SPAN> a',
        '> \ta\n> \ta'
    ])('maps grammar boundary %j', (source) => {
        parse(source)
    })
    it('asserts exact repeated origins through quote, list, task, and table transforms', () => {
        expect(parse('> - a\n>   **a**\n')).toEqual([
            {
                text: 'a\n',
                origins: [
                    [4, 5],
                    [5, 6]
                ]
            },
            { text: 'a', origins: [[12, 13]] }
        ])
        expect(parse('- [x] a\n\ta')).toEqual([
            {
                text: 'a\n  a',
                origins: [
                    [6, 7],
                    [7, 8],
                    [8, 9],
                    [8, 9],
                    [9, 10]
                ]
            }
        ])
        expect(parse('| a | a\\|a |\n| - | - |\n| a | a |')).toEqual([
            { text: 'a', origins: [[2, 3]] },
            {
                text: 'a|a',
                origins: [
                    [6, 7],
                    [8, 9],
                    [9, 10]
                ]
            },
            { text: 'a', origins: [[25, 26]] },
            { text: 'a', origins: [[29, 30]] }
        ])
    })
    it('assigns both HTML entity codepoints the complete decoding event', () => {
        const result = parse('<div>&NotEqualTilde;</div>')[0]
        expect(result).toEqual({
            text: '≂̸',
            origins: [
                [5, 20],
                [5, 20]
            ]
        })
        expect(parse('a\r\n\r\na')).toEqual([
            { text: 'a', origins: [[0, 1]] },
            { text: 'a', origins: [[5, 6]] }
        ])
    })
    it('explicitly marks custom tokenizer results and descendants unknown', () => {
        const collector = new ProvenanceCollector()
        const tokens = lexAndClean(
            'a',
            {
                gfm: true,
                extensions: {
                    inline: [
                        function (src) {
                            return { type: 'text', raw: src, text: 'other' }
                        }
                    ],
                    block: [],
                    renderers: {},
                    childTokens: {}
                }
            },
            false,
            undefined,
            collector
        )
        expect(collector.get((tokens[0] as { tokens: Token[] }).tokens[0])?.exact).toBe(false)
    })
})

describe('normalized semantics and occurrence invalidation', () => {
    it.each(corpus)('preserves untracked token semantics: %j', (source) => {
        const collector = new ProvenanceCollector()
        const tracked = lexAndClean(source, { gfm: true }, false, undefined, collector)
        const plain = lexAndClean(source, { gfm: true }, false)
        expect(tracked).toEqual(plain)
    })
    it.each(['- a\n  - a\n    a', '> - a\n>   a', '- a\n\ta', '# a ###\n\n\ta', '> a\n---\n> a'])(
        'maps pedantic normalization at every split: %j',
        (source) => {
            const options = { pedantic: true, gfm: false }
            const expected = parse(source, options)
            for (let split = 0; split <= source.length; split++) {
                const collector = new ProvenanceCollector()
                const parser = new IncrementalParser(options, collector)
                parser.update(source.slice(0, split))
                const next = parser.update(source)
                expect(next.tokens).toEqual(lexAndClean(source, options, false))
                expect(leaves(next.tokens, collector), `split ${split}`).toEqual(expected)
            }
        }
    )
    it('rebuilds cached parents after a descendant mapping changes', () => {
        const collector = new ProvenanceCollector()
        const tokens = lexAndClean('**a**', { gfm: true }, false, undefined, collector)
        const old = collector.capture(tokens)
        const child = (tokens[0] as { tokens: Token[] }).tokens[0]
        const changed = { ...collector.get(child)!, exact: false }
        collector.set(child, changed)
        const before = collector.counters.capturedNodes
        const next = collector.capture(tokens)
        expect(next[0]).not.toBe(old[0])
        expect(next[0].tokens![0].exact).toBe(false)
        expect(collector.counters.capturedNodes).toBeGreaterThan(before)
    })
    it('retains exact original bases during targeted reference-root relexing', () => {
        const source = '# a\n\n[a] [a] a\n\n[x]: /x\n\n[a]: /a'
        const collector = new ProvenanceCollector()
        const parser = new IncrementalParser({ gfm: true }, collector)
        parser.update(source.slice(0, source.lastIndexOf('[a]:')))
        const next = parser.update(source)
        const result = leaves(next.tokens, collector)
        expect(result.filter((leaf) => leaf.text === 'a').map((leaf) => leaf.origins)).toEqual([
            [[2, 3]],
            [[6, 7]],
            [[10, 11]]
        ])
        expect(result.at(-1)).toEqual({
            text: ' a',
            origins: [
                [12, 13],
                [13, 14]
            ]
        })
    })
    it('maps repeated lazy list continuation leaves to their exact source units', () => {
        expect(parse('> - a\nlazy a\n>   a')).toEqual([
            {
                text: 'a\nlazy a',
                origins: [[4, 5], [], [6, 7], [7, 8], [8, 9], [9, 10], [10, 11], [11, 12]]
            },
            {
                text: '  a',
                origins: [
                    [15, 16],
                    [16, 17],
                    [17, 18]
                ]
            }
        ])
        expect(parse('> - a\nb\n>   a')).toEqual([
            {
                text: 'a\nb',
                origins: [[4, 5], [], [6, 7]]
            },
            {
                text: '  a',
                origins: [
                    [10, 11],
                    [11, 12],
                    [12, 13]
                ]
            }
        ])
    })
})

describe('continuation construction and cached rebinding', () => {
    it('records synthetic raw construction without inventing a source interval', () => {
        const source = '> - a\nlazy a\n>   a'
        const collector = new ProvenanceCollector()
        const tokens = lexAndClean(source, { gfm: true }, false, undefined, collector, 30)
        const raw = collector.get(tokens[0])!.raw!
        expect(raw.value).toBe('> - a\nlazy a\n\n>   a')
        expect(sliceMapped(raw, 5, 6).runs).toEqual([
            { outputStart: 0, outputEnd: 1, mode: 'synthetic', sources: [] }
        ])
        expect(leaves(tokens, collector)[0].origins[0]).toEqual([34, 35])
        expect(leaves(tokens, collector).at(-1)!.origins.at(-1)).toEqual([47, 48])
    })
    it('restores a previously captured parent after its shared child changed occurrence', () => {
        const collector = new ProvenanceCollector()
        const original = lexAndClean('**a** a', { gfm: true }, false, undefined, collector)
        const first = collector.capture(original)
        const parsed = lexAndClean('**a** ab', { gfm: true }, false, undefined, collector, 20)
        const second = collector.capture(parsed)
        const adopted = reuseStableTokenTree(original, parsed)
        collector.bind(adopted, second)
        expect(leaves(adopted, collector)[0].origins).toEqual([[22, 23]])
        collector.bind(original, first)
        expect(leaves(original, collector)[0].origins).toEqual([[2, 3]])
        const before = { ...collector.counters }
        collector.capture(original)
        expect(collector.counters.capturedNodes).toBe(before.capturedNodes)
    })
    it('preserves exact tab origins through pedantic normalization', () => {
        expect(parse('# a\tb', { pedantic: true, gfm: false })).toEqual([
            {
                text: 'a    b',
                origins: [
                    [2, 3],
                    [3, 4],
                    [3, 4],
                    [3, 4],
                    [3, 4],
                    [4, 5]
                ]
            }
        ])
        expect(parse('- a\n\ta', { pedantic: true, gfm: false })).toEqual([
            {
                text: 'a\na',
                origins: [
                    [2, 3],
                    [3, 4],
                    [5, 6]
                ]
            }
        ])
    })
})

describe('HTML raw occurrence mappings', () => {
    it.each(['<DIV>a<SPAN>a', '<DIV>a<SPAN>a</SPAN></DIV>', '<DIV>  <BR> a </DIV>', '<BR>'])(
        'maps normalized tags before cleanup: %j',
        (source) => {
            const collector = new ProvenanceCollector()
            const tokens = lexAndClean(source, { gfm: true }, false, undefined, collector)
            const visit = (token: Token) => {
                if (token.type === 'html') {
                    expect(collector.get(token)?.exact).toBe(true)
                    expect(collector.get(token)?.raw?.value).toBe(token.raw)
                }
                if ('tokens' in token && token.tokens) token.tokens.forEach(visit)
            }
            tokens.forEach(visit)
        }
    )
})

describe('completed subtree work accounting', () => {
    it('traverses only the reparsed tail when capturing a long completed history', () => {
        const prefix = Array.from({ length: 40 }, (_, i) => `# fixed **a** [a](/${i})\n\n`).join('')
        const collector = new ProvenanceCollector()
        const parser = new IncrementalParser({ gfm: true }, collector)
        const initial = parser.update(prefix + '**a')
        collector.capture(initial.tokens)
        const before = { ...collector.counters }
        const next = parser.update(prefix + '**a** a')
        expect(next.usedTailWindow).toBe(true)
        const afterParse = { ...collector.counters }
        collector.capture(next.tokens)
        expect(collector.counters.capturedNodes).toBe(afterParse.capturedNodes)
        expect(afterParse.capturedNodes - before.capturedNodes).toBe(4)
        expect(afterParse.projectedLeaves - before.projectedLeaves).toBe(2)
        expect(afterParse.mappedInputUnits - before.mappedInputUnits).toBeLessThan(20)
        expect(collector.counters.captureCacheHits - afterParse.captureCacheHits).toBe(
            next.tokens.length
        )
    })
})

describe('supplied tokenizer isolation', () => {
    it('does not instrument a shared tokenizer or infer exactness from matching raw', () => {
        const tokenizer = new Tokenizer()
        const original: Tokenizer['inlineText'] = (src) => ({
            type: 'text',
            raw: src,
            text: src,
            escaped: false
        })
        tokenizer.inlineText = original
        const collector = new ProvenanceCollector()
        const options = { gfm: true, tokenizer }
        for (let i = 0; i < 2; i++) {
            const tokens = lexAndClean('a', options, false, undefined, collector)
            const leaf = (tokens[0] as { tokens: Token[] }).tokens[0]
            expect(collector.get(leaf)?.exact).toBe(false)
            expect(Object.getOwnPropertyDescriptor(tokenizer, 'inlineText')?.value).toBe(original)
            expect(leaf).toMatchObject({ raw: 'a', text: 'a' })
        }
    })
})

describe('extension tokenizers', () => {
    // Shaped like marked-katex-extension: inline + block tokenizers with start hints.
    const katex: MarkedExtension = {
        extensions: [
            {
                name: 'inlineKatex',
                level: 'inline',
                start: (src: string) => src.indexOf('$'),
                tokenizer(src: string) {
                    const match = /^\$([^$\n]+?)\$/.exec(src)
                    if (match) return { type: 'inlineKatex', raw: match[0], text: match[1] }
                }
            },
            {
                name: 'blockKatex',
                level: 'block',
                start: (src: string) => src.indexOf('$$'),
                tokenizer(src: string) {
                    const match = /^\$\$\n([^$]+?)\n\$\$(?:\n|$)/.exec(src)
                    if (match) return { type: 'blockKatex', raw: match[0], text: match[1] }
                }
            }
        ]
    }
    const options = buildParserOptions({}, [katex])
    const describeLeaves = (tokens: Token[], collector: ProvenanceCollector) => {
        const result: { type: string; text: string; exact: boolean; start?: number }[] = []
        const walk = (node: Record<string, unknown>) => {
            const children = node.tokens as Token[] | undefined
            if (children?.length) children.forEach((child) => walk(child as never))
            else if (typeof node.text === 'string') {
                const provenance = collector.get(node)
                result.push({
                    type: node.type as string,
                    text: node.text,
                    exact: !!provenance?.exact,
                    start: provenance?.exact
                        ? provenance.text?.runs[0]?.sources[0]?.start
                        : undefined
                })
            }
            ;(node.items as Record<string, unknown>[] | undefined)?.forEach(walk)
        }
        tokens.forEach((token) => walk(token as never))
        return result
    }
    const source = 'Price is $x$ today\n\n$$\nE=mc^2\n$$\n\nPlain **text**\n\n- item $y$'

    it('keeps built-in text exact and marks only extension tokens unknown', () => {
        const collector = new ProvenanceCollector()
        const tokens = lexAndClean(source, options, false, undefined, collector)
        expect(tokens).toEqual(lexAndClean(source, options, false))
        expect(describeLeaves(tokens, collector)).toEqual([
            { type: 'text', text: 'Price is ', exact: true, start: 0 },
            { type: 'inlineKatex', text: 'x', exact: false, start: undefined },
            { type: 'text', text: ' today', exact: true, start: 12 },
            { type: 'blockKatex', text: 'E=mc^2', exact: false, start: undefined },
            { type: 'text', text: 'Plain ', exact: true, start: 34 },
            { type: 'text', text: 'text', exact: true, start: 42 },
            { type: 'text', text: 'item ', exact: true, start: 52 },
            { type: 'inlineKatex', text: 'y', exact: false, start: undefined }
        ])
    })

    it('matches the one-shot parse at every streaming split', () => {
        const collector = new ProvenanceCollector()
        const expected = describeLeaves(
            lexAndClean(source, options, false, undefined, collector),
            collector
        )
        for (let split = 0; split <= source.length; split++) {
            const streamed = new ProvenanceCollector()
            const parser = new IncrementalParser(buildParserOptions({}, [katex]), streamed)
            parser.update(source.slice(0, split))
            const next = parser.update(source)
            expect(describeLeaves(next.tokens, streamed), `split ${split}`).toEqual(expected)
        }
    })

    const opaqueSpans = (tokens: Token[], collector: ProvenanceCollector, text: string) => {
        const result: [string, string][] = []
        const walk = (node: Record<string, unknown>) => {
            const provenance = collector.get(node)
            if (provenance?.opaque)
                result.push([
                    node.type as string,
                    provenance.sourceSpans.map(({ start, end }) => text.slice(start, end)).join('')
                ])
            ;(node.tokens as Record<string, unknown>[] | undefined)?.forEach(walk)
            ;(node.items as Record<string, unknown>[] | undefined)?.forEach(walk)
        }
        tokens.forEach((token) => walk(token as never))
        return result
    }
    const nested = `${source}\n\n> quoted $q$ here\n\n1. first\n   $$\n   a+b\n   $$`

    it('records the source span of each top-level extension token', () => {
        const collector = new ProvenanceCollector()
        const tokens = lexAndClean(nested, options, false, undefined, collector)
        expect(opaqueSpans(tokens, collector, nested)).toEqual([
            ['inlineKatex', '$x$'],
            ['blockKatex', '$$\nE=mc^2\n$$\n'],
            ['inlineKatex', '$y$'],
            ['inlineKatex', '$q$'],
            // List indentation is stripped by the grammar, so the span skips it.
            ['blockKatex', '$$\na+b\n$$']
        ])
    })

    it('records the same extension spans at every streaming split', () => {
        const collector = new ProvenanceCollector()
        const expected = opaqueSpans(
            lexAndClean(nested, options, false, undefined, collector),
            collector,
            nested
        )
        for (let split = 0; split <= nested.length; split++) {
            const streamed = new ProvenanceCollector()
            const parser = new IncrementalParser(buildParserOptions({}, [katex]), streamed)
            parser.update(nested.slice(0, split))
            const next = parser.update(nested)
            expect(opaqueSpans(next.tokens, streamed, nested), `split ${split}`).toEqual(expected)
        }
    })

    it('keeps content an extension lexes for itself unknown', () => {
        const container: MarkedExtension = {
            extensions: [
                {
                    name: 'note',
                    level: 'block',
                    tokenizer(src: string) {
                        const match = /^:::\n([^:]+?)\n:::(?:\n|$)/.exec(src)
                        if (!match) return
                        const token = { type: 'note', raw: match[0], text: match[1], tokens: [] }
                        this.lexer.inline(match[1], token.tokens)
                        return token
                    }
                }
            ]
        }
        const noteOptions = buildParserOptions({}, [container])
        const collector = new ProvenanceCollector()
        const text = 'Before\n\n:::\ninside *em*\n:::\n\nAfter'
        const tokens = lexAndClean(text, noteOptions, false, undefined, collector)
        expect(tokens).toEqual(lexAndClean(text, noteOptions, false))
        expect(describeLeaves(tokens, collector).map(({ text, exact }) => [text, exact])).toEqual([
            ['Before', true],
            ['inside ', false],
            ['em', false],
            ['After', true]
        ])
        expect(opaqueSpans(tokens, collector, text)).toEqual([['note', ':::\ninside *em*\n:::\n']])
    })

    it('falls back to unknown for the whole parse when built-in text merges into an extension token', () => {
        const fakeText: MarkedExtension = {
            extensions: [
                {
                    name: 'bang',
                    level: 'inline',
                    tokenizer(src: string) {
                        if (src.startsWith('!!')) return { type: 'text', raw: '!!', text: 'bang' }
                    }
                }
            ]
        }
        const fakeOptions = buildParserOptions({}, [fakeText])
        const collector = new ProvenanceCollector()
        const text = 'a\n\n!!b'
        const tokens = lexAndClean(text, fakeOptions, false, undefined, collector)
        expect(tokens).toEqual(lexAndClean(text, fakeOptions, false))
        expect(describeLeaves(tokens, collector).map(({ text, exact }) => [text, exact])).toEqual([
            ['a', false],
            ['bangb', false]
        ])
        expect(opaqueSpans(tokens, collector, text)).toEqual([])
    })
})
