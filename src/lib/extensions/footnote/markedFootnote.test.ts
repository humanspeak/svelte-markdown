import { Marked, type Token, type TokenizerExtension, type Tokens } from 'marked'
import { describe, expect, it } from 'vitest'
import { markedFootnote } from './markedFootnote.js'

interface FootnoteSectionToken {
    type: 'footnoteSection'
    raw: string
    footnotes: Array<{ id: string; text: string }>
}

const isFootnoteSectionToken = (token: Token): token is Token & FootnoteSectionToken =>
    token.type === 'footnoteSection' && 'footnotes' in token && Array.isArray(token.footnotes)

const isCodeToken = (token: Token): token is Tokens.Code =>
    token.type === 'code' && 'text' in token && typeof token.text === 'string'

function getTokenizerDefs(): { ref: TokenizerExtension; section: TokenizerExtension } {
    const ext = markedFootnote()
    return {
        ref: ext.extensions![0] as TokenizerExtension,
        section: ext.extensions![1] as TokenizerExtension
    }
}

describe('markedFootnote', () => {
    it('preserves blocks after a footnote definition', () => {
        const source = 'Body[^n].\n\n[^n]: Note.\n\nAfter paragraph.\n\n# Heading'
        const tokens = new Marked(markedFootnote()).lexer(source)
        const section = tokens.find((token) => token.type === 'footnoteSection')

        expect(section).toBeDefined()
        expect(section && isFootnoteSectionToken(section)).toBe(true)
        if (!section || !isFootnoteSectionToken(section)) {
            throw new Error('Missing footnote section')
        }
        expect(section.footnotes).toEqual([{ id: 'n', text: 'Note.' }])
        expect(section.raw).not.toContain('After paragraph')
        expect(section.raw).not.toContain('# Heading')
        expect(
            tokens.some((token) => token.type === 'paragraph' && token.text === 'After paragraph.')
        ).toBe(true)
        expect(tokens.some((token) => token.type === 'heading' && token.text === 'Heading')).toBe(
            true
        )
    })

    it('should return a valid MarkedExtension', () => {
        const ext = markedFootnote()
        expect(ext).toBeDefined()
        expect(ext.extensions).toBeDefined()
        expect(ext.extensions).toHaveLength(2)
    })

    it('should define an inline footnoteRef and a block footnoteSection', () => {
        const { ref, section } = getTokenizerDefs()
        expect(ref.name).toBe('footnoteRef')
        expect(ref.level).toBe('inline')
        expect(section.name).toBe('footnoteSection')
        expect(section.level).toBe('block')
    })

    describe('footnoteRef', () => {
        describe('start()', () => {
            it('should return the index of a footnote reference', () => {
                const { ref } = getTokenizerDefs()
                const result = ref.start!.call({} as never, 'some text[^1] here')
                expect(result).toBe(9)
            })

            it('should return undefined when no footnote reference is present', () => {
                const { ref } = getTokenizerDefs()
                const result = ref.start!.call({} as never, 'just regular text')
                expect(result).toBeUndefined()
            })

            it('should return 0 when footnote reference is at the start', () => {
                const { ref } = getTokenizerDefs()
                const result = ref.start!.call({} as never, '[^1] at start')
                expect(result).toBe(0)
            })

            it('should return undefined for empty string', () => {
                const { ref } = getTokenizerDefs()
                const result = ref.start!.call({} as never, '')
                expect(result).toBeUndefined()
            })
        })

        describe('tokenizer()', () => {
            it('should tokenize a numeric footnote reference', () => {
                const { ref } = getTokenizerDefs()
                const token = ref.tokenizer.call({} as never, '[^1]', [])
                expect(token).toBeDefined()
                expect(token!.type).toBe('footnoteRef')
                expect(token!.id).toBe('1')
                expect(token!.raw).toBe('[^1]')
            })

            it('should tokenize an alphanumeric footnote reference', () => {
                const { ref } = getTokenizerDefs()
                const token = ref.tokenizer.call({} as never, '[^note1]', [])
                expect(token).toBeDefined()
                expect(token!.id).toBe('note1')
            })

            it('should not tokenize a footnote definition', () => {
                const { ref } = getTokenizerDefs()
                const token = ref.tokenizer.call({} as never, '[^1]: definition', [])
                expect(token).toBeUndefined()
            })

            it('should return undefined for plain text', () => {
                const { ref } = getTokenizerDefs()
                const token = ref.tokenizer.call({} as never, 'just text', [])
                expect(token).toBeUndefined()
            })

            it('should return undefined for empty string', () => {
                const { ref } = getTokenizerDefs()
                const token = ref.tokenizer.call({} as never, '', [])
                expect(token).toBeUndefined()
            })

            it('should only match from the start of the string', () => {
                const { ref } = getTokenizerDefs()
                const token = ref.tokenizer.call({} as never, 'prefix [^1]', [])
                expect(token).toBeUndefined()
            })

            it('should return a new object on each call', () => {
                const { ref } = getTokenizerDefs()
                const token1 = ref.tokenizer.call({} as never, '[^1]', [])
                const token2 = ref.tokenizer.call({} as never, '[^1]', [])
                expect(token1).not.toBe(token2)
                expect(token1).toEqual(token2)
            })

            it('should handle hyphenated ids', () => {
                const { ref } = getTokenizerDefs()
                const token = ref.tokenizer.call({} as never, '[^my-note]', [])
                expect(token).toBeDefined()
                expect(token!.id).toBe('my-note')
            })
        })
    })

    describe('footnoteSection', () => {
        describe('start()', () => {
            it('should return the index of a footnote definition', () => {
                const { section } = getTokenizerDefs()
                const result = section.start!.call({} as never, 'some text\n[^1]: Definition here')
                expect(result).toBe(10)
            })

            it('should return undefined when no footnote definition is present', () => {
                const { section } = getTokenizerDefs()
                const result = section.start!.call({} as never, 'just regular text')
                expect(result).toBeUndefined()
            })

            it('should return 0 when footnote definition is at the start', () => {
                const { section } = getTokenizerDefs()
                const result = section.start!.call({} as never, '[^1]: Definition')
                expect(result).toBe(0)
            })

            it('should return undefined for empty string', () => {
                const { section } = getTokenizerDefs()
                const result = section.start!.call({} as never, '')
                expect(result).toBeUndefined()
            })

            it('only finds definitions at block-line starts', () => {
                const { section } = getTokenizerDefs()
                expect(
                    section.start!.call({} as never, 'prose [^n]: not a definition')
                ).toBeUndefined()
                expect(section.start!.call({} as never, '    [^n]: indented code')).toBeUndefined()
                expect(section.start!.call({} as never, 'prose\n  [^n]: definition')).toBe(6)
            })
        })

        describe('tokenizer()', () => {
            it('should tokenize a single footnote definition', () => {
                const { section } = getTokenizerDefs()
                const src = '[^1]: This is the footnote content.'
                const token = section.tokenizer.call({} as never, src, [])
                expect(token).toBeDefined()
                expect(token!.type).toBe('footnoteSection')
                expect(token!.footnotes).toHaveLength(1)
                expect(token!.footnotes[0].id).toBe('1')
                expect(token!.footnotes[0].text).toBe('This is the footnote content.')
            })

            it('should tokenize multiple footnote definitions', () => {
                const { section } = getTokenizerDefs()
                const src = '[^1]: First footnote.\n[^2]: Second footnote.'
                const token = section.tokenizer.call({} as never, src, [])
                expect(token).toBeDefined()
                expect(token!.footnotes).toHaveLength(2)
                expect(token!.footnotes[0].id).toBe('1')
                expect(token!.footnotes[0].text).toBe('First footnote.')
                expect(token!.footnotes[1].id).toBe('2')
                expect(token!.footnotes[1].text).toBe('Second footnote.')
            })

            it('should handle alphanumeric footnote ids', () => {
                const { section } = getTokenizerDefs()
                const src = '[^note]: A named footnote.'
                const token = section.tokenizer.call({} as never, src, [])
                expect(token).toBeDefined()
                expect(token!.footnotes[0].id).toBe('note')
                expect(token!.footnotes[0].text).toBe('A named footnote.')
            })

            it('should return undefined for plain text', () => {
                const { section } = getTokenizerDefs()
                const token = section.tokenizer.call({} as never, 'just text', [])
                expect(token).toBeUndefined()
            })

            it('should return undefined for empty string', () => {
                const { section } = getTokenizerDefs()
                const token = section.tokenizer.call({} as never, '', [])
                expect(token).toBeUndefined()
            })

            it('should only match from the start of the string', () => {
                const { section } = getTokenizerDefs()
                const token = section.tokenizer.call({} as never, 'prefix [^1]: def', [])
                expect(token).toBeUndefined()
            })

            it('should include raw in token', () => {
                const { section } = getTokenizerDefs()
                const src = '[^1]: Content here.'
                const token = section.tokenizer.call({} as never, src, [])
                expect(token).toBeDefined()
                expect(token!.raw).toBe(src)
            })

            it('should return a new object on each call', () => {
                const { section } = getTokenizerDefs()
                const src = '[^1]: Content.'
                const token1 = section.tokenizer.call({} as never, src, [])
                const token2 = section.tokenizer.call({} as never, src, [])
                expect(token1).not.toBe(token2)
                expect(token1).toEqual(token2)
            })

            it.each([
                ['paragraph', 'After paragraph.'],
                ['heading', '# Heading'],
                ['list', '- Item'],
                ['fence', '```js\nconst answer = 42\n```'],
                ['HTML block', '<div>After</div>']
            ])('stops before a following %s block', (_name, suffix) => {
                const { section } = getTokenizerDefs()
                const src = `[^n]: Note.\n\n${suffix}`
                const token = section.tokenizer.call({} as never, src, [])

                expect(token).toBeDefined()
                expect(token!.raw).toBe('[^n]: Note.\n')
                expect(src.slice(token!.raw.length)).toBe(`\n${suffix}`)
            })

            it('supports empty bodies without swallowing the next block', () => {
                const { section } = getTokenizerDefs()
                const src = '[^empty]:   \n\nAfter.'
                const token = section.tokenizer.call({} as never, src, [])

                expect(token).toBeDefined()
                expect(token!.footnotes).toEqual([{ id: 'empty', text: '' }])
                expect(token!.raw).toBe('[^empty]:   \n')
                expect(src.slice(token!.raw.length)).toBe('\nAfter.')
            })

            it('groups adjacent definitions and keeps the first duplicate', () => {
                const { section } = getTokenizerDefs()
                const src = '[^n]: First.\n[^other]: Other.\n[^n]: Second.\n\nAfter.'
                const token = section.tokenizer.call({} as never, src, [])

                expect(token).toBeDefined()
                expect(token!.footnotes).toEqual([
                    { id: 'n', text: 'First.' },
                    { id: 'other', text: 'Other.' }
                ])
                expect(token!.raw).toBe('[^n]: First.\n[^other]: Other.\n[^n]: Second.\n')
                expect(src.slice(token!.raw.length)).toBe('\nAfter.')
            })

            it('accepts four-space and tab continuation lines', () => {
                const { section } = getTokenizerDefs()
                const src = '[^n]: First line\n    four spaces\n      six spaces\n\ttabbed\nAfter.'
                const token = section.tokenizer.call({} as never, src, [])

                expect(token).toBeDefined()
                expect(token!.footnotes).toEqual([
                    { id: 'n', text: 'First line\nfour spaces\n  six spaces\ntabbed' }
                ])
                expect(src.slice(token!.raw.length)).toBe('After.')
            })

            it('does not add a leading newline for a continuation-only body', () => {
                const { section } = getTokenizerDefs()
                const token = section.tokenizer.call(
                    {} as never,
                    '[^n]:\n      indented continuation',
                    []
                )

                expect(token?.footnotes).toEqual([{ id: 'n', text: '  indented continuation' }])
            })

            it('keeps blank lines only when an indented continuation follows', () => {
                const { section } = getTokenizerDefs()
                const src = '[^n]: First\n\n    Second\n\nAfter.'
                const token = section.tokenizer.call({} as never, src, [])

                expect(token).toBeDefined()
                expect(token!.footnotes).toEqual([{ id: 'n', text: 'First\n\nSecond' }])
                expect(token!.raw).toBe('[^n]: First\n\n    Second\n')
                expect(src.slice(token!.raw.length)).toBe('\nAfter.')
            })

            it('preserves CRLF in consumed raw source', () => {
                const { section } = getTokenizerDefs()
                const src = '[^n]: First\r\n    Second\r\n\r\nAfter.'
                const token = section.tokenizer.call({} as never, src, [])

                expect(token).toBeDefined()
                expect(token!.footnotes).toEqual([{ id: 'n', text: 'First\nSecond' }])
                expect(token!.raw).toBe('[^n]: First\r\n    Second\r\n')
                expect(src.slice(token!.raw.length)).toBe('\r\nAfter.')
            })

            it('does not tokenize definition-looking prose or indented code', () => {
                const { section } = getTokenizerDefs()
                expect(
                    section.tokenizer.call({} as never, 'prose [^n]: not a definition', [])
                ).toBeUndefined()
                expect(
                    section.tokenizer.call({} as never, '    [^n]: indented code', [])
                ).toBeUndefined()
            })

            it.each([0, 1, 2, 3])('accepts %i leading spaces', (spaces) => {
                const { section } = getTokenizerDefs()
                const src = `${' '.repeat(spaces)}[^n]: Note.`
                const token = section.tokenizer.call({} as never, src, [])

                expect(token?.raw).toBe(src)
                expect(token?.footnotes).toEqual([{ id: 'n', text: 'Note.' }])
            })
        })
    })

    it('leaves definition-looking text inside fenced code as code', () => {
        const source = '```text\n[^n]: not a definition\n```'
        const tokens = new Marked(markedFootnote()).lexer(source)

        expect(tokens).toHaveLength(1)
        expect(tokens[0].type).toBe('code')
        expect(isCodeToken(tokens[0])).toBe(true)
        if (!isCodeToken(tokens[0])) throw new Error('Expected a code token')
        expect(tokens[0].text).toBe('[^n]: not a definition')
    })

    describe('factory', () => {
        it('should return a new extension object on each call', () => {
            const ext1 = markedFootnote()
            const ext2 = markedFootnote()
            expect(ext1).not.toBe(ext2)
            expect(ext1.extensions![0].name).toBe(ext2.extensions![0].name)
            expect(ext1.extensions![1].name).toBe(ext2.extensions![1].name)
        })
    })
})
