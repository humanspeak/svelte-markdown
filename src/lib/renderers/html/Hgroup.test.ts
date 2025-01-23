import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Hgroup from './Hgroup.svelte'

describe('Hgroup Component', () => {
    it('should render hgroup element', () => {
        const { container } = render(Hgroup, {
            props: {
                attributes: {
                    class: 'heading-group'
                }
            }
        })
        const hgroup = container.querySelector('hgroup')
        expect(hgroup).toBeTruthy()
        expect(hgroup?.getAttribute('class')).toBe('heading-group')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Hgroup, {
            props: {
                attributes: {
                    id: 'title-group',
                    'aria-labelledby': 'main-title',
                    role: 'group'
                }
            }
        })
        const hgroup = container.querySelector('hgroup')
        expect(hgroup?.getAttribute('id')).toBe('title-group')
        expect(hgroup?.getAttribute('aria-labelledby')).toBe('main-title')
        expect(hgroup?.getAttribute('role')).toBe('group')
    })
})
