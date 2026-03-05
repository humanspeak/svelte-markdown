import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import FootnoteRef from './FootnoteRef.svelte'

describe('FootnoteRef', () => {
    it('renders sup with anchor link', () => {
        const { container } = render(FootnoteRef, { props: { id: '1' } })
        const sup = container.querySelector('sup.footnote-ref')
        expect(sup).toBeTruthy()

        const a = sup?.querySelector('a')
        expect(a?.getAttribute('href')).toBe('#fn-1')
        expect(a?.getAttribute('id')).toBe('fnref-1')
        expect(a?.textContent).toBe('1')
    })

    it('handles string ids', () => {
        const { container } = render(FootnoteRef, { props: { id: 'my-note' } })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('#fn-my-note')
        expect(a?.getAttribute('id')).toBe('fnref-my-note')
        expect(a?.textContent).toBe('my-note')
    })
})
