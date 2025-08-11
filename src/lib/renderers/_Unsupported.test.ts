import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Unsupported from './_Unsupported.svelte'

describe('_Unsupported Component', () => {
    it('renders raw text as-is', () => {
        const raw = 'Plain text content'
        const { container } = render(Unsupported, { props: { raw } })
        expect(container.textContent).toBe(raw)
    })

    it('does not interpret HTML in raw', () => {
        const raw = '<span>asdf</span>'
        const { container } = render(Unsupported, { props: { raw } })
        expect(container.textContent).toBe(raw)
        expect(container.querySelector('span')).toBeNull()
    })
})
