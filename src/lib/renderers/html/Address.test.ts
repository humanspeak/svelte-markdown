import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Address from './Address.svelte'

describe('Address Component', () => {
    it('should render address element', () => {
        const { container } = render(Address, {
            props: {
                attributes: {
                    class: 'contact-info'
                }
            }
        })
        const address = container.querySelector('address')
        expect(address).toBeTruthy()
        expect(address?.getAttribute('class')).toBe('contact-info')
    })

    it('should handle additional attributes', () => {
        const { container } = render(Address, {
            props: {
                attributes: {
                    id: 'main-address',
                    lang: 'en',
                    dir: 'ltr'
                }
            }
        })
        const address = container.querySelector('address')
        expect(address?.getAttribute('id')).toBe('main-address')
        expect(address?.getAttribute('lang')).toBe('en')
        expect(address?.getAttribute('dir')).toBe('ltr')
    })
})
