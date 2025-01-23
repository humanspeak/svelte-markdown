import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Blockquote from './Blockquote.svelte'

describe('Blockquote Component', () => {
    it('should render blockquote element with cite', () => {
        const { container } = render(Blockquote, {
            props: {
                attributes: {
                    cite: 'https://example.com/quote'
                }
            }
        })
        const blockquote = container.querySelector('blockquote')
        expect(blockquote).toBeTruthy()
        expect(blockquote?.getAttribute('cite')).toBe('https://example.com/quote')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Blockquote, {
            props: {
                attributes: {
                    class: 'custom-quote',
                    id: 'main-quote',
                    'data-author': 'John Doe'
                }
            }
        })
        const blockquote = container.querySelector('blockquote')
        expect(blockquote?.getAttribute('class')).toBe('custom-quote')
        expect(blockquote?.getAttribute('id')).toBe('main-quote')
        expect(blockquote?.getAttribute('data-author')).toBe('John Doe')
    })
})
