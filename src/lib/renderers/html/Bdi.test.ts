import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Bdi from './Bdi.svelte'

describe('Bdi Component', () => {
    it('should render bdi element', () => {
        const { container } = render(Bdi, {
            props: {
                attributes: {
                    class: 'bidirectional-text'
                }
            }
        })
        const bdi = container.querySelector('bdi')
        expect(bdi).toBeTruthy()
        expect(bdi?.getAttribute('class')).toBe('bidirectional-text')
    })

    it('should handle bidirectional text attributes', () => {
        const { container } = render(Bdi, {
            props: {
                attributes: {
                    dir: 'auto',
                    lang: 'ar',
                    class: 'custom-bdi'
                }
            }
        })
        const bdi = container.querySelector('bdi')
        expect(bdi?.getAttribute('dir')).toBe('auto')
        expect(bdi?.getAttribute('lang')).toBe('ar')
        expect(bdi?.getAttribute('class')).toBe('custom-bdi')
    })
})
