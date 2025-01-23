import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Tr from './Tr.svelte'

describe('Tr Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Tr, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const tr = container.querySelector('tr')
        expect(tr).toBeTruthy()
        expect(tr?.getAttribute('class')).toBe('test-class')
        expect(tr?.getAttribute('id')).toBe('test-id')
    })

    it('should render with table row attributes', () => {
        const { container } = render(Tr, {
            props: {
                attributes: {
                    align: 'center',
                    valign: 'middle',
                    bgcolor: '#f5f5f5'
                }
            }
        })

        const tr = container.querySelector('tr')
        expect(tr?.getAttribute('align')).toBe('center')
        expect(tr?.getAttribute('valign')).toBe('middle')
        expect(tr?.getAttribute('bgcolor')).toBe('#f5f5f5')
    })
})
