import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Iframe from './Iframe.svelte'

describe('Iframe Component', () => {
    it('should render iframe element with source', () => {
        const { container } = render(Iframe, {
            props: {
                attributes: {
                    src: 'https://example.com/embed',
                    title: 'Embedded content'
                }
            }
        })
        const iframe = container.querySelector('iframe')
        expect(iframe).toBeTruthy()
        expect(iframe?.getAttribute('src')).toBe('https://example.com/embed')
        expect(iframe?.getAttribute('title')).toBe('Embedded content')
    })

    it('should handle security and additional attributes', () => {
        const { container } = render(Iframe, {
            props: {
                attributes: {
                    sandbox: 'allow-scripts',
                    loading: 'lazy',
                    width: '640',
                    height: '480',
                    class: 'embedded-frame'
                }
            }
        })
        const iframe = container.querySelector('iframe')
        expect(iframe?.getAttribute('sandbox')).toBe('allow-scripts')
        expect(iframe?.getAttribute('loading')).toBe('lazy')
        expect(iframe?.getAttribute('width')).toBe('640')
        expect(iframe?.getAttribute('height')).toBe('480')
        expect(iframe?.getAttribute('class')).toBe('embedded-frame')
    })
})
