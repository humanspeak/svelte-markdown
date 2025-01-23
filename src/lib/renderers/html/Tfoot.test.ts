import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Tfoot from './Tfoot.svelte'

describe('Tfoot Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Tfoot, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const tfoot = container.querySelector('tfoot')
        expect(tfoot).toBeTruthy()
        expect(tfoot?.getAttribute('class')).toBe('test-class')
        expect(tfoot?.getAttribute('id')).toBe('test-id')
    })

    it('should render with table-specific attributes', () => {
        const { container } = render(Tfoot, {
            props: {
                attributes: {
                    align: 'center',
                    valign: 'bottom'
                }
            }
        })

        const tfoot = container.querySelector('tfoot')
        expect(tfoot?.getAttribute('align')).toBe('center')
        expect(tfoot?.getAttribute('valign')).toBe('bottom')
    })
})
