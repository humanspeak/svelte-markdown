import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Link from './Link.svelte'

describe('Link (markdown)', () => {
    it('renders anchor with href', () => {
        const { container } = render(Link, { props: { href: 'https://ex.com' } })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('https://ex.com')
    })

    it('renders anchor with title attribute', () => {
        const { container } = render(Link, {
            props: { href: 'https://ex.com', title: 'Example Link' }
        })
        const a = container.querySelector('a')
        expect(a?.getAttribute('title')).toBe('Example Link')
    })

    it('renders anchor without title when not provided', () => {
        const { container } = render(Link, { props: { href: 'https://ex.com' } })
        const a = container.querySelector('a')
        expect(a?.hasAttribute('title')).toBe(false)
    })

    it('renders anchor with empty href when not provided', () => {
        const { container } = render(Link, { props: {} })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('')
    })

    it('handles relative URLs', () => {
        const { container } = render(Link, { props: { href: '/page/subpage' } })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('/page/subpage')
    })

    it('handles anchor links', () => {
        const { container } = render(Link, { props: { href: '#section' } })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('#section')
    })

    it('handles mailto links', () => {
        const { container } = render(Link, { props: { href: 'mailto:test@example.com' } })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('mailto:test@example.com')
    })

    it('handles tel links', () => {
        const { container } = render(Link, { props: { href: 'tel:+1234567890' } })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('tel:+1234567890')
    })

    it('handles URLs with query parameters', () => {
        const { container } = render(Link, {
            props: { href: 'https://ex.com?foo=bar&baz=qux' }
        })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('https://ex.com?foo=bar&baz=qux')
    })

    it('handles URLs with special characters', () => {
        const { container } = render(Link, {
            props: { href: 'https://ex.com/path%20with%20spaces' }
        })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('https://ex.com/path%20with%20spaces')
    })
})
