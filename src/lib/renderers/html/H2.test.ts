import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import H2 from './H2.svelte'

describe('H2 Component', () => {
    it('should render h2 element', () => {
        const { container } = render(H2, {
            props: {
                attributes: {
                    class: 'section-title'
                }
            }
        })
        const h2 = container.querySelector('h2')
        expect(h2).toBeTruthy()
        expect(h2?.getAttribute('class')).toBe('section-title')
    })

    it('should handle additional attributes', () => {
        const { container } = render(H2, {
            props: {
                attributes: {
                    id: 'section-heading',
                    'aria-label': 'Section heading',
                    'data-level': '2'
                }
            }
        })
        const h2 = container.querySelector('h2')
        expect(h2?.getAttribute('id')).toBe('section-heading')
        expect(h2?.getAttribute('aria-label')).toBe('Section heading')
        expect(h2?.getAttribute('data-level')).toBe('2')
    })
})
