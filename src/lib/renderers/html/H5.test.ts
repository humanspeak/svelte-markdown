import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import H5 from './H5.svelte'

describe('H5 Component', () => {
    it('should render h5 element', () => {
        const { container } = render(H5, {
            props: {
                attributes: {
                    class: 'small-heading'
                }
            }
        })
        const h5 = container.querySelector('h5')
        expect(h5).toBeTruthy()
        expect(h5?.getAttribute('class')).toBe('small-heading')
    })

    it('should handle additional attributes', () => {
        const { container } = render(H5, {
            props: {
                attributes: {
                    id: 'detail-heading',
                    'aria-label': 'Detail heading',
                    'data-level': '5'
                }
            }
        })
        const h5 = container.querySelector('h5')
        expect(h5?.getAttribute('id')).toBe('detail-heading')
        expect(h5?.getAttribute('aria-label')).toBe('Detail heading')
        expect(h5?.getAttribute('data-level')).toBe('5')
    })
})
