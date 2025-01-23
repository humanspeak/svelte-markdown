import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Fieldset from './Fieldset.svelte'

describe('Fieldset Component', () => {
    it('should render fieldset element', () => {
        const { container } = render(Fieldset, {
            props: {
                attributes: {
                    class: 'form-group'
                }
            }
        })
        const fieldset = container.querySelector('fieldset')
        expect(fieldset).toBeTruthy()
        expect(fieldset?.getAttribute('class')).toBe('form-group')
    })

    it('should handle disabled state and additional attributes', () => {
        const { container } = render(Fieldset, {
            props: {
                attributes: {
                    disabled: '',
                    name: 'user-info',
                    'aria-labelledby': 'group-label'
                }
            }
        })
        const fieldset = container.querySelector('fieldset')
        expect(fieldset?.hasAttribute('disabled')).toBe(true)
        expect(fieldset?.getAttribute('name')).toBe('user-info')
        expect(fieldset?.getAttribute('aria-labelledby')).toBe('group-label')
    })
})
