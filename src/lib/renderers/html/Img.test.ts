import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Img from './Img.svelte'

describe('Img Component', () => {
    it('should render image with src and alt', () => {
        const { container } = render(Img, {
            props: {
                attributes: {
                    src: 'test.jpg',
                    alt: 'Test Image'
                }
            }
        })
        const img = container.querySelector('img')
        expect(img).toBeTruthy()
        expect(img?.getAttribute('src')).toBe('test.jpg')
        expect(img?.getAttribute('alt')).toBe('Test Image')
    })

    it('should handle loading and dimensions', () => {
        const { container } = render(Img, {
            props: {
                attributes: {
                    src: 'test.jpg',
                    alt: 'Test Image',
                    loading: 'lazy',
                    width: '100',
                    height: '100'
                }
            }
        })
        const img = container.querySelector('img')
        expect(img?.getAttribute('loading')).toBe('lazy')
        expect(img?.getAttribute('width')).toBe('100')
        expect(img?.getAttribute('height')).toBe('100')
    })
})
