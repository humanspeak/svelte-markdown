import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Nav from './Nav.svelte'

describe('Nav Component', () => {
    it('should render nav element', () => {
        const { container } = render(Nav, {
            props: {
                attributes: {
                    class: 'site-navigation'
                }
            }
        })
        const nav = container.querySelector('nav')
        expect(nav).toBeTruthy()
        expect(nav?.getAttribute('class')).toBe('site-navigation')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Nav, {
            props: {
                attributes: {
                    id: 'main-nav',
                    'aria-label': 'Main navigation',
                    role: 'navigation',
                    'data-nav-type': 'primary'
                }
            }
        })
        const nav = container.querySelector('nav')
        expect(nav?.getAttribute('id')).toBe('main-nav')
        expect(nav?.getAttribute('aria-label')).toBe('Main navigation')
        expect(nav?.getAttribute('role')).toBe('navigation')
        expect(nav?.getAttribute('data-nav-type')).toBe('primary')
    })
})
