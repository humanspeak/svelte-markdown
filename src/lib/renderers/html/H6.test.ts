import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import H6 from './H6.svelte'

describe('H6 Component', () => {
    it('should render h6 element', () => {
        const { container } = render(H6, {
            props: {
                attributes: {
                    class: 'micro-heading'
                }
            }
        })
        const h6 = container.querySelector('h6')
        expect(h6).toBeTruthy()
        expect(h6?.getAttribute('class')).toBe('micro-heading')
    })

    it('should handle additional attributes', () => {
        const { container } = render(H6, {
            props: {
                attributes: {
                    id: 'micro-heading',
                    'aria-label': 'Micro heading',
                    'data-level': '6'
                }
            }
        })
        const h6 = container.querySelector('h6')
        expect(h6?.getAttribute('id')).toBe('micro-heading')
        expect(h6?.getAttribute('aria-label')).toBe('Micro heading')
        expect(h6?.getAttribute('data-level')).toBe('6')
    })
})
