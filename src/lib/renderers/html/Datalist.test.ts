import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Datalist from './Datalist.svelte'

describe('Datalist Component', () => {
    it('should render datalist element', () => {
        const { container } = render(Datalist, {
            props: {
                attributes: {
                    id: 'options-list'
                }
            }
        })
        const datalist = container.querySelector('datalist')
        expect(datalist).toBeTruthy()
        expect(datalist?.getAttribute('id')).toBe('options-list')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Datalist, {
            props: {
                attributes: {
                    class: 'custom-datalist',
                    'data-options': 'dynamic'
                }
            }
        })
        const datalist = container.querySelector('datalist')
        expect(datalist?.getAttribute('class')).toBe('custom-datalist')
        expect(datalist?.getAttribute('data-options')).toBe('dynamic')
    })
})
