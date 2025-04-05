import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import A from './A.svelte'

describe('A Component', () => {
    it('should render anchor with href', () => {
        const { container } = render(A, {
            props: {
                attributes: {
                    href: 'https://example.com'
                }
            }
        })
        const anchor = container.querySelector('a')
        expect(anchor).toBeTruthy()
        expect(anchor?.getAttribute('href')).toBe('https://example.com')
    })

    it('should handle additional attributes', () => {
        const { container } = render(A, {
            props: {
                attributes: {
                    href: '#test',
                    target: '_blank',
                    rel: 'noopener',
                    class: 'custom-link'
                }
            }
        })
        const anchor = container.querySelector('a')
        expect(anchor?.getAttribute('target')).toBe('_blank')
        expect(anchor?.getAttribute('rel')).toBe('noopener')
        expect(anchor?.getAttribute('class')).toBe('custom-link')
    })
})
