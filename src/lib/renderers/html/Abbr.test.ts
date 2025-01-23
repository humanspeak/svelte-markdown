import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Abbr from './Abbr.svelte'

describe('Abbr Component', () => {
    it('should render abbreviation with title', () => {
        const { container } = render(Abbr, {
            props: {
                attributes: {
                    title: 'HyperText Markup Language'
                }
            }
        })
        const abbr = container.querySelector('abbr')
        expect(abbr).toBeTruthy()
        expect(abbr?.getAttribute('title')).toBe('HyperText Markup Language')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Abbr, {
            props: {
                attributes: {
                    title: 'World Wide Web',
                    class: 'custom-abbr',
                    lang: 'en'
                }
            }
        })
        const abbr = container.querySelector('abbr')
        expect(abbr?.getAttribute('class')).toBe('custom-abbr')
        expect(abbr?.getAttribute('lang')).toBe('en')
    })
})
