import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Li from './Li.svelte'

describe('Li Component', () => {
    it('should render list item element', () => {
        const { container } = render(Li, {
            props: {
                attributes: {
                    class: 'list-item'
                }
            }
        })
        const li = container.querySelector('li')
        expect(li).toBeTruthy()
        expect(li?.getAttribute('class')).toBe('list-item')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Li, {
            props: {
                attributes: {
                    value: '3',
                    id: 'item-3',
                    'data-index': '2',
                    'aria-label': 'List item 3'
                }
            }
        })
        const li = container.querySelector('li')
        expect(li?.getAttribute('value')).toBe('3')
        expect(li?.getAttribute('id')).toBe('item-3')
        expect(li?.getAttribute('data-index')).toBe('2')
        expect(li?.getAttribute('aria-label')).toBe('List item 3')
    })
})
