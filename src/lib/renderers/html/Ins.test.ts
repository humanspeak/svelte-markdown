import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Ins from './Ins.svelte'

describe('Ins Component', () => {
    it('should render insertion element with cite and datetime', () => {
        const { container } = render(Ins, {
            props: {
                attributes: {
                    cite: 'https://example.com/revision',
                    datetime: '2024-01-23T12:00:00Z'
                }
            }
        })
        const ins = container.querySelector('ins')
        expect(ins).toBeTruthy()
        expect(ins?.getAttribute('cite')).toBe('https://example.com/revision')
        expect(ins?.getAttribute('datetime')).toBe('2024-01-23T12:00:00Z')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Ins, {
            props: {
                attributes: {
                    class: 'inserted-text',
                    'data-revision': '1.0'
                }
            }
        })
        const ins = container.querySelector('ins')
        expect(ins?.getAttribute('class')).toBe('inserted-text')
        expect(ins?.getAttribute('data-revision')).toBe('1.0')
    })
})
