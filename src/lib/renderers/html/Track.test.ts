import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Track from './Track.svelte'

describe('Track Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Track, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const track = container.querySelector('track')
        expect(track).toBeTruthy()
        expect(track?.getAttribute('class')).toBe('test-class')
        expect(track?.getAttribute('id')).toBe('test-id')
    })

    it('should render with track-specific attributes', () => {
        const { container } = render(Track, {
            props: {
                attributes: {
                    kind: 'subtitles',
                    src: 'subtitles.vtt',
                    srclang: 'en',
                    label: 'English',
                    default: ''
                }
            }
        })

        const track = container.querySelector('track')
        expect(track?.getAttribute('kind')).toBe('subtitles')
        expect(track?.getAttribute('src')).toBe('subtitles.vtt')
        expect(track?.getAttribute('srclang')).toBe('en')
        expect(track?.getAttribute('label')).toBe('English')
        expect(track?.hasAttribute('default')).toBe(true)
    })
})
