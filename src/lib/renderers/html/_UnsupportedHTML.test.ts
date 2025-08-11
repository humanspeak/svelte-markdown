import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import UnsupportedHTML from './_UnsupportedHTML.svelte'

describe('_UnsupportedHTML Component', () => {
    it('renders the provided tag (escaped) without children', () => {
        const { container } = render(UnsupportedHTML, {
            props: {
                tag: 'span'
            }
        })
        // Component escapes angle brackets; no children provided
        expect(container.textContent).toBe('<span></span>')
    })

    it('supports different tags (escaped) without children', () => {
        const { container } = render(UnsupportedHTML, {
            props: {
                tag: 'div'
            }
        })
        expect(container.textContent).toBe('<div></div>')
    })
})
