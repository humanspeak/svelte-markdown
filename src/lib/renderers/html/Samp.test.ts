import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Samp from './Samp.svelte'

describe('Samp Component', () => {
    it('should render sample output element', () => {
        const { container } = render(Samp, {
            props: {
                attributes: {
                    class: 'sample-output'
                }
            }
        })
        const samp = container.querySelector('samp')
        expect(samp).toBeTruthy()
        expect(samp?.getAttribute('class')).toBe('sample-output')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Samp, {
            props: {
                attributes: {
                    id: 'error-output',
                    'data-type': 'error',
                    'aria-label': 'Error message output'
                }
            }
        })
        const samp = container.querySelector('samp')
        expect(samp?.getAttribute('id')).toBe('error-output')
        expect(samp?.getAttribute('data-type')).toBe('error')
        expect(samp?.getAttribute('aria-label')).toBe('Error message output')
    })
})
