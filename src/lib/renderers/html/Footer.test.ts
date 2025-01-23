import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Footer from './Footer.svelte'

describe('Footer Component', () => {
    it('should render footer element', () => {
        const { container } = render(Footer, {
            props: {
                attributes: {
                    class: 'site-footer'
                }
            }
        })
        const footer = container.querySelector('footer')
        expect(footer).toBeTruthy()
        expect(footer?.getAttribute('class')).toBe('site-footer')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Footer, {
            props: {
                attributes: {
                    role: 'contentinfo',
                    'aria-label': 'Site footer',
                    id: 'main-footer'
                }
            }
        })
        const footer = container.querySelector('footer')
        expect(footer?.getAttribute('role')).toBe('contentinfo')
        expect(footer?.getAttribute('aria-label')).toBe('Site footer')
        expect(footer?.getAttribute('id')).toBe('main-footer')
    })
})
