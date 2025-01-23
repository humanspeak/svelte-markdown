import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Small from './Small.svelte'

describe('Small Component', () => {
    it('should render small element', () => {
        const { container } = render(Small, {
            props: {
                attributes: {
                    class: 'fine-print'
                }
            }
        })
        const small = container.querySelector('small')
        expect(small).toBeTruthy()
        expect(small?.getAttribute('class')).toBe('fine-print')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Small, {
            props: {
                attributes: {
                    id: 'copyright',
                    'aria-label': 'Copyright notice',
                    'data-type': 'legal'
                }
            }
        })
        const small = container.querySelector('small')
        expect(small?.getAttribute('id')).toBe('copyright')
        expect(small?.getAttribute('aria-label')).toBe('Copyright notice')
        expect(small?.getAttribute('data-type')).toBe('legal')
    })
})
