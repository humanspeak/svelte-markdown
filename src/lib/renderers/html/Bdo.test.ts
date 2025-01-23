import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Bdo from './Bdo.svelte'

describe('Bdo Component', () => {
    it('should render bdo element with direction', () => {
        const { container } = render(Bdo, {
            props: {
                attributes: {
                    dir: 'rtl'
                }
            }
        })
        const bdo = container.querySelector('bdo')
        expect(bdo).toBeTruthy()
        expect(bdo?.getAttribute('dir')).toBe('rtl')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Bdo, {
            props: {
                attributes: {
                    dir: 'ltr',
                    lang: 'en',
                    class: 'custom-bdo'
                }
            }
        })
        const bdo = container.querySelector('bdo')
        expect(bdo?.getAttribute('dir')).toBe('ltr')
        expect(bdo?.getAttribute('lang')).toBe('en')
        expect(bdo?.getAttribute('class')).toBe('custom-bdo')
    })
})
