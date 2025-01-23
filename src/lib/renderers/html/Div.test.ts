import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Div from './Div.svelte'

describe('Div Component', () => {
    it('should render div element', () => {
        const { container } = render(Div, {
            props: {
                attributes: {
                    class: 'container'
                }
            }
        })
        const div = container.querySelector('div')
        expect(div).toBeTruthy()
        expect(div?.getAttribute('class')).toBe('container')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Div, {
            props: {
                attributes: {
                    id: 'main-container',
                    'data-testid': 'test-div',
                    role: 'presentation'
                }
            }
        })
        const div = container.querySelector('div')
        expect(div?.getAttribute('id')).toBe('main-container')
        expect(div?.getAttribute('data-testid')).toBe('test-div')
        expect(div?.getAttribute('role')).toBe('presentation')
    })
})
