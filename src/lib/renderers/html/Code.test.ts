import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Code from './Code.svelte'

describe('Code Component', () => {
    it('should render code element', () => {
        const { container } = render(Code, {
            props: {
                attributes: {
                    class: 'code-block'
                }
            }
        })
        const code = container.querySelector('code')
        expect(code).toBeTruthy()
        expect(code?.getAttribute('class')).toBe('code-block')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Code, {
            props: {
                attributes: {
                    'data-language': 'javascript',
                    class: 'syntax-highlighted',
                    id: 'main-code'
                }
            }
        })
        const code = container.querySelector('code')
        expect(code?.getAttribute('data-language')).toBe('javascript')
        expect(code?.getAttribute('class')).toBe('syntax-highlighted')
        expect(code?.getAttribute('id')).toBe('main-code')
    })
})
