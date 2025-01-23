import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Summary from './Summary.svelte'

describe('Summary Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Summary, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const summary = container.querySelector('summary')
        expect(summary).toBeTruthy()
        expect(summary?.getAttribute('class')).toBe('test-class')
        expect(summary?.getAttribute('id')).toBe('test-id')
    })

    it('should render with aria attributes', () => {
        const { container } = render(Summary, {
            props: {
                attributes: {
                    'aria-expanded': 'true',
                    role: 'button'
                }
            }
        })

        const summary = container.querySelector('summary')
        expect(summary?.getAttribute('aria-expanded')).toBe('true')
        expect(summary?.getAttribute('role')).toBe('button')
    })
})
