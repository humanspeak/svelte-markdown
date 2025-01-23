import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import I from './I.svelte'

describe('I Component', () => {
    it('should render i element', () => {
        const { container } = render(I, {
            props: {
                attributes: {
                    class: 'italic-text'
                }
            }
        })
        const i = container.querySelector('i')
        expect(i).toBeTruthy()
        expect(i?.getAttribute('class')).toBe('italic-text')
    })

    it('should handle additional attributes', () => {
        const { container } = render(I, {
            props: {
                attributes: {
                    id: 'emphasized',
                    lang: 'fr',
                    'aria-label': 'Emphasized text'
                }
            }
        })
        const i = container.querySelector('i')
        expect(i?.getAttribute('id')).toBe('emphasized')
        expect(i?.getAttribute('lang')).toBe('fr')
        expect(i?.getAttribute('aria-label')).toBe('Emphasized text')
    })
})
