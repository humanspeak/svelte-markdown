import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Image from './Image.svelte'

describe('Image (markdown)', () => {
    it('renders img with alt and title', () => {
        const { container } = render(Image, { props: { href: '/a.png', title: 't', text: 'alt' } })
        const img = container.querySelector('img')
        expect(img?.getAttribute('src')).toBe('/a.png')
        expect(img?.getAttribute('alt')).toBe('alt')
        expect(img?.getAttribute('title')).toBe('t')
    })
})
