import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Del from './Del.svelte'

describe('Del Component', () => {
    it('should render deletion element with cite and datetime', () => {
        const { container } = render(Del, {
            props: {
                attributes: {
                    cite: 'https://example.com/revision',
                    datetime: '2024-01-23T12:00:00Z'
                }
            }
        })
        const del = container.querySelector('del')
        expect(del).toBeTruthy()
        expect(del?.getAttribute('cite')).toBe('https://example.com/revision')
        expect(del?.getAttribute('datetime')).toBe('2024-01-23T12:00:00Z')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Del, {
            props: {
                attributes: {
                    class: 'deleted-text',
                    'data-revision': '1.0'
                }
            }
        })
        const del = container.querySelector('del')
        expect(del?.getAttribute('class')).toBe('deleted-text')
        expect(del?.getAttribute('data-revision')).toBe('1.0')
    })
})
