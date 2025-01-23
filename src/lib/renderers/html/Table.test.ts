import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Table from './Table.svelte'

describe('Table Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Table, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const table = container.querySelector('table')
        expect(table).toBeTruthy()
        expect(table?.getAttribute('class')).toBe('test-class')
        expect(table?.getAttribute('id')).toBe('test-id')
    })

    it('should render with table-specific attributes', () => {
        const { container } = render(Table, {
            props: {
                attributes: {
                    border: '1',
                    cellspacing: '0',
                    cellpadding: '5'
                }
            }
        })

        const table = container.querySelector('table')
        expect(table?.getAttribute('border')).toBe('1')
        expect(table?.getAttribute('cellspacing')).toBe('0')
        expect(table?.getAttribute('cellpadding')).toBe('5')
    })
})
