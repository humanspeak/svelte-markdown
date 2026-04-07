import { describe, expect, it } from 'vitest'
import { defaultSanitizeAttributes, defaultSanitizeUrl, type SanitizeContext } from './sanitize.js'

const linkCtx: SanitizeContext = { type: 'link', tag: 'a' }
const imgCtx: SanitizeContext = { type: 'image', tag: 'img' }
const htmlACtx: SanitizeContext = { type: 'html', tag: 'a' }
const htmlDivCtx: SanitizeContext = { type: 'html', tag: 'div' }
const htmlImgCtx: SanitizeContext = { type: 'html', tag: 'img' }

describe('defaultSanitizeUrl', () => {
    describe('safe protocols', () => {
        it('allows http URLs', () => {
            expect(defaultSanitizeUrl('http://example.com', linkCtx)).toBe('http://example.com')
        })

        it('allows https URLs', () => {
            expect(defaultSanitizeUrl('https://example.com/path?q=1', linkCtx)).toBe(
                'https://example.com/path?q=1'
            )
        })

        it('allows mailto links', () => {
            expect(defaultSanitizeUrl('mailto:user@example.com', linkCtx)).toBe(
                'mailto:user@example.com'
            )
        })

        it('allows tel links', () => {
            expect(defaultSanitizeUrl('tel:+1234567890', linkCtx)).toBe('tel:+1234567890')
        })
    })

    describe('relative URLs', () => {
        it('allows hash anchors', () => {
            expect(defaultSanitizeUrl('#section', linkCtx)).toBe('#section')
        })

        it('allows root-relative paths', () => {
            expect(defaultSanitizeUrl('/path/to/page', linkCtx)).toBe('/path/to/page')
        })

        it('allows query strings', () => {
            expect(defaultSanitizeUrl('?foo=bar', linkCtx)).toBe('?foo=bar')
        })

        it('allows dot-relative paths', () => {
            expect(defaultSanitizeUrl('./file.html', linkCtx)).toBe('./file.html')
            expect(defaultSanitizeUrl('../parent/file.html', linkCtx)).toBe('../parent/file.html')
        })

        it('allows bare paths without protocol', () => {
            expect(defaultSanitizeUrl('path/to/page', linkCtx)).toBe('path/to/page')
        })
    })

    describe('dangerous protocols', () => {
        it('blocks javascript: protocol', () => {
            expect(defaultSanitizeUrl('javascript:alert("XSS")', linkCtx)).toBe('')
        })

        it('blocks mixed-case javascript: protocol', () => {
            expect(defaultSanitizeUrl('JaVaScRiPt:alert("XSS")', linkCtx)).toBe('')
        })

        it('blocks data: URIs', () => {
            expect(defaultSanitizeUrl('data:text/html,<script>alert("XSS")</script>', imgCtx)).toBe(
                ''
            )
        })

        it('blocks vbscript: protocol', () => {
            expect(defaultSanitizeUrl('vbscript:alert("XSS")', linkCtx)).toBe('')
        })

        it('blocks blob: URIs', () => {
            expect(defaultSanitizeUrl('blob:http://example.com/uuid', linkCtx)).toBe('')
        })
    })

    describe('edge cases', () => {
        it('returns empty string for empty input', () => {
            expect(defaultSanitizeUrl('', linkCtx)).toBe('')
        })

        it('allows URLs with leading whitespace', () => {
            expect(defaultSanitizeUrl('  https://example.com', linkCtx)).toBe('https://example.com')
        })

        it('blocks javascript: with leading whitespace', () => {
            expect(defaultSanitizeUrl('  javascript:alert(1)', linkCtx)).toBe('')
        })
    })

    describe('context awareness', () => {
        it('receives link context for markdown links', () => {
            expect(defaultSanitizeUrl('https://example.com', linkCtx)).toBe('https://example.com')
        })

        it('receives image context for markdown images', () => {
            expect(defaultSanitizeUrl('https://example.com/img.png', imgCtx)).toBe(
                'https://example.com/img.png'
            )
        })

        it('receives html context with tag for HTML elements', () => {
            expect(defaultSanitizeUrl('https://example.com', htmlACtx)).toBe('https://example.com')
        })
    })
})

describe('defaultSanitizeAttributes', () => {
    it('strips onclick handler', () => {
        const result = defaultSanitizeAttributes(
            { onclick: 'alert("XSS")', class: 'btn' },
            htmlDivCtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({ class: 'btn' })
    })

    it('strips onerror handler', () => {
        const result = defaultSanitizeAttributes(
            { src: 'https://example.com/img.png', onerror: 'alert("XSS")' },
            htmlImgCtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({ src: 'https://example.com/img.png' })
    })

    it('strips all on* handlers', () => {
        const result = defaultSanitizeAttributes(
            {
                onload: 'alert(1)',
                onmouseover: 'alert(2)',
                onfocus: 'alert(3)',
                id: 'safe'
            },
            htmlDivCtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({ id: 'safe' })
    })

    it('sanitizes href with javascript: protocol', () => {
        const result = defaultSanitizeAttributes(
            { href: 'javascript:alert("XSS")', class: 'link' },
            htmlACtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({ class: 'link' })
    })

    it('sanitizes src with data: URI', () => {
        const result = defaultSanitizeAttributes(
            { src: 'data:text/html,<script>alert(1)</script>', alt: 'image' },
            htmlImgCtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({ alt: 'image' })
    })

    it('sanitizes action attribute', () => {
        const result = defaultSanitizeAttributes(
            { action: 'javascript:alert(1)', method: 'post' },
            { type: 'html', tag: 'form' },
            defaultSanitizeUrl
        )
        expect(result).toEqual({ method: 'post' })
    })

    it('preserves safe URL attributes', () => {
        const result = defaultSanitizeAttributes(
            { href: 'https://example.com', src: '/image.png', class: 'foo' },
            htmlACtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({
            href: 'https://example.com',
            src: '/image.png',
            class: 'foo'
        })
    })

    it('preserves non-URL non-event attributes', () => {
        const result = defaultSanitizeAttributes(
            { class: 'foo', id: 'bar', 'data-value': '123', style: 'color: red' },
            htmlDivCtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({
            class: 'foo',
            id: 'bar',
            'data-value': '123',
            style: 'color: red'
        })
    })

    it('uses custom sanitizeUrl function', () => {
        const allowAll = (url: string, _ctx: SanitizeContext) => url
        const result = defaultSanitizeAttributes(
            { href: 'javascript:alert(1)' },
            htmlACtx,
            allowAll
        )
        expect(result).toEqual({ href: 'javascript:alert(1)' })
    })

    it('does not mutate the input object', () => {
        const input = { onclick: 'alert(1)', class: 'btn' }
        defaultSanitizeAttributes(input, htmlDivCtx, defaultSanitizeUrl)
        expect(input).toEqual({ onclick: 'alert(1)', class: 'btn' })
    })

    it('passes context through to sanitizeUrl', () => {
        const captured: SanitizeContext[] = []
        const spy = (url: string, ctx: SanitizeContext) => {
            captured.push(ctx)
            return url
        }
        defaultSanitizeAttributes({ href: 'https://example.com' }, htmlACtx, spy)
        expect(captured).toEqual([{ type: 'html', tag: 'a' }])
    })
})
