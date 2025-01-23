import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Th from './Th.svelte'

describe('Th Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Th, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const th = container.querySelector('th')
        expect(th).toBeTruthy()
        expect(th?.getAttribute('class')).toBe('test-class')
        expect(th?.getAttribute('id')).toBe('test-id')
    })

    it('should render with table header attributes', () => {
        const { container } = render(Th, {
            props: {
                attributes: {
                    scope: 'col',
                    colspan: '2',
                    rowspan: '1',
                    align: 'left'
                }
            }
        })

        const th = container.querySelector('th')
        expect(th?.getAttribute('scope')).toBe('col')
        expect(th?.getAttribute('colspan')).toBe('2')
        expect(th?.getAttribute('rowspan')).toBe('1')
        expect(th?.getAttribute('align')).toBe('left')
    })
})
