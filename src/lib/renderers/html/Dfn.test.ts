import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Dfn from './Dfn.svelte'

describe('Dfn Component', () => {
    it('should render definition element', () => {
        const { container } = render(Dfn, {
            props: {
                attributes: {
                    title: 'Term Definition'
                }
            }
        })
        const dfn = container.querySelector('dfn')
        expect(dfn).toBeTruthy()
        expect(dfn?.getAttribute('title')).toBe('Term Definition')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Dfn, {
            props: {
                attributes: {
                    class: 'term',
                    id: 'main-term',
                    lang: 'en'
                }
            }
        })
        const dfn = container.querySelector('dfn')
        expect(dfn?.getAttribute('class')).toBe('term')
        expect(dfn?.getAttribute('id')).toBe('main-term')
        expect(dfn?.getAttribute('lang')).toBe('en')
    })
})
