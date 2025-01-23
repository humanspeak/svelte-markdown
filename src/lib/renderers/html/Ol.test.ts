import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Ol from './Ol.svelte'

describe('Ol Component', () => {
    it('should render ol element', () => {
        const { container } = render(Ol, {
            props: {
                attributes: {
                    class: 'ordered-list'
                }
            }
        })
        const ol = container.querySelector('ol')
        expect(ol).toBeTruthy()
        expect(ol?.getAttribute('class')).toBe('ordered-list')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Ol, {
            props: {
                attributes: {
                    start: '5',
                    reversed: '',
                    type: 'a',
                    id: 'steps-list',
                    'aria-label': 'Steps to follow'
                }
            }
        })
        const ol = container.querySelector('ol')
        expect(ol?.getAttribute('start')).toBe('5')
        expect(ol?.hasAttribute('reversed')).toBe(true)
        expect(ol?.getAttribute('type')).toBe('a')
        expect(ol?.getAttribute('id')).toBe('steps-list')
        expect(ol?.getAttribute('aria-label')).toBe('Steps to follow')
    })
})
