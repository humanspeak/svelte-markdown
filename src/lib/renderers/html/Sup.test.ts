import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Sup from './Sup.svelte'

describe('Sup Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Sup, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const sup = container.querySelector('sup')
        expect(sup).toBeTruthy()
        expect(sup?.getAttribute('class')).toBe('test-class')
        expect(sup?.getAttribute('id')).toBe('test-id')
    })

    it('should render with style attribute', () => {
        const { container } = render(Sup, {
            props: {
                attributes: {
                    style: 'vertical-align: super'
                }
            }
        })

        const sup = container.querySelector('sup')
        expect(sup?.getAttribute('style')).toBe('vertical-align: super;')
    })
})
