import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Kbd from './Kbd.svelte'

describe('Kbd Component', () => {
    it('should render kbd element', () => {
        const { container } = render(Kbd, {
            props: {
                attributes: {
                    class: 'keyboard-input'
                }
            }
        })
        const kbd = container.querySelector('kbd')
        expect(kbd).toBeTruthy()
        expect(kbd?.getAttribute('class')).toBe('keyboard-input')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Kbd, {
            props: {
                attributes: {
                    id: 'shortcut',
                    'aria-label': 'Keyboard shortcut',
                    title: 'Press Ctrl + C to copy'
                }
            }
        })
        const kbd = container.querySelector('kbd')
        expect(kbd?.getAttribute('id')).toBe('shortcut')
        expect(kbd?.getAttribute('aria-label')).toBe('Keyboard shortcut')
        expect(kbd?.getAttribute('title')).toBe('Press Ctrl + C to copy')
    })
})
