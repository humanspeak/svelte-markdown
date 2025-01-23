import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Span from './Span.svelte'

describe('Span Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Span, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const span = container.querySelector('span')
        expect(span).toBeTruthy()
        expect(span?.getAttribute('class')).toBe('test-class')
        expect(span?.getAttribute('id')).toBe('test-id')
    })

    it('should render with data attributes', () => {
        const { container } = render(Span, {
            props: {
                attributes: {
                    'data-testid': 'test-span',
                    'data-custom': 'value'
                }
            }
        })

        const span = container.querySelector('span')
        expect(span?.getAttribute('data-testid')).toBe('test-span')
        expect(span?.getAttribute('data-custom')).toBe('value')
    })
})
