import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Input from './Input.svelte'

describe('Input Component', () => {
    it('should render input element with basic attributes', () => {
        const { container } = render(Input, {
            props: {
                attributes: {
                    type: 'text',
                    name: 'username',
                    value: 'test'
                }
            }
        })
        const input = container.querySelector('input')
        expect(input).toBeTruthy()
        expect(input?.getAttribute('type')).toBe('text')
        expect(input?.getAttribute('name')).toBe('username')
        expect((input as HTMLInputElement)?.value).toBe('test')
    })

    it('should handle additional input attributes', () => {
        const { container } = render(Input, {
            props: {
                attributes: {
                    placeholder: 'Enter text',
                    required: '',
                    disabled: '',
                    class: 'form-input',
                    'aria-label': 'Username input'
                }
            }
        })
        const input = container.querySelector('input')
        expect(input?.getAttribute('placeholder')).toBe('Enter text')
        expect(input?.hasAttribute('required')).toBe(true)
        expect(input?.hasAttribute('disabled')).toBe(true)
        expect(input?.getAttribute('class')).toBe('form-input')
        expect(input?.getAttribute('aria-label')).toBe('Username input')
    })
})
