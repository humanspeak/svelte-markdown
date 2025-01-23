import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Sub from './Sub.svelte'

describe('Sub Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Sub, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const sub = container.querySelector('sub')
        expect(sub).toBeTruthy()
        expect(sub?.getAttribute('class')).toBe('test-class')
        expect(sub?.getAttribute('id')).toBe('test-id')
    })

    it('should render with style attribute', () => {
        const { container } = render(Sub, {
            props: {
                attributes: {
                    style: 'font-size: 0.8em'
                }
            }
        })

        const sub = container.querySelector('sub')
        expect(sub?.getAttribute('style')).toBe('font-size: 0.8em;')
    })
})
