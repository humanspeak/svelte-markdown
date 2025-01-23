import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import B from './B.svelte'

describe('B Component', () => {
    it('should render bold element', () => {
        const { container } = render(B, {
            props: {
                attributes: {
                    class: 'bold-text'
                }
            }
        })
        const b = container.querySelector('b')
        expect(b).toBeTruthy()
        expect(b?.getAttribute('class')).toBe('bold-text')
    })

    it('should handle additional attributes', () => {
        const { container } = render(B, {
            props: {
                attributes: {
                    id: 'bold-1',
                    lang: 'en',
                    dir: 'ltr'
                }
            }
        })
        const b = container.querySelector('b')
        expect(b?.getAttribute('id')).toBe('bold-1')
        expect(b?.getAttribute('lang')).toBe('en')
        expect(b?.getAttribute('dir')).toBe('ltr')
    })
})
