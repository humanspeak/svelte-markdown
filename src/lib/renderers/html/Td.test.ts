import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Td from './Td.svelte'

describe('Td Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Td, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const td = container.querySelector('td')
        expect(td).toBeTruthy()
        expect(td?.getAttribute('class')).toBe('test-class')
        expect(td?.getAttribute('id')).toBe('test-id')
    })

    it('should render with table cell attributes', () => {
        const { container } = render(Td, {
            props: {
                attributes: {
                    colspan: '2',
                    rowspan: '3',
                    align: 'center',
                    valign: 'middle'
                }
            }
        })

        const td = container.querySelector('td')
        expect(td?.getAttribute('colspan')).toBe('2')
        expect(td?.getAttribute('rowspan')).toBe('3')
        expect(td?.getAttribute('align')).toBe('center')
        expect(td?.getAttribute('valign')).toBe('middle')
    })
})
