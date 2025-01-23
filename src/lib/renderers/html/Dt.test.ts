import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Dt from './Dt.svelte'

describe('Dt Component', () => {
    it('should render term element', () => {
        const { container } = render(Dt, {
            props: {
                attributes: {
                    class: 'term'
                }
            }
        })
        const dt = container.querySelector('dt')
        expect(dt).toBeTruthy()
        expect(dt?.getAttribute('class')).toBe('term')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Dt, {
            props: {
                attributes: {
                    id: 'term-1',
                    lang: 'en',
                    title: 'Definition term'
                }
            }
        })
        const dt = container.querySelector('dt')
        expect(dt?.getAttribute('id')).toBe('term-1')
        expect(dt?.getAttribute('lang')).toBe('en')
        expect(dt?.getAttribute('title')).toBe('Definition term')
    })
})
