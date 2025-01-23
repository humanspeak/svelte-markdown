import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import P from './P.svelte'

describe('P Component', () => {
    it('should render paragraph element', () => {
        const { container } = render(P, {
            props: {
                attributes: {
                    class: 'text-content'
                }
            }
        })
        const p = container.querySelector('p')
        expect(p).toBeTruthy()
        expect(p?.getAttribute('class')).toBe('text-content')
    })

    it('should handle additional attributes', () => {
        const { container } = render(P, {
            props: {
                attributes: {
                    id: 'intro-text',
                    'data-content': 'introduction',
                    'aria-label': 'Introduction paragraph'
                }
            }
        })
        const p = container.querySelector('p')
        expect(p?.getAttribute('id')).toBe('intro-text')
        expect(p?.getAttribute('data-content')).toBe('introduction')
        expect(p?.getAttribute('aria-label')).toBe('Introduction paragraph')
    })
})
