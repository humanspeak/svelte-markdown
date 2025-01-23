import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Picture from './Picture.svelte'

describe('Picture Component', () => {
    it('should render picture element', () => {
        const { container } = render(Picture, {
            props: {
                attributes: {
                    class: 'responsive-image'
                }
            }
        })
        const picture = container.querySelector('picture')
        expect(picture).toBeTruthy()
        expect(picture?.getAttribute('class')).toBe('responsive-image')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Picture, {
            props: {
                attributes: {
                    id: 'hero-image',
                    'data-lazy': 'true',
                    'aria-label': 'Hero section image'
                }
            }
        })
        const picture = container.querySelector('picture')
        expect(picture?.getAttribute('id')).toBe('hero-image')
        expect(picture?.getAttribute('data-lazy')).toBe('true')
        expect(picture?.getAttribute('aria-label')).toBe('Hero section image')
    })
})
