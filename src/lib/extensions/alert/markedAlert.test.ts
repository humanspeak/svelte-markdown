import type { TokenizerExtension } from 'marked'
import { describe, expect, it } from 'vitest'
import { markedAlert } from './markedAlert.js'

function getTokenizerDef(): TokenizerExtension {
    const ext = markedAlert()
    return ext.extensions![0] as TokenizerExtension
}

describe('markedAlert', () => {
    it('should return a valid MarkedExtension', () => {
        const ext = markedAlert()
        expect(ext).toBeDefined()
        expect(ext.extensions).toBeDefined()
        expect(ext.extensions).toHaveLength(1)
    })

    it('should define a block-level extension named "alert"', () => {
        const def = getTokenizerDef()
        expect(def.name).toBe('alert')
        expect(def.level).toBe('block')
    })

    describe('start()', () => {
        it('should return the index of an alert marker', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, 'some text\n> [!NOTE]\n> Content')
            expect(result).toBe(10)
        })

        it('should return undefined when no alert marker is present', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, 'just regular text')
            expect(result).toBeUndefined()
        })

        it('should return 0 when alert marker is at the start', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, '> [!NOTE]\n> Content')
            expect(result).toBe(0)
        })

        it('should return undefined for empty string', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, '')
            expect(result).toBeUndefined()
        })

        it('should match regular blockquote that starts with > [!', () => {
            const def = getTokenizerDef()
            const result = def.start!.call({} as never, '> [!UNKNOWN]\n> Content')
            expect(result).toBe(0)
        })
    })

    describe('tokenizer()', () => {
        it('should tokenize a NOTE alert', () => {
            const def = getTokenizerDef()
            const src = '> [!NOTE]\n> Useful information.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('alert')
            expect(token!.alertType).toBe('note')
            expect(token!.text).toBe('Useful information.')
        })

        it('should tokenize a TIP alert', () => {
            const def = getTokenizerDef()
            const src = '> [!TIP]\n> Helpful advice.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.alertType).toBe('tip')
            expect(token!.text).toBe('Helpful advice.')
        })

        it('should tokenize an IMPORTANT alert', () => {
            const def = getTokenizerDef()
            const src = '> [!IMPORTANT]\n> Key information.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.alertType).toBe('important')
            expect(token!.text).toBe('Key information.')
        })

        it('should tokenize a WARNING alert', () => {
            const def = getTokenizerDef()
            const src = '> [!WARNING]\n> Urgent info.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.alertType).toBe('warning')
            expect(token!.text).toBe('Urgent info.')
        })

        it('should tokenize a CAUTION alert', () => {
            const def = getTokenizerDef()
            const src = '> [!CAUTION]\n> Risky action.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.alertType).toBe('caution')
            expect(token!.text).toBe('Risky action.')
        })

        it('should be case-insensitive for alert type', () => {
            const def = getTokenizerDef()
            const src = '> [!note]\n> Lowercase.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.alertType).toBe('note')
        })

        it('should handle mixed case alert types', () => {
            const def = getTokenizerDef()
            const src = '> [!Note]\n> Mixed case.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.alertType).toBe('note')
        })

        it('should reject unknown alert types', () => {
            const def = getTokenizerDef()
            const src = '> [!UNKNOWN]\n> Content.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeUndefined()
        })

        it('should handle multi-line alert content', () => {
            const def = getTokenizerDef()
            const src = '> [!NOTE]\n> Line one.\n> Line two.\n> Line three.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('Line one.\nLine two.\nLine three.')
        })

        it('should strip leading > from content lines', () => {
            const def = getTokenizerDef()
            const src = '> [!TIP]\n> First line\n> Second line'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('First line\nSecond line')
        })

        it('should handle content with > and a space', () => {
            const def = getTokenizerDef()
            const src = '> [!NOTE]\n> Content here'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('Content here')
        })

        it('should return undefined for plain text', () => {
            const def = getTokenizerDef()
            const token = def.tokenizer.call({} as never, 'just plain text', [])
            expect(token).toBeUndefined()
        })

        it('should return undefined for regular blockquote', () => {
            const def = getTokenizerDef()
            const src = '> Just a normal blockquote'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeUndefined()
        })

        it('should return undefined for empty string', () => {
            const def = getTokenizerDef()
            const token = def.tokenizer.call({} as never, '', [])
            expect(token).toBeUndefined()
        })

        it('should only match from the start of the string', () => {
            const def = getTokenizerDef()
            const src = 'prefix > [!NOTE]\n> Content'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeUndefined()
        })

        it('should handle alert with empty body', () => {
            const def = getTokenizerDef()
            const src = '> [!NOTE]\n>'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('')
        })

        it('should return a new object on each call', () => {
            const def = getTokenizerDef()
            const src = '> [!NOTE]\n> Content'
            const token1 = def.tokenizer.call({} as never, src, [])
            const token2 = def.tokenizer.call({} as never, src, [])
            expect(token1).not.toBe(token2)
            expect(token1).toEqual(token2)
        })

        it('should include raw in token', () => {
            const def = getTokenizerDef()
            const src = '> [!WARNING]\n> Be careful.'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.raw).toBe(src)
        })
    })

    describe('factory', () => {
        it('should return a new extension object on each call', () => {
            const ext1 = markedAlert()
            const ext2 = markedAlert()
            expect(ext1).not.toBe(ext2)
            expect(ext1.extensions![0].name).toBe(ext2.extensions![0].name)
        })
    })
})
