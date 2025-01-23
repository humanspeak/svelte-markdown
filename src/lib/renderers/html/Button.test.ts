import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Button from './Button.svelte'

describe('Button Component', () => {
    it('should render button with type', () => {
        const { container } = render(Button, {
            props: {
                attributes: {
                    type: 'submit'
                }
            }
        })
        const button = container.querySelector('button')
        expect(button).toBeTruthy()
        expect(button?.getAttribute('type')).toBe('submit')
    })

    it('should handle button states and attributes', () => {
        const { container } = render(Button, {
            props: {
                attributes: {
                    disabled: '',
                    class: 'custom-button',
                    'aria-pressed': 'true',
                    'data-action': 'submit'
                }
            }
        })
        const button = container.querySelector('button')
        expect(button?.hasAttribute('disabled')).toBe(true)
        expect(button?.getAttribute('class')).toBe('custom-button')
        expect(button?.getAttribute('aria-pressed')).toBe('true')
        expect(button?.getAttribute('data-action')).toBe('submit')
    })
})
