import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Pre from './Pre.svelte'

describe('Pre Component', () => {
    it('should render pre element', () => {
        const { container } = render(Pre, {
            props: {
                attributes: {
                    class: 'code-block'
                }
            }
        })
        const pre = container.querySelector('pre')
        expect(pre).toBeTruthy()
        expect(pre?.getAttribute('class')).toBe('code-block')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Pre, {
            props: {
                attributes: {
                    id: 'code-sample',
                    'data-language': 'javascript',
                    'aria-label': 'Code example'
                }
            }
        })
        const pre = container.querySelector('pre')
        expect(pre?.getAttribute('id')).toBe('code-sample')
        expect(pre?.getAttribute('data-language')).toBe('javascript')
        expect(pre?.getAttribute('aria-label')).toBe('Code example')
    })
})
