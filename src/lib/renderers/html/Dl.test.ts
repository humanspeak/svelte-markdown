import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Dl from './Dl.svelte'

describe('Dl Component', () => {
    it('should render description list element', () => {
        const { container } = render(Dl, {
            props: {
                attributes: {
                    class: 'definition-list'
                }
            }
        })
        const dl = container.querySelector('dl')
        expect(dl).toBeTruthy()
        expect(dl?.getAttribute('class')).toBe('definition-list')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Dl, {
            props: {
                attributes: {
                    id: 'terms-list',
                    'aria-label': 'Terms and definitions'
                }
            }
        })
        const dl = container.querySelector('dl')
        expect(dl?.getAttribute('id')).toBe('terms-list')
        expect(dl?.getAttribute('aria-label')).toBe('Terms and definitions')
    })
})
