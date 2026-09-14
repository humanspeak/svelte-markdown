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

    it('renders no landmark for an empty footnotes array', () => {
        const { container } = render(FootnoteSection, { props: { footnotes: [] } })
        expect(container.querySelector('section')).toBeNull()
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

    it('deduplicates labels locally using the first definition', () => {
        const footnotes = [
            { id: 'n', text: 'First.' },
            { id: 'n', text: 'Second.' }
        ]
        const { container } = render(FootnoteSection, { props: { footnotes } })
        const items = container.querySelectorAll('li')

        expect(items).toHaveLength(1)
        expect(items[0].textContent).toContain('First.')
        expect(items[0].textContent).not.toContain('Second.')
    })

    it('renders every prepared backlink with a distinct accessible label', () => {
        const footnotes = [
            {
                id: 'n',
                text: 'Note.',
                backrefs: ['fnref-n', 'fnref-n:ref:2', 'fnref-n:ref:3']
            }
        ]
        const { container } = render(FootnoteSection, { props: { footnotes } })
        const backlinks = Array.from(
            container.querySelectorAll<HTMLAnchorElement>('.footnote-backref')
        )

        expect(backlinks).toHaveLength(3)
        expect(
            backlinks.map((anchor) => decodeURIComponent(new URL(anchor.href).hash.slice(1)))
        ).toEqual(footnotes[0].backrefs)
        expect(backlinks.map((anchor) => anchor.getAttribute('aria-label'))).toEqual([
            'Back to reference 1 for footnote n',
            'Back to reference 2 for footnote n',
            'Back to reference 3 for footnote n'
        ])
    })

    it('treats explicit empty backlinks as no known references', () => {
        const { container } = render(FootnoteSection, {
            props: { footnotes: [{ id: 'n', text: 'Note.', backrefs: [] }] }
        })

        expect(container.querySelector('li')?.id).toBe('fn-n')
        expect(container.querySelector('.footnote-backref')).toBeNull()
    })

    it('encodes special definition labels and legacy fallback backlinks', () => {
        const { container } = render(FootnoteSection, {
            props: { footnotes: [{ id: 'x:ref:2', text: 'Special.' }] }
        })
        const item = container.querySelector('li')
        const backlink = container.querySelector<HTMLAnchorElement>('.footnote-backref')

        expect(item?.id).toBe('fn-x~003aref~003a2')
        expect(decodeURIComponent(new URL(backlink!.href).hash.slice(1))).toBe(
            'fnref-x~003aref~003a2'
        )
    })
})
