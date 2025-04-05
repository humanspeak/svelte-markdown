import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import H1 from './H1.svelte'

describe('H1 Component', () => {
    it('should render h1 element', () => {
        const { container } = render(H1, {
            props: {
                attributes: {
                    class: 'main-title'
                }
            }
        })
        const h1 = container.querySelector('h1')
        expect(h1).toBeTruthy()
        expect(h1?.getAttribute('class')).toBe('main-title')
    })

    it('should handle additional attributes', () => {
        const { container } = render(H1, {
            props: {
                attributes: {
                    id: 'page-title',
                    'aria-label': 'Main heading',
                    'data-level': '1'
                }
            }
        })
        const h1 = container.querySelector('h1')
        expect(h1?.getAttribute('id')).toBe('page-title')
        expect(h1?.getAttribute('aria-label')).toBe('Main heading')
        expect(h1?.getAttribute('data-level')).toBe('1')
    })
})
