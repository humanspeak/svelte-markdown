import Html from '$lib/renderers/html/index.js'
import {
    Blockquote,
    Br,
    Code,
    Codespan,
    Del,
    Em,
    Escape,
    Heading,
    Hr,
    Image,
    Link,
    List,
    ListItem,
    Paragraph,
    RawText,
    Strong,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Text
} from '$lib/renderers/index.js'
import {
    defaultOptions,
    defaultRenderers,
    Lexer,
    Slugger,
    type Renderers
} from '$lib/utils/markdown-parser.js'
import { describe, expect, it } from 'vitest'

describe('defaultRenderers', () => {
    it('has all expected keys from the Renderers type', () => {
        const expectedKeys: (keyof Renderers)[] = [
            'html',
            'rawtext',
            'escape',
            'heading',
            'paragraph',
            'blockquote',
            'code',
            'list',
            'listitem',
            'hr',
            'table',
            'tablehead',
            'tablebody',
            'tablerow',
            'tablecell',
            'text',
            'link',
            'image',
            'em',
            'strong',
            'codespan',
            'br',
            'del',
            'orderedlistitem',
            'unorderedlistitem'
        ]
        for (const key of expectedKeys) {
            expect(defaultRenderers).toHaveProperty(key)
        }
    })

    it('has exactly 25 keys (all Renderers type keys)', () => {
        expect(Object.keys(defaultRenderers)).toHaveLength(25)
    })

    it('maps heading to the Heading component', () => {
        expect(defaultRenderers.heading).toBe(Heading)
    })

    it('maps paragraph to the Paragraph component', () => {
        expect(defaultRenderers.paragraph).toBe(Paragraph)
    })

    it('maps code to the Code component', () => {
        expect(defaultRenderers.code).toBe(Code)
    })

    it('maps list to the List component', () => {
        expect(defaultRenderers.list).toBe(List)
    })

    it('maps link to the Link component', () => {
        expect(defaultRenderers.link).toBe(Link)
    })

    it('maps image to the Image component', () => {
        expect(defaultRenderers.image).toBe(Image)
    })

    it('maps html to the Html tag-to-component map (not a single component)', () => {
        expect(defaultRenderers.html).toBe(Html)
        expect(typeof defaultRenderers.html).toBe('object')
        expect(defaultRenderers.html).toHaveProperty('div')
        expect(defaultRenderers.html).toHaveProperty('span')
    })

    it('maps orderedlistitem and unorderedlistitem to null', () => {
        expect(defaultRenderers.orderedlistitem).toBeNull()
        expect(defaultRenderers.unorderedlistitem).toBeNull()
    })

    it('maps all non-null keys to truthy components', () => {
        for (const [key, value] of Object.entries(defaultRenderers)) {
            if (key === 'orderedlistitem' || key === 'unorderedlistitem') continue
            expect(value, `${key} should be truthy`).toBeTruthy()
        }
    })

    it('has no extra keys beyond what Renderers defines', () => {
        const definedKeys: (keyof Renderers)[] = [
            'html',
            'rawtext',
            'escape',
            'heading',
            'paragraph',
            'blockquote',
            'code',
            'list',
            'listitem',
            'hr',
            'table',
            'tablehead',
            'tablebody',
            'tablerow',
            'tablecell',
            'text',
            'link',
            'image',
            'em',
            'strong',
            'codespan',
            'br',
            'del',
            'orderedlistitem',
            'unorderedlistitem'
        ]
        for (const key of Object.keys(defaultRenderers)) {
            expect(definedKeys).toContain(key)
        }
    })

    it('spot-checks remaining renderer mappings', () => {
        expect(defaultRenderers.text).toBe(Text)
        expect(defaultRenderers.em).toBe(Em)
        expect(defaultRenderers.strong).toBe(Strong)
        expect(defaultRenderers.codespan).toBe(Codespan)
        expect(defaultRenderers.del).toBe(Del)
        expect(defaultRenderers.br).toBe(Br)
        expect(defaultRenderers.hr).toBe(Hr)
        expect(defaultRenderers.blockquote).toBe(Blockquote)
        expect(defaultRenderers.escape).toBe(Escape)
        expect(defaultRenderers.rawtext).toBe(RawText)
        expect(defaultRenderers.listitem).toBe(ListItem)
        expect(defaultRenderers.table).toBe(Table)
        expect(defaultRenderers.tablehead).toBe(TableHead)
        expect(defaultRenderers.tablebody).toBe(TableBody)
        expect(defaultRenderers.tablerow).toBe(TableRow)
        expect(defaultRenderers.tablecell).toBe(TableCell)
    })
})

describe('defaultOptions', () => {
    it('has correct standard marked defaults', () => {
        expect(defaultOptions.gfm).toBe(true)
        expect(defaultOptions.breaks).toBe(false)
        expect(defaultOptions.pedantic).toBe(false)
        expect(defaultOptions.async).toBe(false)
        expect(defaultOptions.silent).toBe(false)
    })

    it('has correct custom options', () => {
        expect(defaultOptions.headerIds).toBe(true)
        expect(defaultOptions.headerPrefix).toBe('')
    })

    it('has null for renderer, tokenizer, and walkTokens', () => {
        expect(defaultOptions.renderer).toBeNull()
        expect(defaultOptions.tokenizer).toBeNull()
        expect(defaultOptions.walkTokens).toBeNull()
    })

    it('has headerPrefix as empty string, not undefined', () => {
        expect(defaultOptions.headerPrefix).toBeDefined()
        expect(typeof defaultOptions.headerPrefix).toBe('string')
        expect(defaultOptions.headerPrefix).toBe('')
    })
})

describe('re-exports', () => {
    it('Slugger is a constructor that can be instantiated', () => {
        const slugger = new Slugger()
        expect(slugger).toBeDefined()
        expect(typeof slugger.slug).toBe('function')
    })

    it('Slugger.slug() produces a slug from a string', () => {
        const slugger = new Slugger()
        expect(slugger.slug('Hello World')).toBe('hello-world')
    })

    it('Lexer is a class with a static lex method', () => {
        expect(typeof Lexer.lex).toBe('function')
    })

    it('Lexer.lex() produces a non-empty token array from simple markdown', () => {
        const tokens = Lexer.lex('# Hello\n\nWorld')
        expect(Array.isArray(tokens)).toBe(true)
        expect(tokens.length).toBeGreaterThan(0)
    })
})
