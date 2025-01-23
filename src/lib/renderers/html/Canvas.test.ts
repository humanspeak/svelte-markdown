import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Canvas from './Canvas.svelte'

describe('Canvas Component', () => {
    it('should render canvas element with dimensions', () => {
        const { container } = render(Canvas, {
            props: {
                attributes: {
                    width: '800',
                    height: '600'
                }
            }
        })
        const canvas = container.querySelector('canvas')
        expect(canvas).toBeTruthy()
        expect(canvas?.getAttribute('width')).toBe('800')
        expect(canvas?.getAttribute('height')).toBe('600')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Canvas, {
            props: {
                attributes: {
                    class: 'custom-canvas',
                    id: 'game-canvas',
                    'data-context': '2d'
                }
            }
        })
        const canvas = container.querySelector('canvas')
        expect(canvas?.getAttribute('class')).toBe('custom-canvas')
        expect(canvas?.getAttribute('id')).toBe('game-canvas')
        expect(canvas?.getAttribute('data-context')).toBe('2d')
    })
})
