import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import { allowUrlPrefixes, defaultSanitizeUrl, type SanitizeContext } from './utils/sanitize.js'

describe('SvelteMarkdown srcset sanitization', () => {
    it('drops dangerous srcset candidates from raw HTML images', () => {
        const source =
            '<img src="a.png" srcset="a.png 1x, javascript:alert(1) 2x, data:image/png,x 3x">'
        const { container } = render(SvelteMarkdown, { source })
        expect(container.querySelector('img')?.getAttribute('srcset')).toBe('a.png 1x')
    })

    it('lets a custom sanitizeUrl restrict srcset candidates to a prefix', () => {
        const source =
            '<img src="https://cdn.test/a.png" srcset="https://cdn.test/a.png 1x, https://evil.test/?q=1 2x">'
        const sanitizeUrl = (url: string) => (url.startsWith('https://cdn.test/') ? url : '')
        const { container } = render(SvelteMarkdown, { source, sanitizeUrl })
        expect(container.querySelector('img')?.getAttribute('srcset')).toBe(
            'https://cdn.test/a.png 1x'
        )
    })
})

describe('SvelteMarkdown with allowUrlPrefixes', () => {
    const cdnOnly = allowUrlPrefixes(['https://cdn.test/'])
    // The documented recipe: links keep the default, every resource uses the CDN.
    const sanitizeUrl = (url: string, context: SanitizeContext) =>
        context.tag === 'a' ? defaultSanitizeUrl(url, context) : cdnOnly(url, context)

    it('restricts markdown images and raw HTML resources to the allowed prefix', () => {
        const source = [
            '![ok](https://cdn.test/a.png) ![bad](//evil.test/x.png) ![bad](https:evil.test/y.png)',
            '',
            '<img src="https://evil.test/?q=secret" srcset="https://cdn.test/b.png 1x, //evil.test/c.png 2x">',
            '',
            '<picture><source srcset="https://evil.test/?q=secret"><img src="https://cdn.test/d.png"></picture>',
            '',
            '<audio src="https://evil.test/a.mp3"></audio>'
        ].join('\n')
        const { container } = render(SvelteMarkdown, { source, sanitizeUrl })
        const imgs = [...container.querySelectorAll('img')]
        expect(imgs.map((img) => img.getAttribute('src'))).toEqual([
            'https://cdn.test/a.png',
            null,
            null,
            null,
            'https://cdn.test/d.png'
        ])
        expect(imgs[3].getAttribute('srcset')).toBe('https://cdn.test/b.png 1x')
        expect(container.querySelector('source')?.hasAttribute('srcset')).toBe(false)
        expect(container.querySelector('audio')?.hasAttribute('src')).toBe(false)
    })

    it('leaves links on the default policy', () => {
        const source = '[ext](https://other.test/page) [bad](javascript:alert(1)) [local](/docs)'
        const { container } = render(SvelteMarkdown, { source, sanitizeUrl })
        const links = [...container.querySelectorAll('a')]
        expect(links.map((a) => a.getAttribute('href'))).toEqual([
            'https://other.test/page',
            null,
            '/docs'
        ])
    })
})
