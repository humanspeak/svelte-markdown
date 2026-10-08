import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import StreamingText from './StreamingText.svelte'
import Segments from './test/streaming-text/Segments.svelte'

describe('StreamingText', () => {
    it('renders escaped plain text without wrappers', () => {
        const { container } = render(StreamingText, { text: '<b> 👩‍💻 é\n' })
        expect(container.textContent).toBe('<b> 👩‍💻 é\n')
        expect(container.querySelector('*')).toBeNull()
    })
    it('retains the trailing keyed node as a grapheme extends', async () => {
        const { container, rerender } = render(Segments, { text: '👩', granularity: 'grapheme' })
        const node = container.querySelector('span')
        await rerender({ text: '👩‍💻', granularity: 'grapheme' })
        expect(container.querySelector('span')).toBe(node)
        expect(container.textContent).toBe('👩‍💻')
        expect(node?.getAttribute('data-new')).toBe('false')
    })
    it('preserves whitespace and segments combining marks and flags', () => {
        const { container } = render(Segments, { text: 'é 🇺🇸\t\n', granularity: 'grapheme' })
        expect(container.textContent).toBe('é 🇺🇸\t\n')
        expect(Array.from(container.querySelectorAll('span'), (node) => node.textContent)).toEqual([
            'é',
            ' ',
            '🇺🇸',
            '\t',
            '\n'
        ])
    })
})
