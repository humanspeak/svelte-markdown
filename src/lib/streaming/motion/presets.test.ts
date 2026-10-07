import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Consumer from '../../test/streaming-text/MotionConsumer.svelte'
import type { StreamingTextMetadata } from '../../types.js'
import { FadeCharacters, FadeWords, RiseWords } from './index.js'
const baseline: StreamingTextMetadata = {
    epoch: 1,
    leafId: 'a',
    renderBatchId: 0,
    provenance: 'exact',
    ranges: [
        {
            start: 0,
            end: 1,
            originId: 'a',
            change: 'baseline',
            batchId: 0,
            revealedBeforeBatch: false
        }
    ]
}
describe('optional motion presets', () => {
    it.each([FadeWords, RiseWords, FadeCharacters])(
        'renders literal text when disabled',
        (preset) => {
            const { container } = render(preset, { text: '<b> a\n', enabled: false })
            expect(container.textContent).toBe('<b> a\n')
            expect(container.querySelector('*')).toBeNull()
        }
    )
    it.each([FadeWords, RiseWords, FadeCharacters])(
        'never hides baseline content, including remounts and a custom initial',
        (preset) => {
            const { container, unmount } = render(preset, {
                text: 'a',
                streamingText: baseline,
                initial: { opacity: 0 }
            })
            expect(container.textContent).toBe('a')
            expect(container.querySelector('span')?.style.opacity).not.toBe('0')
            unmount()
            const second = render(preset, { text: 'a', streamingText: baseline })
            expect(second.container.querySelector('span')?.style.opacity).not.toBe('0')
        }
    )
    it('segments graphemes and keeps whitespace outside motion spans', () => {
        const { container } = render(FadeCharacters, { text: '👩‍💻 é' })
        expect(Array.from(container.querySelectorAll('span'), (node) => node.textContent)).toEqual([
            '👩‍💻',
            'é'
        ])
        expect(container.textContent).toBe('👩‍💻 é')
    })
    it('only the rise preset uses inline-block', () => {
        expect(
            render(RiseWords, { text: 'a' }).container.querySelector('span')?.style.display
        ).toBe('inline-block')
        expect(
            render(FadeWords, { text: 'a' }).container.querySelector('span')?.style.display
        ).toBe('')
    })
})

describe('consumer motion controls', () => {
    const arrival = (change: 'append' | 'revision'): StreamingTextMetadata => ({
        ...baseline,
        renderBatchId: 1,
        ranges: [{ ...baseline.ranges[0], change, batchId: 1 }]
    })
    it('gives arriving rise words a small lift while preserving consumer vertical targets', () => {
        const props = { text: 'a', streamingText: arrival('append') }
        const span = render(RiseWords, props).container.querySelector('span')!
        expect(span.style.opacity).toBe('0')
        expect(span.style.transform).toContain('translateY(4px)')

        const custom = render(RiseWords, {
            ...props,
            initial: { opacity: 0.4, y: 12 },
            animate: { opacity: 0.9, y: -2 },
            transition: { duration: 0, ease: 'linear' }
        }).container.querySelector('span')!
        expect(custom.style.opacity).toBe('0.4')
        expect(custom.style.transform).toContain('translateY(12px)')
        const settled = render(RiseWords, {
            ...props,
            initial: false,
            animate: { opacity: 0.9, y: -2 },
            transition: { duration: 0 }
        }).container.querySelector('span')!
        expect(settled.style.opacity).toBe('0.9')
        expect(settled.style.transform).toContain('translateY(-2px)')

        const opacityOnly = render(RiseWords, {
            ...props,
            initial: { opacity: 0.4 },
            animate: { opacity: 0.9 },
            transition: { duration: 0 }
        }).container.querySelector('span')!
        expect(opacityOnly.style.transform).not.toContain('translateY')
    })
    it('runs the consumer segment snippet in place of preset markup', () => {
        const { container } = render(Consumer, { text: 'a', streamingText: arrival('append') })
        expect(container.textContent).toBe('a')
        expect(container.querySelector('span')).toBeNull()
        expect(container.querySelector('mark')?.getAttribute('data-new')).toBe('true')
    })
    it.each([FadeWords, RiseWords, FadeCharacters])(
        'honors entrance overrides and explicit revision/initial opt-ins',
        (preset) => {
            const props = {
                text: 'a',
                streamingText: arrival('append'),
                initial: { opacity: 0.25 },
                animate: { opacity: 0.8 },
                transition: { duration: 0 },
                variants: { visible: { opacity: 0.8 } },
                custom: 3
            }
            const entered = render(preset, props)
            expect(entered.container.querySelector('span')?.style.opacity).toBe('0.25')
            const revised = render(preset, { ...props, streamingText: arrival('revision') })
            expect(revised.container.querySelector('span')?.style.opacity).not.toBe('0.25')
            const optedRevision = render(preset, {
                ...props,
                streamingText: arrival('revision'),
                animateRevisions: true
            })
            expect(optedRevision.container.querySelector('span')?.style.opacity).toBe('0.25')
            const optedBaseline = render(preset, {
                ...props,
                streamingText: baseline,
                animateInitialContent: true
            })
            expect(optedBaseline.container.querySelector('span')?.style.opacity).toBe('0.25')
        }
    )
    it('does not animate unknown provenance and preserves custom segmentation', () => {
        const { container } = render(FadeWords, {
            text: 'a',
            streamingText: { ...arrival('append'), provenance: 'unknown' },
            initial: { opacity: 0 },
            segmenter: (text) => [{ text, start: 0, end: text.length }]
        })
        expect(container.textContent).toBe('a')
        expect(container.querySelector('span')?.style.opacity).not.toBe('0')
    })
})
