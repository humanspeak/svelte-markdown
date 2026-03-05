import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import FootnoteSection from './FootnoteSection.svelte'

describe('FootnoteSection', () => {
    it('renders section with footnotes list', () => {
        const footnotes = [
            { id: '1', text: 'First footnote' },
            { id: '2', text: 'Second footnote' }
        ]
        const { container } = render(FootnoteSection, { props: { footnotes } })

        const section = container.querySelector('section.footnotes')
        expect(section).toBeTruthy()
        expect(section?.getAttribute('role')).toBe('doc-endnotes')

        const items = section?.querySelectorAll('li')
        expect(items).toHaveLength(2)
    })

    it('renders correct id and backref link for each footnote', () => {
        const footnotes = [{ id: 'abc', text: 'A footnote' }]
        const { container } = render(FootnoteSection, { props: { footnotes } })

        const li = container.querySelector('li')
        expect(li?.getAttribute('id')).toBe('fn-abc')
        expect(li?.querySelector('p')?.textContent).toContain('A footnote')

        const backref = li?.querySelector('a.footnote-backref')
        expect(backref?.getAttribute('href')).toBe('#fnref-abc')
        expect(backref?.getAttribute('role')).toBe('doc-backlink')
    })

    it('renders empty list for empty footnotes array', () => {
        const { container } = render(FootnoteSection, { props: { footnotes: [] } })
        const items = container.querySelectorAll('li')
        expect(items).toHaveLength(0)
    })

    it('renders multiple footnotes in order', () => {
        const footnotes = [
            { id: '1', text: 'First' },
            { id: '2', text: 'Second' },
            { id: '3', text: 'Third' }
        ]
        const { container } = render(FootnoteSection, { props: { footnotes } })

        const items = container.querySelectorAll('li')
        expect(items).toHaveLength(3)
        expect(items[0].getAttribute('id')).toBe('fn-1')
        expect(items[1].getAttribute('id')).toBe('fn-2')
        expect(items[2].getAttribute('id')).toBe('fn-3')
    })
})
