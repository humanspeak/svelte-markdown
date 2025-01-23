import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Embed from './Embed.svelte'

describe('Embed Component', () => {
    it('should render embed element with source', () => {
        const { container } = render(Embed, {
            props: {
                attributes: {
                    src: 'media.swf',
                    type: 'application/x-shockwave-flash'
                }
            }
        })
        const embed = container.querySelector('embed')
        expect(embed).toBeTruthy()
        expect(embed?.getAttribute('src')).toBe('media.swf')
        expect(embed?.getAttribute('type')).toBe('application/x-shockwave-flash')
    })

    it('should handle dimensions and additional attributes', () => {
        const { container } = render(Embed, {
            props: {
                attributes: {
                    width: '640',
                    height: '480',
                    class: 'media-embed'
                }
            }
        })
        const embed = container.querySelector('embed')
        expect(embed?.getAttribute('width')).toBe('640')
        expect(embed?.getAttribute('height')).toBe('480')
        expect(embed?.getAttribute('class')).toBe('media-embed')
    })
})
