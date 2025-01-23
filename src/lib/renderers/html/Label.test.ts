import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Label from './Label.svelte'

describe('Label Component', () => {
    it('should render label element', () => {
        const { container } = render(Label, {
            props: {
                attributes: {
                    for: 'username',
                    class: 'form-label'
                }
            }
        })
        const label = container.querySelector('label')
        expect(label).toBeTruthy()
        expect(label?.getAttribute('for')).toBe('username')
        expect(label?.getAttribute('class')).toBe('form-label')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Label, {
            props: {
                attributes: {
                    id: 'user-label',
                    'data-required': 'true',
                    'aria-label': 'Username field label'
                }
            }
        })
        const label = container.querySelector('label')
        expect(label?.getAttribute('id')).toBe('user-label')
        expect(label?.getAttribute('data-required')).toBe('true')
        expect(label?.getAttribute('aria-label')).toBe('Username field label')
    })
})
