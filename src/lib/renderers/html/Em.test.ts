import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Em from './Em.svelte'

describe('Em Component', () => {
    it('should render emphasis element', () => {
        const { container } = render(Em, {
            props: {
                attributes: {
                    class: 'emphasized'
                }
            }
        })
        const em = container.querySelector('em')
        expect(em).toBeTruthy()
        expect(em?.getAttribute('class')).toBe('emphasized')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Em, {
            props: {
                attributes: {
                    id: 'em-1',
                    lang: 'en',
                    'data-emphasis': 'strong'
                }
            }
        })
        const em = container.querySelector('em')
        expect(em?.getAttribute('id')).toBe('em-1')
        expect(em?.getAttribute('lang')).toBe('en')
        expect(em?.getAttribute('data-emphasis')).toBe('strong')
    })
})
