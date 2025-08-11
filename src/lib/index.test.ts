import { describe, expect, it } from 'vitest'
import SvelteMarkdown, {
    Html,
    Unsupported,
    UnsupportedHTML,
    // new helpers
    allowHtmlOnly,
    allowRenderersOnly,
    buildUnsupportedHTML,
    buildUnsupportedRenderers,
    defaultRenderers,
    excludeHtmlOnly,
    excludeRenderersOnly,
    htmlRendererKeys,
    rendererKeys,
    type SvelteMarkdownOptions,
    type SvelteMarkdownProps,
    type Token,
    type TokensList
} from './index.js'

describe('index.ts exports', () => {
    it('should export SvelteMarkdown as default export', () => {
        expect(SvelteMarkdown).toBeDefined()
        expect(typeof SvelteMarkdown).toBe('function')
    })

    it('should export all required types', () => {
        // We can't directly test types at runtime, but we can verify the imports work
        const dummyOptions: SvelteMarkdownOptions = {
            breaks: true,
            headerIds: true
        }
        expect(dummyOptions).toBeDefined()

        // Create dummy token to verify type exports
        const dummyToken: Token = {
            type: 'paragraph',
            raw: 'test',
            text: 'test'
        }
        expect(dummyToken).toBeDefined()

        // Create dummy tokens list to verify type exports
        const dummyTokensList: TokensList = Object.assign([dummyToken], { links: {} as any })
        expect(dummyTokensList).toBeDefined()
        expect(Array.isArray(dummyTokensList)).toBe(true)
    })

    it('should export SvelteMarkdownProps type', () => {
        // Verify props type can be used
        const dummyProps: SvelteMarkdownProps = {
            source: '# Test',
            options: {
                breaks: true
            },
            isInline: false
        }
        expect(dummyProps).toBeDefined()
        expect(dummyProps.source).toBe('# Test')
    })

    it('should export defaultRenderers map and rendererKeys', () => {
        expect(defaultRenderers).toBeTruthy()
        expect(typeof defaultRenderers).toBe('object')
        expect(defaultRenderers.paragraph).toBeTypeOf('function')
        expect(defaultRenderers.link).toBeTypeOf('function')
        expect(defaultRenderers.html).toBeTruthy()
        expect(typeof defaultRenderers.html).toBe('object')

        expect(rendererKeys).toBeTruthy()
        expect(Array.isArray(rendererKeys)).toBe(true)
        expect(rendererKeys.length).toBeGreaterThan(0)
        expect(rendererKeys).toContain('paragraph')
        expect(rendererKeys).not.toContain('html')
        expect(rendererKeys).toEqual(Object.keys(defaultRenderers).filter((k) => k !== 'html'))
    })

    it('should export Html map and htmlRendererKeys', () => {
        expect(Html).toBeTruthy()
        expect(typeof Html).toBe('object')
        expect(Html.div).toBeTypeOf('function')
        expect(Html.a).toBeTypeOf('function')
        // Sanity: UnsupportedHTML is a separate export, not part of Html map
        expect((Html as Record<string, unknown>).UnsupportedHTML).toBeUndefined()

        expect(htmlRendererKeys).toBeTruthy()
        expect(Array.isArray(htmlRendererKeys)).toBe(true)
        expect(htmlRendererKeys.length).toBeGreaterThan(0)
        expect(htmlRendererKeys).toContain('div')
        expect(htmlRendererKeys).toContain('a')
        expect(htmlRendererKeys).toEqual(Object.keys(Html))
    })

    it('should export Unsupported and UnsupportedHTML components', () => {
        expect(Unsupported).toBeTruthy()
        expect(typeof Unsupported).toBe('function')
        expect(UnsupportedHTML).toBeTruthy()
        expect(typeof UnsupportedHTML).toBe('function')
    })

    it('should export helper functions for overrides', () => {
        expect(typeof allowHtmlOnly).toBe('function')
        expect(typeof buildUnsupportedHTML).toBe('function')
        expect(typeof excludeHtmlOnly).toBe('function')
        expect(typeof allowRenderersOnly).toBe('function')
        expect(typeof buildUnsupportedRenderers).toBe('function')
        expect(typeof excludeRenderersOnly).toBe('function')
    })

    it('should re-export key lists (public names)', () => {
        expect(Array.isArray(htmlRendererKeys)).toBe(true)
        expect(Array.isArray(rendererKeys)).toBe(true)
        expect(htmlRendererKeys.length).toBeGreaterThan(0)
        expect(rendererKeys.length).toBeGreaterThan(0)
    })
})
