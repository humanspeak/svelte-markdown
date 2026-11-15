import { describe, expect, it } from 'vitest'
import {
    allowUrlPrefixes,
    defaultSanitizeAttributes,
    defaultSanitizeUrl,
    sanitizeSrcset,
    type SanitizeContext
} from './sanitize.js'

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

    it('strips srcdoc attribute from iframes', () => {
        const iframeCtx: SanitizeContext = { type: 'html', tag: 'iframe' }
        const result = defaultSanitizeAttributes(
            { src: 'https://example.com', srcdoc: '<script>alert(1)</script>', width: '100' },
            iframeCtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({ src: 'https://example.com', width: '100' })
    })

    it('strips srcdoc regardless of case', () => {
        const iframeCtx: SanitizeContext = { type: 'html', tag: 'iframe' }
        const result = defaultSanitizeAttributes(
            { SRCDOC: '<script>alert(1)</script>', class: 'frame' },
            iframeCtx,
            defaultSanitizeUrl
        )
        expect(result).toEqual({ class: 'frame' })
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

describe('sanitizeSrcset', () => {
    const ctx = { type: 'html' as const, tag: 'img' }

    it('keeps safe candidates with their descriptors', () => {
        expect(
            sanitizeSrcset(
                'a.png 1x, /b.png 2x, https://x.test/c.png 640w',
                ctx,
                defaultSanitizeUrl
            )
        ).toBe('a.png 1x, /b.png 2x, https://x.test/c.png 640w')
    })

    it('keeps candidates without descriptors', () => {
        expect(sanitizeSrcset('a.png', ctx, defaultSanitizeUrl)).toBe('a.png')
        // As in the HTML spec, a comma only separates candidates when it ends
        // a URL; `a.png,b.png` is one URL.
        expect(sanitizeSrcset('a.png, b.png 2x', ctx, defaultSanitizeUrl)).toBe('a.png, b.png 2x')
        expect(sanitizeSrcset('a.png,b.png 2x', ctx, defaultSanitizeUrl)).toBe('a.png,b.png 2x')
    })

    it('drops candidates with dangerous protocols', () => {
        expect(
            sanitizeSrcset(
                'a.png 1x, javascript:alert(1) 2x, JaVaScRiPt:x 3x',
                ctx,
                defaultSanitizeUrl
            )
        ).toBe('a.png 1x')
        expect(sanitizeSrcset('vbscript:x 1x, blob:x 2x', ctx, defaultSanitizeUrl)).toBe('')
    })

    it('drops a data: URI whole, without leaking pieces after its commas', () => {
        expect(
            sanitizeSrcset('data:image/svg+xml,<svg>,x 1x, safe.png 2x', ctx, defaultSanitizeUrl)
        ).toBe('safe.png 2x')
    })

    it('normalizes whitespace and stray commas', () => {
        expect(sanitizeSrcset('  a.png   1x ,,  b.png  2x  ', ctx, defaultSanitizeUrl)).toBe(
            'a.png 1x, b.png 2x'
        )
        expect(sanitizeSrcset('', ctx, defaultSanitizeUrl)).toBe('')
        expect(sanitizeSrcset(' , ', ctx, defaultSanitizeUrl)).toBe('')
    })

    it('passes each candidate URL and the context to a custom sanitizer', () => {
        const calls: [string, unknown][] = []
        const prefixOnly = (url: string, context: unknown) => {
            calls.push([url, context])
            return url.startsWith('https://cdn.test/') ? url : ''
        }
        expect(
            sanitizeSrcset(
                'https://cdn.test/a.png 1x, https://evil.test/?q=secret 2x',
                ctx,
                prefixOnly
            )
        ).toBe('https://cdn.test/a.png 1x')
        expect(calls).toEqual([
            ['https://cdn.test/a.png', ctx],
            ['https://evil.test/?q=secret', ctx]
        ])
    })
})

describe('sanitizeSrcset parsing edge cases', () => {
    const ctx = { type: 'html' as const, tag: 'img' }

    it('handles a long run of commas in linear time', () => {
        const value = `a${','.repeat(200_000)}b,`
        const start = performance.now()
        expect(sanitizeSrcset(value, ctx, defaultSanitizeUrl)).toBe(value.slice(0, -1))
        expect(performance.now() - start).toBeLessThan(500)
    })

    it('splits only on HTML-spec whitespace, keeping other spaces in the URL', () => {
        expect(sanitizeSrcset('a\u00a0b.png 2x', ctx, defaultSanitizeUrl)).toBe('a\u00a0b.png 2x')
        expect(sanitizeSrcset('a.png\f1x,\rb.png\t2x', ctx, defaultSanitizeUrl)).toBe(
            'a.png 1x, b.png 2x'
        )
    })

    it('drops candidates whose sanitized URL would split into more candidates', () => {
        const rewrite = (url: string) => (url === 'a.png' ? 'a.png, https://evil.test/ 2x' : url)
        expect(sanitizeSrcset('a.png 1x, b.png 2x', ctx, rewrite)).toBe('b.png 2x')
        expect(sanitizeSrcset('a.png 1x', ctx, () => ',x.png')).toBe('')
        expect(sanitizeSrcset('a.png 1x', ctx, () => 'x.png,')).toBe('')
        expect(sanitizeSrcset('a.png 1x', ctx, () => 'x\ty.png')).toBe('')
    })
})

describe('defaultSanitizeAttributes srcset handling', () => {
    const ctx = { type: 'html' as const, tag: 'img' }

    it('sanitizes srcset and imagesrcset regardless of case', () => {
        expect(
            defaultSanitizeAttributes(
                { SrcSet: 'a.png 1x, javascript:alert(1) 2x', imagesrcset: 'data:x 1x, b.png 2x' },
                ctx,
                defaultSanitizeUrl
            )
        ).toEqual({ SrcSet: 'a.png 1x', imagesrcset: 'b.png 2x' })
    })

    it('removes srcset entirely when every candidate is blocked', () => {
        expect(
            defaultSanitizeAttributes(
                { src: 'a.png', srcset: 'javascript:x 1x' },
                ctx,
                defaultSanitizeUrl
            )
        ).toEqual({ src: 'a.png' })
    })
})

describe('allowUrlPrefixes', () => {
    const cdn = allowUrlPrefixes(['https://cdn.example.com/'])

    it('allows URLs under an allowed prefix', () => {
        expect(cdn('https://cdn.example.com/a.png', imgCtx)).toBe('https://cdn.example.com/a.png')
        expect(cdn('HTTPS://CDN.EXAMPLE.COM/a.png', imgCtx)).toBe('HTTPS://CDN.EXAMPLE.COM/a.png')
    })

    it('blocks other hosts, including look-alikes and credentials tricks', () => {
        expect(cdn('https://evil.com/a.png', imgCtx)).toBe('')
        expect(cdn('https://cdn.example.com.evil.com/a.png', imgCtx)).toBe('')
        expect(cdn('https://cdn.example.com@evil.com/a.png', imgCtx)).toBe('')
        expect(cdn('https://cdn.example.com:8443/a.png', imgCtx)).toBe('')
        expect(cdn('http://cdn.example.com/a.png', imgCtx)).toBe('')
    })

    it('blocks protocol-relative URLs and their backslash spellings', () => {
        for (const url of [
            '//evil.com/a.png',
            '/\\evil.com/a.png',
            '\\/evil.com/a.png',
            '\\\\evil.com/a.png',
            '/\t/evil.com/a.png',
            ' //evil.com/a.png'
        ]) {
            expect(cdn(url, imgCtx), url).toBe('')
        }
    })

    it('allows protocol-relative URLs that resolve to an allowed host', () => {
        expect(cdn('//cdn.example.com/a.png', imgCtx)).toBe('https://cdn.example.com/a.png')
    })

    it('allows same-origin relative URLs by default', () => {
        for (const url of ['/a.png', './a.png', '../a.png', 'a.png', '?q=1', '#top']) {
            expect(cdn(url, imgCtx), url).toBe(url)
        }
    })

    it('blocks relative URLs when allowRelative is false', () => {
        const strict = allowUrlPrefixes(['https://cdn.example.com/'], { allowRelative: false })
        expect(strict('/a.png', imgCtx)).toBe('')
        expect(strict('#top', linkCtx)).toBe('')
        expect(strict('https://cdn.example.com/a.png', imgCtx)).toBe(
            'https://cdn.example.com/a.png'
        )
    })

    it('matches path prefixes on segment boundaries', () => {
        const images = allowUrlPrefixes(['https://example.com/images'])
        expect(images('https://example.com/images', imgCtx)).toBe('https://example.com/images')
        expect(images('https://example.com/images/a.png', imgCtx)).toBe(
            'https://example.com/images/a.png'
        )
        expect(images('https://example.com/images-private/a.png', imgCtx)).toBe('')
    })

    it('compares normalized paths, so dot segments cannot escape the prefix', () => {
        const images = allowUrlPrefixes(['https://example.com/images/'])
        expect(images('https://example.com/images/../secret', imgCtx)).toBe('')
        expect(images('https://example.com/images/%2e%2e/secret', imgCtx)).toBe('')
        expect(images('https://example.com/images/./a.png', imgCtx)).toBe(
            'https://example.com/images/./a.png'
        )
    })

    it('supports protocol-only prefixes', () => {
        const httpsOnly = allowUrlPrefixes(['https://', 'mailto:'])
        expect(httpsOnly('https://anywhere.com/x', linkCtx)).toBe('https://anywhere.com/x')
        expect(httpsOnly('mailto:a@b.com', linkCtx)).toBe('mailto:a@b.com')
        expect(httpsOnly('http://anywhere.com/x', linkCtx)).toBe('')
        expect(httpsOnly('tel:+15555550100', linkCtx)).toBe('')
        expect(allowUrlPrefixes(['https:'])('https://a.com/', linkCtx)).toBe('https://a.com/')
    })

    it('matches opaque URL prefixes as whole addresses', () => {
        const team = allowUrlPrefixes(['mailto:team@example.com'])
        expect(team('mailto:team@example.com', linkCtx)).toBe('mailto:team@example.com')
        expect(team('mailto:Team@Example.com', linkCtx)).toBe('mailto:Team@Example.com')
        expect(team('mailto:team@example.com?subject=hi', linkCtx)).toBe(
            'mailto:team@example.com?subject=hi'
        )
        expect(team('mailto:other@example.com', linkCtx)).toBe('')
        expect(team('mailto:team@example.com.evil.org', linkCtx)).toBe('')
        expect(team('mailto:team@example.community', linkCtx)).toBe('')
        expect(allowUrlPrefixes(['tel:+1555'])('tel:+15559999999', linkCtx)).toBe('')
    })

    it('blocks scheme-relative URLs that leave the page on non-https pages', () => {
        for (const url of ['https:evil.com/x', 'https:/evil.com/x', 'HTTPS:evil.com/x']) {
            expect(cdn(url, imgCtx), url).toBe('')
        }
        // Fine on every page scheme: a relative path on https pages, the CDN elsewhere.
        expect(cdn('https:cdn.example.com/a.png', imgCtx)).toBe('https:cdn.example.com/a.png')
    })

    it('does not treat the internal page stand-ins as relative', () => {
        for (const url of [
            'https://page-a.invalid/x',
            '//page-a.invalid/x',
            'http://page-b.invalid/x',
            '//page-b.invalid/x'
        ]) {
            expect(cdn(url, imgCtx), url).toBe('')
        }
    })

    it('blocks encoded slashes after a path prefix', () => {
        const images = allowUrlPrefixes(['https://example.com/images'])
        expect(images('https://example.com/images/..%2f..%2fsecret', imgCtx)).toBe('')
        expect(images('https://example.com/images/..%2F..%2Fsecret', imgCtx)).toBe('')
        expect(images('https://example.com/images/..%5csecret', imgCtx)).toBe('')
        expect(images('https://example.com/images/a%20b.png', imgCtx)).toBe(
            'https://example.com/images/a%20b.png'
        )
    })

    it('returns allowed absolute URLs exactly as written', () => {
        const any = allowUrlPrefixes(['https://'])
        expect(any('https://example.com', linkCtx)).toBe('https://example.com')
        expect(any('https://bücher.example/a b', linkCtx)).toBe('https://bücher.example/a b')
    })

    it('never widens the default protocol allowlist', () => {
        const permissive = allowUrlPrefixes(['javascript:', 'data:'])
        expect(permissive('javascript:alert(1)', linkCtx)).toBe('')
        expect(permissive('data:text/html,x', imgCtx)).toBe('')
    })

    it('blocks everything absolute when no prefixes are given', () => {
        const none = allowUrlPrefixes([])
        expect(none('https://example.com/', linkCtx)).toBe('')
        expect(none('/local', linkCtx)).toBe('/local')
    })

    it('blocks URLs the URL parser rejects', () => {
        expect(cdn('https://exa mple.com/', linkCtx)).toBe('')
    })

    it('throws on invalid prefixes', () => {
        expect(() => allowUrlPrefixes(['cdn.example.com'])).toThrow(TypeError)
        expect(() => allowUrlPrefixes(['https://cdn.example.com/?a=1'])).toThrow(/query/)
        expect(() => allowUrlPrefixes(['https://cdn.example.com/#x'])).toThrow(/fragment/)
    })

    it('restricts srcset candidates through defaultSanitizeAttributes', () => {
        expect(
            defaultSanitizeAttributes(
                {
                    src: '//evil.com/a.png',
                    srcset: 'https://cdn.example.com/a.png 1x, /\\evil.com/b.png 2x'
                },
                htmlImgCtx,
                cdn
            )
        ).toEqual({ srcset: 'https://cdn.example.com/a.png 1x' })
    })
})
