import { render, waitFor } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Image from './Image.svelte'

describe('Image (markdown)', () => {
    it('renders img with alt and title', () => {
        const { container } = render(Image, { props: { href: '/a.png', title: 't', text: 'alt' } })
        const img = container.querySelector('img')
        expect(img?.getAttribute('data-src')).toBe('/a.png')
        expect(img?.getAttribute('alt')).toBe('alt')
        expect(img?.getAttribute('title')).toBe('t')
    })

    it('enables lazy loading by default', () => {
        const { container } = render(Image, { props: { href: '/test.png', text: 'test' } })
        const img = container.querySelector('img')
        expect(img?.getAttribute('loading')).toBe('lazy')
    })

    it('disables lazy loading when lazy=false', () => {
        const { container } = render(Image, {
            props: { href: '/test.png', text: 'test', lazy: false }
        })
        const img = container.querySelector('img')
        expect(img?.getAttribute('loading')).toBe('eager')
        expect(img?.getAttribute('src')).toBe('/test.png')
    })

    it('applies fade-in class after image loads', async () => {
        const { container } = render(Image, {
            props: { href: '/test.png', text: 'test', lazy: false }
        })
        const img = container.querySelector('img') as HTMLImageElement

        // Simulate image load
        img.dispatchEvent(new Event('load'))

        await waitFor(() => {
            expect(img?.classList.contains('fade-in')).toBe(true)
        })
    })

    it('applies error class on image load failure', async () => {
        const { container } = render(Image, {
            props: { href: '/broken.png', text: 'test', lazy: false }
        })
        const img = container.querySelector('img') as HTMLImageElement

        // Simulate image error
        img.dispatchEvent(new Event('error'))

        await waitFor(() => {
            expect(img?.classList.contains('error')).toBe(true)
        })
    })

    it('disables fade-in when fadeIn=false', async () => {
        const { container } = render(Image, {
            props: { href: '/test.png', text: 'test', lazy: false, fadeIn: false }
        })
        const img = container.querySelector('img') as HTMLImageElement

        img.dispatchEvent(new Event('load'))

        await waitFor(() => {
            expect(img?.classList.contains('fade-in')).toBe(false)
        })
    })
})
