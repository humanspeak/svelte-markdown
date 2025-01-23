import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import S from './S.svelte'

describe('S Component', () => {
    it('should render strikethrough element', () => {
        const { container } = render(S, {
            props: {
                attributes: {
                    class: 'strikethrough'
                }
            }
        })
        const s = container.querySelector('s')
        expect(s).toBeTruthy()
        expect(s?.getAttribute('class')).toBe('strikethrough')
    })

    it('should handle additional attributes', () => {
        const { container } = render(S, {
            props: {
                attributes: {
                    id: 'deleted-text',
                    'data-reason': 'outdated',
                    'aria-label': 'Outdated text'
                }
            }
        })
        const s = container.querySelector('s')
        expect(s?.getAttribute('id')).toBe('deleted-text')
        expect(s?.getAttribute('data-reason')).toBe('outdated')
        expect(s?.getAttribute('aria-label')).toBe('Outdated text')
    })
})
