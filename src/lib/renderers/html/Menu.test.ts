import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Menu from './Menu.svelte'

describe('Menu Component', () => {
    it('should render menu element', () => {
        const { container } = render(Menu, {
            props: {
                attributes: {
                    type: 'toolbar',
                    class: 'menu-toolbar'
                }
            }
        })
        const menu = container.querySelector('menu')
        expect(menu).toBeTruthy()
        expect(menu?.getAttribute('type')).toBe('toolbar')
        expect(menu?.getAttribute('class')).toBe('menu-toolbar')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Menu, {
            props: {
                attributes: {
                    id: 'main-menu',
                    role: 'menu',
                    'aria-label': 'Main menu',
                    'data-menu-type': 'context'
                }
            }
        })
        const menu = container.querySelector('menu')
        expect(menu?.getAttribute('id')).toBe('main-menu')
        expect(menu?.getAttribute('role')).toBe('menu')
        expect(menu?.getAttribute('aria-label')).toBe('Main menu')
        expect(menu?.getAttribute('data-menu-type')).toBe('context')
    })
})
