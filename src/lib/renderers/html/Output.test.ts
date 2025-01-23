import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Output from './Output.svelte'

describe('Output Component', () => {
    it('should render output element with basic attributes', () => {
        const { container } = render(Output, {
            props: {
                attributes: {
                    for: 'calculation',
                    name: 'result'
                }
            }
        })
        const output = container.querySelector('output')
        expect(output).toBeTruthy()
        expect(output?.getAttribute('for')).toBe('calculation')
        expect(output?.getAttribute('name')).toBe('result')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Output, {
            props: {
                attributes: {
                    form: 'calc-form',
                    class: 'calculation-result',
                    'aria-live': 'polite'
                }
            }
        })
        const output = container.querySelector('output')
        expect(output?.getAttribute('form')).toBe('calc-form')
        expect(output?.getAttribute('class')).toBe('calculation-result')
        expect(output?.getAttribute('aria-live')).toBe('polite')
    })
})
