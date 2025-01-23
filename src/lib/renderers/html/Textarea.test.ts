import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Textarea from './Textarea.svelte'

describe('Textarea Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Textarea, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const textarea = container.querySelector('textarea')
        expect(textarea).toBeTruthy()
        expect(textarea?.getAttribute('class')).toBe('test-class')
        expect(textarea?.getAttribute('id')).toBe('test-id')
    })

    it('should render with textarea-specific attributes', () => {
        const { container } = render(Textarea, {
            props: {
                attributes: {
                    rows: '5',
                    cols: '40',
                    placeholder: 'Enter text here',
                    disabled: '',
                    required: '',
                    maxlength: '1000'
                }
            }
        })

        const textarea = container.querySelector('textarea')
        expect(textarea?.getAttribute('rows')).toBe('5')
        expect(textarea?.getAttribute('cols')).toBe('40')
        expect(textarea?.getAttribute('placeholder')).toBe('Enter text here')
        expect(textarea?.hasAttribute('disabled')).toBe(true)
        expect(textarea?.hasAttribute('required')).toBe(true)
        expect(textarea?.getAttribute('maxlength')).toBe('1000')
    })
})
