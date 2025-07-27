import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Br from './Br.svelte'

describe('Br Component', () => {
    it('should render br element with class attribute', () => {
        const { container } = render(Br, {
            props: {
                attributes: {
                    class: 'line-break'
                }
            }
        })
        const br = container.querySelector('br')
        expect(br).toBeTruthy()
        expect(br?.getAttribute('class')).toBe('line-break')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Br, {
            props: {
                attributes: {
                    id: 'bold-1',
                    lang: 'en',
                    dir: 'ltr'
                }
            }
        })
        const br = container.querySelector('br')
        expect(br?.getAttribute('id')).toBe('bold-1')
        expect(br?.getAttribute('lang')).toBe('en')
        expect(br?.getAttribute('dir')).toBe('ltr')
    })
})
