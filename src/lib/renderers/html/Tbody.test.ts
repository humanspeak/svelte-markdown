import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Tbody from './Tbody.svelte'

describe('Tbody Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Tbody, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const tbody = container.querySelector('tbody')
        expect(tbody).toBeTruthy()
        expect(tbody?.getAttribute('class')).toBe('test-class')
        expect(tbody?.getAttribute('id')).toBe('test-id')
    })

    it('should render with table-specific attributes', () => {
        const { container } = render(Tbody, {
            props: {
                attributes: {
                    align: 'center',
                    valign: 'middle'
                }
            }
        })

        const tbody = container.querySelector('tbody')
        expect(tbody?.getAttribute('align')).toBe('center')
        expect(tbody?.getAttribute('valign')).toBe('middle')
    })
})
