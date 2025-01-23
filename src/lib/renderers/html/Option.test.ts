import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Option from './Option.svelte'

describe('Option Component', () => {
    it('should render option element with value', () => {
        const { container } = render(Option, {
            props: {
                attributes: {
                    value: 'red',
                    label: 'Red'
                }
            }
        })
        const option = container.querySelector('option')
        expect(option).toBeTruthy()
        expect(option?.getAttribute('value')).toBe('red')
        expect(option?.getAttribute('label')).toBe('Red')
    })

    it('should handle disabled and additional attributes', () => {
        const { container } = render(Option, {
            props: {
                attributes: {
                    disabled: '',
                    class: 'color-option',
                    'data-color': 'primary'
                }
            }
        })
        const option = container.querySelector('option')
        expect(option?.hasAttribute('disabled')).toBe(true)
        expect(option?.getAttribute('class')).toBe('color-option')
        expect(option?.getAttribute('data-color')).toBe('primary')
    })

    it('should handle selected state', () => {
        const { container } = render(Option, {
            props: {
                attributes: {
                    value: 'blue',
                    selected: 'true'
                }
            }
        })
        const option = container.querySelector('option')
        expect(option?.hasAttribute('selected')).toBe(true)
    })
})
