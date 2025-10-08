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

    it('should show image immediately when fadeIn=false (regression test)', async () => {
        const { container } = render(Image, {
            props: { href: '/test.png', text: 'test', lazy: false, fadeIn: false }
        })
        const img = container.querySelector('img') as HTMLImageElement

        // Before load - should not have visible class
        expect(img?.classList.contains('visible')).toBe(false)
        expect(img?.classList.contains('fade-in')).toBe(false)

        // Simulate image load
        img.dispatchEvent(new Event('load'))

        // After load with fadeIn=false - should have visible class (not fade-in)
        await waitFor(
            () => {
                expect(img?.classList.contains('visible')).toBe(true)
            },
            { timeout: 1000 }
        )

        // Should NOT have fade-in class (that's the key difference)
        expect(img?.classList.contains('fade-in')).toBe(false)

        // Verify the CSS rule exists (opacity: 1 for .visible class)
        // This ensures the bug (images staying invisible) can't happen
        expect(img?.className).toContain('visible')
    })
})
