import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Header from './Header.svelte'

describe('Header Component', () => {
    it('should render header element', () => {
        const { container } = render(Header, {
            props: {
                attributes: {
                    class: 'site-header'
                }
            }
        })
        const header = container.querySelector('header')
        expect(header).toBeTruthy()
        expect(header?.getAttribute('class')).toBe('site-header')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Header, {
            props: {
                attributes: {
                    role: 'banner',
                    'aria-label': 'Site header',
                    id: 'main-header'
                }
            }
        })
        const header = container.querySelector('header')
        expect(header?.getAttribute('role')).toBe('banner')
        expect(header?.getAttribute('aria-label')).toBe('Site header')
        expect(header?.getAttribute('id')).toBe('main-header')
    })
})
