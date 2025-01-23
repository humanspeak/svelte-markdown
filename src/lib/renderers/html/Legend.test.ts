import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Legend from './Legend.svelte'

describe('Legend Component', () => {
    it('should render legend element', () => {
        const { container } = render(Legend, {
            props: {
                attributes: {
                    class: 'fieldset-legend'
                }
            }
        })
        const legend = container.querySelector('legend')
        expect(legend).toBeTruthy()
        expect(legend?.getAttribute('class')).toBe('fieldset-legend')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Legend, {
            props: {
                attributes: {
                    id: 'contact-legend',
                    'aria-label': 'Contact information section',
                    'data-section': 'contact'
                }
            }
        })
        const legend = container.querySelector('legend')
        expect(legend?.getAttribute('id')).toBe('contact-legend')
        expect(legend?.getAttribute('aria-label')).toBe('Contact information section')
        expect(legend?.getAttribute('data-section')).toBe('contact')
    })
})
