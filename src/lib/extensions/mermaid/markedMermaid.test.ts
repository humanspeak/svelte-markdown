import type { TokenizerExtension } from 'marked'
import { describe, expect, it } from 'vitest'
import { markedMermaid } from './markedMermaid.js'

function getTokenizerDef(): TokenizerExtension {
    const ext = markedMermaid()
    return ext.extensions![0] as TokenizerExtension
}

describe('markedMermaid', () => {
    it('should return a valid MarkedExtension', () => {
        const ext = markedMermaid()
        expect(ext).toBeDefined()
        expect(ext.extensions).toBeDefined()
        expect(ext.extensions).toHaveLength(1)
    })

    it('should define a block-level extension named "mermaid"', () => {
        const def = getTokenizerDef()
        expect(def.name).toBe('mermaid')
        expect(def.level).toBe('block')
    })

    describe('start()', () => {
        it('should return the index of a mermaid fence', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, 'some text\n```mermaid\ngraph TD\n```')
            expect(result).toBe(10)
        })

        it('should return undefined when no mermaid fence is present', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, 'just regular text')
            expect(result).toBeUndefined()
        })

        it('should return 0 when mermaid fence is at the start', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, '```mermaid\ngraph TD\n```')
            expect(result).toBe(0)
        })

        it('should return undefined for empty string', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, '')
            expect(result).toBeUndefined()
        })

        it('should not match case-insensitive variants', () => {
            const def = getTokenizerDef()
            expect(def.start!.call({} as never, '```Mermaid\ngraph TD\n```')).toBeUndefined()
            expect(def.start!.call({} as never, '```MERMAID\ngraph TD\n```')).toBeUndefined()
        })

        it('should not match partial fence like ```mermaidx', () => {
            const def = getTokenizerDef()
            // start() just checks for ```mermaid substring — it will match, but
            // tokenizer() will reject it since ```mermaidx\n doesn't match the regex
            const result = def.start!.call({} as never, '```mermaidx\ngraph TD\n```')
            expect(result).toBe(0)
        })
    })

    describe('tokenizer()', () => {
        it('should tokenize a fenced mermaid block', () => {
            const def = getTokenizerDef()
            const src = '```mermaid\ngraph TD\n    A --> B\n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('mermaid')
            expect(token!.raw).toBe(src)
            expect(token!.text).toBe('graph TD\n    A --> B')
        })

        it('should trim whitespace from the diagram text', () => {
            const def = getTokenizerDef()
            const src = '```mermaid\n  graph TD  \n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('graph TD')
        })

        it('should return undefined for non-mermaid content', () => {
            const def = getTokenizerDef()
            const src = '```javascript\nconsole.log("hi")\n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeUndefined()
        })

        it('should return undefined for plain text', () => {
            const def = getTokenizerDef()
            const token = def.tokenizer.call({} as never, 'just plain text', [])
            expect(token).toBeUndefined()
        })

        it('should handle multi-line diagram content', () => {
            const def = getTokenizerDef()
            const diagram = 'sequenceDiagram\n    A->>B: Hello\n    B->>A: Hi'
            const src = `\`\`\`mermaid\n${diagram}\n\`\`\``
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe(diagram)
        })

        it('should return undefined for empty string', () => {
            const def = getTokenizerDef()
            const token = def.tokenizer.call({} as never, '', [])
            expect(token).toBeUndefined()
        })

        it('should return empty text for an empty mermaid block', () => {
            const def = getTokenizerDef()
            const src = '```mermaid\n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('')
            expect(token!.raw).toBe(src)
        })

        it('should return undefined for unclosed mermaid fence', () => {
            const def = getTokenizerDef()
            const src = '```mermaid\ngraph TD\n    A --> B'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeUndefined()
        })

        it('should not match case-insensitive variants', () => {
            const def = getTokenizerDef()
            expect(def.tokenizer.call({} as never, '```Mermaid\ngraph TD\n```', [])).toBeUndefined()
            expect(def.tokenizer.call({} as never, '```MERMAID\ngraph TD\n```', [])).toBeUndefined()
        })

        it('should not match ```mermaidx (extra characters after mermaid)', () => {
            const def = getTokenizerDef()
            const src = '```mermaidx\ngraph TD\n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeUndefined()
        })

        it('should only match from the start of the string', () => {
            const def = getTokenizerDef()
            const src = 'prefix ```mermaid\ngraph TD\n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeUndefined()
        })

        it('should match only the first closing fence', () => {
            const def = getTokenizerDef()
            const src = '```mermaid\ngraph TD\n```\nextra content\n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.raw).toBe('```mermaid\ngraph TD\n```')
            expect(token!.text).toBe('graph TD')
        })

        it('should handle diagram text with special characters', () => {
            const def = getTokenizerDef()
            const src = '```mermaid\ngraph TD\n    A["Node with (parens) & <angles>"]\n```'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('graph TD\n    A["Node with (parens) & <angles>"]')
        })

        it('should return a new object on each call', () => {
            const def = getTokenizerDef()
            const src = '```mermaid\ngraph TD\n```'
            const token1 = def.tokenizer.call({} as never, src, [])
            const token2 = def.tokenizer.call({} as never, src, [])
            expect(token1).not.toBe(token2)
            expect(token1).toEqual(token2)
        })
    })

    describe('factory', () => {
        it('should return a new extension object on each call', () => {
            const ext1 = markedMermaid()
            const ext2 = markedMermaid()
            expect(ext1).not.toBe(ext2)
            expect(ext1.extensions![0].name).toBe(ext2.extensions![0].name)
        })
    })
})
