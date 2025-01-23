import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Main from './Main.svelte'

describe('Main Component', () => {
    it('should render main element', () => {
        const { container } = render(Main, {
            props: {
                attributes: {
                    class: 'main-content'
                }
            }
        })
        const main = container.querySelector('main')
        expect(main).toBeTruthy()
        expect(main?.getAttribute('class')).toBe('main-content')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Main, {
            props: {
                attributes: {
                    id: 'main-content',
                    role: 'main',
                    'aria-label': 'Main content'
                }
            }
        })
        const main = container.querySelector('main')
        expect(main?.getAttribute('id')).toBe('main-content')
        expect(main?.getAttribute('role')).toBe('main')
        expect(main?.getAttribute('aria-label')).toBe('Main content')
    })
})
