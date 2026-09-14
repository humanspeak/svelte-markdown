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

    it('uses a prepared occurrence id when provided', () => {
        const { container } = render(FootnoteRef, {
            props: { id: 'n', referenceId: 'fnref-n:ref:2' }
        })
        const anchor = container.querySelector('a')

        expect(anchor?.id).toBe('fnref-n:ref:2')
        expect(anchor?.getAttribute('href')).toBe('#fn-n')
        expect(anchor?.textContent).toBe('n')
    })

    it('encodes punctuation, Unicode, and malformed UTF-16 labels', () => {
        const labels = ['x:ref:2', 'é', '\ud800']
        const expected = [
            ['fnref-x~003aref~003a2', '#fn-x~003aref~003a2'],
            ['fnref-~00e9', '#fn-~00e9'],
            ['fnref-~d800', '#fn-~d800']
        ]

        labels.forEach((id, index) => {
            const { container } = render(FootnoteRef, { props: { id } })
            const anchor = container.querySelector('a')
            expect(anchor?.id).toBe(expected[index][0])
            expect(anchor?.getAttribute('href')).toBe(expected[index][1])
        })
    })
})
