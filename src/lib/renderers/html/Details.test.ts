import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Details from './Details.svelte'

describe('Details Component', () => {
    it('should render details element with open state', () => {
        const { container } = render(Details, {
            props: {
                attributes: {
                    open: ''
                }
            }
        })
        const details = container.querySelector('details')
        expect(details).toBeTruthy()
        expect(details?.hasAttribute('open')).toBe(true)
    })

    it('should handle additional attributes', () => {
        const { container } = render(Details, {
            props: {
                attributes: {
                    class: 'custom-details',
                    'data-expanded': 'true'
                }
            }
        })
        const details = container.querySelector('details')
        expect(details?.getAttribute('class')).toBe('custom-details')
        expect(details?.getAttribute('data-expanded')).toBe('true')
    })
})
