import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Var from './Var.svelte'

describe('Var Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Var, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const varElement = container.querySelector('var')
        expect(varElement).toBeTruthy()
        expect(varElement?.getAttribute('class')).toBe('test-class')
        expect(varElement?.getAttribute('id')).toBe('test-id')
    })

    it('should render with style attribute', () => {
        const { container } = render(Var, {
            props: {
                attributes: {
                    style: 'font-style: italic'
                }
            }
        })

        const varElement = container.querySelector('var')
        expect(varElement?.getAttribute('style')).toBe('font-style: italic;')
    })
})
