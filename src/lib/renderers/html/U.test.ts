import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import U from './U.svelte'

describe('U Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(U, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const u = container.querySelector('u')
        expect(u).toBeTruthy()
        expect(u?.getAttribute('class')).toBe('test-class')
        expect(u?.getAttribute('id')).toBe('test-id')
    })

    it('should render with style attribute', () => {
        const { container } = render(U, {
            props: {
                attributes: {
                    style: 'text-decoration: underline wavy'
                }
            }
        })

        const u = container.querySelector('u')
        expect(u?.getAttribute('style')).toBe('text-decoration: underline wavy;')
    })
})
