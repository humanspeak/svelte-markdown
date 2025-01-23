import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import H4 from './H4.svelte'

describe('H4 Component', () => {
    it('should render h4 element', () => {
        const { container } = render(H4, {
            props: {
                attributes: {
                    class: 'subheading'
                }
            }
        })
        const h4 = container.querySelector('h4')
        expect(h4).toBeTruthy()
        expect(h4?.getAttribute('class')).toBe('subheading')
    })

    it('should handle additional attributes', () => {
        const { container } = render(H4, {
            props: {
                attributes: {
                    id: 'minor-heading',
                    'aria-label': 'Minor heading',
                    'data-level': '4'
                }
            }
        })
        const h4 = container.querySelector('h4')
        expect(h4?.getAttribute('id')).toBe('minor-heading')
        expect(h4?.getAttribute('aria-label')).toBe('Minor heading')
        expect(h4?.getAttribute('data-level')).toBe('4')
    })
})
