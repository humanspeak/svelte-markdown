import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Mark from './Mark.svelte'

describe('Mark Component', () => {
    it('should render mark element', () => {
        const { container } = render(Mark, {
            props: {
                attributes: {
                    class: 'highlighted-text'
                }
            }
        })
        const mark = container.querySelector('mark')
        expect(mark).toBeTruthy()
        expect(mark?.getAttribute('class')).toBe('highlighted-text')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Mark, {
            props: {
                attributes: {
                    id: 'search-highlight',
                    'data-match': 'true',
                    'aria-label': 'Search result highlight'
                }
            }
        })
        const mark = container.querySelector('mark')
        expect(mark?.getAttribute('id')).toBe('search-highlight')
        expect(mark?.getAttribute('data-match')).toBe('true')
        expect(mark?.getAttribute('aria-label')).toBe('Search result highlight')
    })
})
