import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Ul from './Ul.svelte'

describe('Ul Component', () => {
    it('should render with basic attributes', () => {
        const { container } = render(Ul, {
            props: {
                attributes: {
                    class: 'test-class',
                    id: 'test-id'
                }
            }
        })

        const ul = container.querySelector('ul')
        expect(ul).toBeTruthy()
        expect(ul?.getAttribute('class')).toBe('test-class')
        expect(ul?.getAttribute('id')).toBe('test-id')
    })

    it('should render with list attributes', () => {
        const { container } = render(Ul, {
            props: {
                attributes: {
                    type: 'disc',
                    style: 'list-style-type: square'
                }
            }
        })

        const ul = container.querySelector('ul')
        expect(ul?.getAttribute('type')).toBe('disc')
        expect(ul?.getAttribute('style')).toBe('list-style-type: square;')
    })
})
