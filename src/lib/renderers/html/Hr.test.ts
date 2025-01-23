import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Hr from './Hr.svelte'

describe('Hr Component', () => {
    it('should render hr element', () => {
        const { container } = render(Hr, {
            props: {
                attributes: {
                    class: 'divider'
                }
            }
        })
        const hr = container.querySelector('hr')
        expect(hr).toBeTruthy()
        expect(hr?.getAttribute('class')).toBe('divider')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Hr, {
            props: {
                attributes: {
                    'aria-hidden': 'true',
                    role: 'separator',
                    id: 'section-divider'
                }
            }
        })
        const hr = container.querySelector('hr')
        expect(hr?.getAttribute('aria-hidden')).toBe('true')
        expect(hr?.getAttribute('role')).toBe('separator')
        expect(hr?.getAttribute('id')).toBe('section-divider')
    })
})
