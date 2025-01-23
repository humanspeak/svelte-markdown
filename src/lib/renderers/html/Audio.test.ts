import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Audio from './Audio.svelte'

describe('Audio Component', () => {
    it('should render audio element with source', () => {
        const { container } = render(Audio, {
            props: {
                attributes: {
                    src: 'audio.mp3',
                    controls: ''
                }
            }
        })
        const audio = container.querySelector('audio')
        expect(audio).toBeTruthy()
        expect(audio?.getAttribute('src')).toBe('audio.mp3')
        expect(audio?.hasAttribute('controls')).toBe(true)
    })

    it('should handle additional attributes', () => {
        const { container } = render(Audio, {
            props: {
                attributes: {
                    src: 'audio.mp3',
                    autoplay: '',
                    loop: '',
                    muted: '',
                    preload: 'auto',
                    class: 'custom-audio'
                }
            }
        })
        const audio = container.querySelector('audio')
        expect(audio?.hasAttribute('autoplay')).toBe(true)
        expect(audio?.hasAttribute('loop')).toBe(true)
        expect(audio?.hasAttribute('muted')).toBe(true)
        expect(audio?.getAttribute('preload')).toBe('auto')
        expect(audio?.getAttribute('class')).toBe('custom-audio')
    })
})
