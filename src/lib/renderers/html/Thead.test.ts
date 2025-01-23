import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Thead from './Thead.svelte'

describe('Thead Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Thead, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const thead = container.querySelector('thead')
        expect(thead).toBeTruthy()
        expect(thead?.getAttribute('class')).toBe('test-class')
        expect(thead?.getAttribute('id')).toBe('test-id')
    })

    it('should render with table-specific attributes', () => {
        const { container } = render(Thead, {
            props: {
                attributes: {
                    align: 'center',
                    valign: 'top'
                }
            }
        })

        const thead = container.querySelector('thead')
        expect(thead?.getAttribute('align')).toBe('center')
        expect(thead?.getAttribute('valign')).toBe('top')
    })
})
