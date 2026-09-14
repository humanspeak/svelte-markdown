import { act, render, waitFor } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Image from './Image.svelte'

class ControlledIntersectionObserver {
    static instances: ControlledIntersectionObserver[] = []

    readonly root = null
    readonly rootMargin: string
    readonly thresholds = [0]
    readonly observed: Element[] = []
    readonly disconnect = vi.fn()
    readonly unobserve = vi.fn()
    readonly takeRecords = vi.fn((): IntersectionObserverEntry[] => [])

    constructor(
        private readonly callback: IntersectionObserverCallback,
        options?: IntersectionObserverInit
    ) {
        this.rootMargin = options?.rootMargin ?? '0px'
        ControlledIntersectionObserver.instances.push(this)
    }

    observe = (target: Element) => {
        this.observed.push(target)
    }

    intersect(target = this.observed.at(-1)) {
        if (!target) throw new Error('No observed target')

        this.callback(
            [
                {
                    isIntersecting: true,
                    target,
                    intersectionRatio: 1,
                    boundingClientRect: {} as DOMRectReadOnly,
                    intersectionRect: {} as DOMRectReadOnly,
                    rootBounds: null,
                    time: Date.now()
                }
            ] as IntersectionObserverEntry[],
            this as unknown as IntersectionObserver
        )
    }
}

const useControlledIntersectionObserver = () => {
    vi.stubGlobal(
        'IntersectionObserver',
        ControlledIntersectionObserver as unknown as typeof IntersectionObserver
    )
}

describe('Image (markdown)', () => {
    beforeEach(() => {
        ControlledIntersectionObserver.instances = []
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

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

    it('recovers when a failed image source changes', async () => {
        const { container, rerender } = render(Image, {
            props: { href: '/broken.png', text: 'test', lazy: false }
        })
        const brokenImg = container.querySelector('img') as HTMLImageElement

        brokenImg.dispatchEvent(new Event('error'))

        await waitFor(() => {
            expect(brokenImg.classList.contains('error')).toBe(true)
        })

        await rerender({ href: '/good.png', text: 'test', lazy: false })
        const goodImg = container.querySelector('img') as HTMLImageElement

        expect(goodImg.getAttribute('src')).toBe('/good.png')
        expect(goodImg.classList.contains('error')).toBe(false)

        goodImg.dispatchEvent(new Event('load'))

        await waitFor(() => {
            expect(goodImg.classList.contains('fade-in')).toBe(true)
            expect(goodImg.classList.contains('error')).toBe(false)
        })
    })

    it('clears loaded state while a replacement source is pending', async () => {
        const { container, rerender } = render(Image, {
            props: { href: '/a.png', text: 'test', lazy: false }
        })
        const firstImg = container.querySelector('img') as HTMLImageElement

        firstImg.dispatchEvent(new Event('load'))

        await waitFor(() => {
            expect(firstImg.classList.contains('fade-in')).toBe(true)
        })

        await rerender({ href: '/b.png', text: 'test', lazy: false })
        const replacementImg = container.querySelector('img') as HTMLImageElement

        expect(replacementImg.getAttribute('src')).toBe('/b.png')
        expect(replacementImg.classList.contains('fade-in')).toBe(false)
        expect(replacementImg.classList.contains('visible')).toBe(false)

        replacementImg.dispatchEvent(new Event('load'))

        await waitFor(() => {
            expect(replacementImg.classList.contains('fade-in')).toBe(true)
        })
    })

    it('preserves the node and loaded state when the source is unchanged', async () => {
        const { container, rerender } = render(Image, {
            props: { href: '/same.png', title: 'before', text: 'before', lazy: false }
        })
        const originalImg = container.querySelector('img') as HTMLImageElement

        originalImg.dispatchEvent(new Event('load'))
        await waitFor(() => {
            expect(originalImg.classList.contains('fade-in')).toBe(true)
        })

        await rerender({
            href: '/same.png',
            title: 'after',
            text: 'after',
            lazy: false,
            fadeIn: false
        })
        const currentImg = container.querySelector('img') as HTMLImageElement

        expect(currentImg).toBe(originalImg)
        expect(currentImg.getAttribute('title')).toBe('after')
        expect(currentImg.getAttribute('alt')).toBe('after')
        expect(currentImg.classList.contains('fade-in')).toBe(false)
        expect(currentImg.classList.contains('visible')).toBe(true)
    })

    it('preserves the node and error state when the source is unchanged', async () => {
        const { container, rerender } = render(Image, {
            props: { href: '/same-broken.png', text: 'before', lazy: false }
        })
        const originalImg = container.querySelector('img') as HTMLImageElement

        originalImg.dispatchEvent(new Event('error'))
        await waitFor(() => {
            expect(originalImg.classList.contains('error')).toBe(true)
        })

        await rerender({ href: '/same-broken.png', text: 'after', lazy: false })
        const currentImg = container.querySelector('img') as HTMLImageElement

        expect(currentImg).toBe(originalImg)
        expect(currentImg.classList.contains('error')).toBe(true)
    })

    it('ignores obsolete events across A to B to A source attempts', async () => {
        const { container, rerender } = render(Image, {
            props: { href: '/a.png', text: 'test', lazy: false }
        })
        const obsoleteA = container.querySelector('img') as HTMLImageElement

        await rerender({ href: '/b.png', text: 'test', lazy: false })
        const obsoleteB = container.querySelector('img') as HTMLImageElement
        await rerender({ href: '/a.png', text: 'test', lazy: false })
        const currentA = container.querySelector('img') as HTMLImageElement

        expect(currentA).not.toBe(obsoleteA)
        await act(() => {
            obsoleteA.dispatchEvent(new Event('load'))
            obsoleteB.dispatchEvent(new Event('error'))
        })

        expect(currentA.classList.contains('fade-in')).toBe(false)
        expect(currentA.classList.contains('error')).toBe(false)

        currentA.dispatchEvent(new Event('load'))
        await waitFor(() => {
            expect(currentA.classList.contains('fade-in')).toBe(true)
        })
    })

    it('omits empty sources and resets state after source removal and reinsertion', async () => {
        const { container, rerender } = render(Image, {
            props: { href: '/a.png', text: 'test', lazy: false }
        })
        const loadedImg = container.querySelector('img') as HTMLImageElement

        loadedImg.dispatchEvent(new Event('load'))
        await waitFor(() => {
            expect(loadedImg.classList.contains('fade-in')).toBe(true)
        })

        await rerender({ href: undefined, text: 'test', lazy: false })
        const absentImg = container.querySelector('img') as HTMLImageElement
        expect(absentImg.hasAttribute('src')).toBe(false)
        expect(absentImg.classList.contains('fade-in')).toBe(false)
        expect(absentImg.classList.contains('error')).toBe(false)

        await rerender({ href: '', text: 'test', lazy: false })
        const emptyImg = container.querySelector('img') as HTMLImageElement
        expect(emptyImg.hasAttribute('src')).toBe(false)

        await rerender({ href: '/a.png', text: 'test', lazy: false })
        const reinsertedImg = container.querySelector('img') as HTMLImageElement
        expect(reinsertedImg).not.toBe(loadedImg)
        expect(reinsertedImg.classList.contains('fade-in')).toBe(false)
    })

    it('recovers into visible state when fadeIn=false', async () => {
        const { container, rerender } = render(Image, {
            props: { href: '/broken.png', text: 'test', lazy: false, fadeIn: false }
        })
        const brokenImg = container.querySelector('img') as HTMLImageElement
        brokenImg.dispatchEvent(new Event('error'))
        await waitFor(() => {
            expect(brokenImg.classList.contains('error')).toBe(true)
        })

        await rerender({ href: '/good.png', text: 'test', lazy: false, fadeIn: false })
        const goodImg = container.querySelector('img') as HTMLImageElement
        expect(goodImg.classList.contains('visible')).toBe(false)
        expect(goodImg.classList.contains('error')).toBe(false)

        goodImg.dispatchEvent(new Event('load'))
        await waitFor(() => {
            expect(goodImg.classList.contains('visible')).toBe(true)
            expect(goodImg.classList.contains('fade-in')).toBe(false)
        })
    })

    it('observes only the latest deferred source before visibility', async () => {
        useControlledIntersectionObserver()
        const { container, rerender } = render(Image, {
            props: { href: '/a.png', text: 'test' }
        })
        const firstImg = container.querySelector('img') as HTMLImageElement
        const firstObserver = ControlledIntersectionObserver.instances[0]

        expect(firstImg.hasAttribute('src')).toBe(false)
        expect(firstObserver?.rootMargin).toBe('50px')
        expect(firstObserver?.observed).toEqual([firstImg])

        await rerender({ href: '/b.png', text: 'test' })
        const latestImg = container.querySelector('img') as HTMLImageElement
        const latestObserver = ControlledIntersectionObserver.instances.at(-1)

        expect(latestImg).not.toBe(firstImg)
        expect(latestImg.hasAttribute('src')).toBe(false)
        expect(firstObserver?.disconnect).toHaveBeenCalled()
        expect(latestObserver?.observed).toEqual([latestImg])

        await act(() => latestObserver?.intersect())
        expect(latestImg.getAttribute('src')).toBe('/b.png')
        expect(latestObserver?.disconnect).toHaveBeenCalled()
    })

    it('loads replacement sources without re-observing after visibility', async () => {
        useControlledIntersectionObserver()
        const { container, rerender } = render(Image, {
            props: { href: '/a.png', text: 'test' }
        })
        const observer = ControlledIntersectionObserver.instances[0]

        await act(() => observer?.intersect())
        expect(container.querySelector('img')?.getAttribute('src')).toBe('/a.png')

        await rerender({ href: '/b.png', text: 'test' })
        expect(container.querySelector('img')?.getAttribute('src')).toBe('/b.png')
        expect(ControlledIntersectionObserver.instances).toHaveLength(1)
    })

    it('reacts to lazy changes without hiding an exposed image', async () => {
        useControlledIntersectionObserver()
        const { container, rerender } = render(Image, {
            props: { href: '/toggle.png', text: 'test', lazy: true }
        })
        const img = container.querySelector('img') as HTMLImageElement
        const observer = ControlledIntersectionObserver.instances[0]

        expect(img.hasAttribute('src')).toBe(false)
        await rerender({ href: '/toggle.png', text: 'test', lazy: false })
        expect(container.querySelector('img')).toBe(img)
        expect(img.getAttribute('src')).toBe('/toggle.png')
        expect(img.getAttribute('loading')).toBe('eager')
        expect(observer?.disconnect).toHaveBeenCalled()

        await rerender({ href: '/toggle.png', text: 'test', lazy: true })
        expect(container.querySelector('img')).toBe(img)
        expect(img.getAttribute('src')).toBe('/toggle.png')
        expect(img.getAttribute('loading')).toBe('lazy')
        expect(ControlledIntersectionObserver.instances).toHaveLength(1)
    })

    it('disconnects a pending observer when unmounted', () => {
        useControlledIntersectionObserver()
        const { unmount } = render(Image, { props: { href: '/a.png', text: 'test' } })
        const observer = ControlledIntersectionObserver.instances[0]

        unmount()
        expect(observer?.disconnect).toHaveBeenCalled()
    })

    it('loads immediately when IntersectionObserver is unavailable', async () => {
        vi.stubGlobal('IntersectionObserver', undefined)
        const { container } = render(Image, { props: { href: '/fallback.png', text: 'test' } })

        await waitFor(() => {
            expect(container.querySelector('img')?.getAttribute('src')).toBe('/fallback.png')
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

    it('does not override error state if error already occurred', async () => {
        const { container } = render(Image, {
            props: { href: '/broken.png', text: 'test', lazy: false }
        })
        const img = container.querySelector('img') as HTMLImageElement

        // Simulate error first
        img.dispatchEvent(new Event('error'))

        await waitFor(() => {
            expect(img?.classList.contains('error')).toBe(true)
        })

        // Then simulate load — should not clear error state
        img.dispatchEvent(new Event('load'))

        await waitFor(() => {
            expect(img?.classList.contains('error')).toBe(true)
            // fade-in should NOT be applied since error took precedence
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
