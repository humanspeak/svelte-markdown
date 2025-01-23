import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Aside from './Aside.svelte'

describe('Aside Component', () => {
    it('should render aside element', () => {
        const { container } = render(Aside, {
            props: {
                attributes: {
                    class: 'sidebar'
                }
            }
        })
        const aside = container.querySelector('aside')
        expect(aside).toBeTruthy()
        expect(aside?.getAttribute('class')).toBe('sidebar')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Aside, {
            props: {
                attributes: {
                    id: 'main-sidebar',
                    role: 'complementary',
                    'aria-label': 'Sidebar content'
                }
            }
        })
        const aside = container.querySelector('aside')
        expect(aside?.getAttribute('id')).toBe('main-sidebar')
        expect(aside?.getAttribute('role')).toBe('complementary')
        expect(aside?.getAttribute('aria-label')).toBe('Sidebar content')
    })
})
