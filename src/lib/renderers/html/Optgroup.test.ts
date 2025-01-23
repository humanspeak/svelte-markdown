import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Optgroup from './Optgroup.svelte'

describe('Optgroup Component', () => {
    it('should render optgroup element', () => {
        const { container } = render(Optgroup, {
            props: {
                attributes: {
                    label: 'Colors',
                    class: 'color-group'
                }
            }
        })
        const optgroup = container.querySelector('optgroup')
        expect(optgroup).toBeTruthy()
        expect(optgroup?.getAttribute('label')).toBe('Colors')
        expect(optgroup?.getAttribute('class')).toBe('color-group')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Optgroup, {
            props: {
                attributes: {
                    disabled: '',
                    id: 'color-options',
                    'data-group': 'colors',
                    'aria-label': 'Color options'
                }
            }
        })
        const optgroup = container.querySelector('optgroup')
        expect(optgroup?.hasAttribute('disabled')).toBe(true)
        expect(optgroup?.getAttribute('id')).toBe('color-options')
        expect(optgroup?.getAttribute('data-group')).toBe('colors')
        expect(optgroup?.getAttribute('aria-label')).toBe('Color options')
    })
})
