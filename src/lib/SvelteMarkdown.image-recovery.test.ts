import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import { describe, expect, test } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'

useStreamingTestHarness()

describe('SvelteMarkdown image source recovery', () => {
    test('recovers after replacement and omits a source blocked by the sanitizer', async () => {
        const { container, rerender } = render(SvelteMarkdown, {
            props: { source: '![stable alt](/broken.png)' }
        })
        const brokenImg = container.querySelector('img') as HTMLImageElement

        brokenImg.dispatchEvent(new Event('error'))
        await act()
        expect(brokenImg).toHaveClass('error')

        await rerender({ source: '![stable alt](/good.png)' })
        const goodImg = container.querySelector('img') as HTMLImageElement
        expect(goodImg).toHaveAttribute('src', '/good.png')
        expect(goodImg).not.toHaveClass('error')

        goodImg.dispatchEvent(new Event('load'))
        await act()
        expect(goodImg).toHaveClass('fade-in')

        await rerender({ source: '![stable alt](javascript:alert(1))' })
        const blockedImg = container.querySelector('img') as HTMLImageElement
        expect(blockedImg).not.toHaveAttribute('src')
        expect(blockedImg.getAttribute('src')).not.toBe('')
        expect(blockedImg).not.toHaveClass('fade-in')
        expect(blockedImg).not.toHaveClass('error')
    })

    test('preserves an unchanged loaded image while trailing prose grows', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => component.writeChunk('![stable alt](/stable.png)\n\nTrailing pro'))
        await flushStreamingBatch()

        const stableImg = container.querySelector('img') as HTMLImageElement
        stableImg.dispatchEvent(new Event('load'))
        await act()
        expect(stableImg).toHaveClass('fade-in')

        await act(() => component.writeChunk('se grows across updates.'))
        await flushStreamingBatch()

        expect(container.querySelector('img')).toBe(stableImg)
        expect(stableImg).toHaveClass('fade-in')
        expect(container.textContent).toContain('Trailing prose grows across updates.')
    })
})
