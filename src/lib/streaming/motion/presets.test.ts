import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
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
