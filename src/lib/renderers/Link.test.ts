import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Link from './Link.svelte'

describe('Link (markdown)', () => {
    it('renders anchor with href', () => {
        const { container } = render(Link, { props: { href: 'https://ex.com' } })
        const a = container.querySelector('a')
        expect(a?.getAttribute('href')).toBe('https://ex.com')
    })
})
