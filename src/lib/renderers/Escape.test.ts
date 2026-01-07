import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Escape from './Escape.svelte'

describe('Escape (markdown)', () => {
    it('renders provided text', () => {
        const { container } = render(Escape, { props: { text: 'hello' } })
        expect(container.textContent).toBe('hello')
    })

    it('renders escaped characters', () => {
        const { container } = render(Escape, { props: { text: '\\*escaped\\*' } })
        expect(container.textContent).toBe('\\*escaped\\*')
    })

    it('does not parse HTML in text', () => {
        const { container } = render(Escape, { props: { text: '<em>hi</em>' } })
        // HTML tags must be treated as plain text
        expect(container.querySelector('em')).toBeNull()
        expect(container.textContent).toBe('<em>hi</em>')
    })

    it('renders empty string when text is undefined', () => {
        const { container } = render(Escape, { props: {} })
        expect(container.textContent).toBe('')
    })

    it('renders empty string when text is empty', () => {
        const { container } = render(Escape, { props: { text: '' } })
        expect(container.textContent).toBe('')
    })

    it('handles special characters', () => {
        const { container } = render(Escape, { props: { text: '&amp; &lt; &gt;' } })
        expect(container.textContent).toBe('&amp; &lt; &gt;')
    })
})
