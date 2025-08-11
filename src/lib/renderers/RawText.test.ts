import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import RawText from './RawText.svelte'

describe('RawText (markdown)', () => {
    it('renders provided text', () => {
        const { container } = render(RawText, { props: { text: 'hello' } })
        expect(container.textContent).toBe('hello')
    })

    it('does not parse HTML in text', () => {
        const { container } = render(RawText, { props: { text: '<em>hi</em>' } })
        // HTML tags must be treated as plain text
        expect(container.querySelector('em')).toBeNull()
        expect(container.textContent).toBe('<em>hi</em>')
    })
})
