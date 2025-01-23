import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Dd from './Dd.svelte'

describe('Dd Component', () => {
    it('should render description element', () => {
        const { container } = render(Dd, {
            props: {
                attributes: {
                    class: 'description'
                }
            }
        })
        const dd = container.querySelector('dd')
        expect(dd).toBeTruthy()
        expect(dd?.getAttribute('class')).toBe('description')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Dd, {
            props: {
                attributes: {
                    id: 'term-description',
                    lang: 'en'
                }
            }
        })
        const dd = container.querySelector('dd')
        expect(dd?.getAttribute('id')).toBe('term-description')
        expect(dd?.getAttribute('lang')).toBe('en')
    })
})
