import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Cite from './Cite.svelte'

describe('Cite Component', () => {
    it('should render cite element', () => {
        const { container } = render(Cite, {
            props: {
                attributes: {
                    class: 'citation'
                }
            }
        })
        const cite = container.querySelector('cite')
        expect(cite).toBeTruthy()
        expect(cite?.getAttribute('class')).toBe('citation')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Cite, {
            props: {
                attributes: {
                    id: 'main-citation',
                    lang: 'en',
                    title: 'Source Title'
                }
            }
        })
        const cite = container.querySelector('cite')
        expect(cite?.getAttribute('id')).toBe('main-citation')
        expect(cite?.getAttribute('lang')).toBe('en')
        expect(cite?.getAttribute('title')).toBe('Source Title')
    })
})
