import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Source from './Source.svelte'

describe('Source Component', () => {
    it('should render source element with media attributes', () => {
        const { container } = render(Source, {
            props: {
                attributes: {
                    src: 'video.mp4',
                    type: 'video/mp4',
                    media: '(min-width: 800px)'
                }
            }
        })
        const source = container.querySelector('source')
        expect(source).toBeTruthy()
        expect(source?.getAttribute('src')).toBe('video.mp4')
        expect(source?.getAttribute('type')).toBe('video/mp4')
        expect(source?.getAttribute('media')).toBe('(min-width: 800px)')
    })

    it('should handle srcset and additional attributes', () => {
        const { container } = render(Source, {
            props: {
                attributes: {
                    srcset: 'image-1x.jpg 1x, image-2x.jpg 2x',
                    sizes: '(max-width: 600px) 100vw, 50vw',
                    'data-quality': 'high'
                }
            }
        })
        const source = container.querySelector('source')
        expect(source?.getAttribute('srcset')).toBe('image-1x.jpg 1x, image-2x.jpg 2x')
        expect(source?.getAttribute('sizes')).toBe('(max-width: 600px) 100vw, 50vw')
        expect(source?.getAttribute('data-quality')).toBe('high')
    })
})
