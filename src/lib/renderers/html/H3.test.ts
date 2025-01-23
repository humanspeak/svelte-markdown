import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import H3 from './H3.svelte'

describe('H3 Component', () => {
    it('should render h3 element', () => {
        const { container } = render(H3, {
            props: {
                attributes: {
                    class: 'subsection-title'
                }
            }
        })
        const h3 = container.querySelector('h3')
        expect(h3).toBeTruthy()
        expect(h3?.getAttribute('class')).toBe('subsection-title')
    })

    it('should handle additional attributes', () => {
        const { container } = render(H3, {
            props: {
                attributes: {
                    id: 'subsection-heading',
                    'aria-label': 'Subsection heading',
                    'data-level': '3'
                }
            }
        })
        const h3 = container.querySelector('h3')
        expect(h3?.getAttribute('id')).toBe('subsection-heading')
        expect(h3?.getAttribute('aria-label')).toBe('Subsection heading')
        expect(h3?.getAttribute('data-level')).toBe('3')
    })
})
