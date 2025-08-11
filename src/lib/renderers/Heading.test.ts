import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Heading from './Heading.svelte'

describe('Heading (markdown)', () => {
    it('renders h1 with id', () => {
        const { container } = render(Heading, {
            props: {
                depth: 1,
                raw: '# Title',
                text: 'Title',
                options: { headerIds: true, headerPrefix: '' },
                slug: (s: string) => s.toLowerCase()
            }
        })
        expect(container.querySelector('h1')?.id).toBe('title')
    })

    it('renders h3 when depth is 3', () => {
        const { container } = render(Heading, {
            props: {
                depth: 3,
                raw: '### X',
                text: 'X',
                options: { headerIds: false, headerPrefix: '' },
                slug: (s: string) => s
            }
        })
        expect(container.querySelector('h3')).toBeTruthy()
    })
})
