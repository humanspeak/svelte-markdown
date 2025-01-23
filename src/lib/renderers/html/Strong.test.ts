import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Strong from './Strong.svelte'

describe('Strong Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Strong, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const strong = container.querySelector('strong')
        expect(strong).toBeTruthy()
        expect(strong?.getAttribute('class')).toBe('test-class')
        expect(strong?.getAttribute('id')).toBe('test-id')
    })

    it('should render with aria attributes', () => {
        const { container } = render(Strong, {
            props: {
                attributes: {
                    'aria-label': 'important text',
                    role: 'text'
                }
            }
        })

        const strong = container.querySelector('strong')
        expect(strong?.getAttribute('aria-label')).toBe('important text')
        expect(strong?.getAttribute('role')).toBe('text')
    })
})
