import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Consumer from '../../test/streaming-text/MotionConsumer.svelte'
import type { StreamingTextMetadata } from '../../types.js'
import { FadeCharacters, FadeWords, RiseWords } from './index.js'
// The motion span: inside the ink wrapper when a preset wipes, otherwise the first span.
const MOTION = '[data-ink] > span, span:not([data-ink])'
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
            expect(container.querySelector<HTMLElement>(MOTION)?.style.opacity).not.toBe('0')
            unmount()
            const second = render(preset, { text: 'a', streamingText: baseline })
            expect(second.container.querySelector<HTMLElement>(MOTION)?.style.opacity).not.toBe('0')
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
    it('only the rise preset makes the motion span inline-block', () => {
        expect(
            render(RiseWords, { text: 'a' }).container.querySelector<HTMLElement>(MOTION)?.style
                .display
        ).toBe('inline-block')
        expect(
            render(FadeWords, { text: 'a' }).container.querySelector<HTMLElement>(MOTION)?.style
                .display
        ).toBe('')
    })
})

describe('consumer motion controls', () => {
    const arrival = (change: 'append' | 'revision'): StreamingTextMetadata => ({
        ...baseline,
        renderBatchId: 1,
        ranges: [{ ...baseline.ranges[0], change, batchId: 1 }]
    })
    it('gives arriving rise words an 8px lift while preserving consumer vertical targets', () => {
        const props = { text: 'a', streamingText: arrival('append') }
        const span = render(RiseWords, props).container.querySelector<HTMLElement>(MOTION)!
        expect(span.style.opacity).toBe('0')
        expect(span.style.transform).toContain('translateY(8px)')

        const custom = render(RiseWords, {
            ...props,
            initial: { opacity: 0.4, y: 12 },
            animate: { opacity: 0.9, y: -2 },
            transition: { duration: 0, ease: 'linear' }
        }).container.querySelector<HTMLElement>(MOTION)!
        expect(custom.style.opacity).toBe('0.4')
        expect(custom.style.transform).toContain('translateY(12px)')
        const settled = render(RiseWords, {
            ...props,
            initial: false,
            animate: { opacity: 0.9, y: -2 },
            transition: { duration: 0 }
        }).container.querySelector<HTMLElement>(MOTION)!
        expect(settled.style.opacity).toBe('0.9')
        expect(settled.style.transform).toContain('translateY(-2px)')

        const opacityOnly = render(RiseWords, {
            ...props,
            initial: { opacity: 0.4 },
            animate: { opacity: 0.9 },
            transition: { duration: 0 }
        }).container.querySelector<HTMLElement>(MOTION)!
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
            expect(entered.container.querySelector<HTMLElement>(MOTION)?.style.opacity).toBe('0.25')
            const revised = render(preset, { ...props, streamingText: arrival('revision') })
            expect(revised.container.querySelector<HTMLElement>(MOTION)?.style.opacity).not.toBe(
                '0.25'
            )
            const optedRevision = render(preset, {
                ...props,
                streamingText: arrival('revision'),
                animateRevisions: true
            })
            expect(optedRevision.container.querySelector<HTMLElement>(MOTION)?.style.opacity).toBe(
                '0.25'
            )
            const optedBaseline = render(preset, {
                ...props,
                streamingText: baseline,
                animateInitialContent: true
            })
            expect(optedBaseline.container.querySelector<HTMLElement>(MOTION)?.style.opacity).toBe(
                '0.25'
            )
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
        expect(container.querySelector<HTMLElement>(MOTION)?.style.opacity).not.toBe('0')
    })
})

describe('ink wipe', () => {
    const arriving: StreamingTextMetadata = {
        ...baseline,
        renderBatchId: 1,
        ranges: [{ ...baseline.ranges[0], change: 'append', batchId: 1 }]
    }
    it.each([FadeWords, RiseWords])('wipes arriving words by default', (preset) => {
        const { container } = render(preset, { text: 'a', streamingText: arriving })
        const wrapper = container.querySelector<HTMLElement>('[data-ink]')!
        expect(wrapper.hasAttribute('data-ink-wipe')).toBe(true)
        expect(wrapper.style.animationDuration).toBe('0.8s')
        expect(container.textContent).toBe('a')
    })
    it.each([FadeWords, RiseWords])('never wipes baseline content', (preset) => {
        const { container } = render(preset, { text: 'a', streamingText: baseline })
        expect(container.querySelector('[data-ink-wipe]')).toBeNull()
    })
    it('is off for FadeCharacters unless the consumer opts in', () => {
        const props = { text: 'a', streamingText: arriving }
        expect(render(FadeCharacters, props).container.querySelector('[data-ink]')).toBeNull()
        expect(
            render(FadeCharacters, { ...props, ink: true }).container.querySelector(
                '[data-ink-wipe]'
            )
        ).not.toBeNull()
    })
    it('can be disabled or retimed by the consumer', () => {
        const props = { text: 'a', streamingText: arriving }
        expect(
            render(FadeWords, { ...props, ink: false }).container.querySelector('[data-ink]')
        ).toBeNull()
        expect(
            render(RiseWords, {
                ...props,
                ink: { duration: 0.3 }
            }).container.querySelector<HTMLElement>('[data-ink]')?.style.animationDuration
        ).toBe('0.3s')
    })
})
