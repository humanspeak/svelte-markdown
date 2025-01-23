import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Select from './Select.svelte'

describe('Select Component', () => {
    it('should render select element with basic attributes', () => {
        const { container } = render(Select, {
            props: {
                attributes: {
                    name: 'colors',
                    id: 'color-select'
                }
            }
        })
        const select = container.querySelector('select')
        expect(select).toBeTruthy()
        expect(select?.getAttribute('name')).toBe('colors')
        expect(select?.getAttribute('id')).toBe('color-select')
    })

    it('should handle multiple selection and additional attributes', () => {
        const { container } = render(Select, {
            props: {
                attributes: {
                    multiple: '',
                    required: '',
                    disabled: '',
                    class: 'form-select',
                    'aria-label': 'Color selection',
                    size: '3'
                }
            }
        })
        const select = container.querySelector('select')
        expect(select?.hasAttribute('multiple')).toBe(true)
        expect(select?.hasAttribute('required')).toBe(true)
        expect(select?.hasAttribute('disabled')).toBe(true)
        expect(select?.getAttribute('class')).toBe('form-select')
        expect(select?.getAttribute('aria-label')).toBe('Color selection')
        expect(select?.getAttribute('size')).toBe('3')
    })
})
