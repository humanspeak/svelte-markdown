import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Form from './Form.svelte'

describe('Form Component', () => {
    it('should render form element with basic attributes', () => {
        const { container } = render(Form, {
            props: {
                attributes: {
                    action: '/submit',
                    method: 'post'
                }
            }
        })
        const form = container.querySelector('form')
        expect(form).toBeTruthy()
        expect(form?.getAttribute('action')).toBe('/submit')
        expect(form?.getAttribute('method')).toBe('post')
    })

    it('should handle additional form attributes', () => {
        const { container } = render(Form, {
            props: {
                attributes: {
                    enctype: 'multipart/form-data',
                    'data-form-type': 'contact',
                    novalidate: '',
                    class: 'contact-form'
                }
            }
        })
        const form = container.querySelector('form')
        expect(form?.getAttribute('enctype')).toBe('multipart/form-data')
        expect(form?.getAttribute('data-form-type')).toBe('contact')
        expect(form?.hasAttribute('novalidate')).toBe(true)
        expect(form?.getAttribute('class')).toBe('contact-form')
    })
})
