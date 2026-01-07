import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Heading from './Heading.svelte'

const defaultProps = {
    raw: '# Heading',
    text: 'Heading',
    options: { headerIds: true, headerPrefix: '' },
    slug: (s: string) => s.toLowerCase().replace(/\s+/g, '-')
}

describe('Heading (markdown)', () => {
    describe('heading levels', () => {
        it('renders h1 when depth is 1', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 1 }
            })
            expect(container.querySelector('h1')).toBeTruthy()
        })

        it('renders h2 when depth is 2', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 2 }
            })
            expect(container.querySelector('h2')).toBeTruthy()
        })

        it('renders h3 when depth is 3', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 3 }
            })
            expect(container.querySelector('h3')).toBeTruthy()
        })

        it('renders h4 when depth is 4', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 4 }
            })
            expect(container.querySelector('h4')).toBeTruthy()
        })

        it('renders h5 when depth is 5', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 5 }
            })
            expect(container.querySelector('h5')).toBeTruthy()
        })

        it('renders h6 when depth is 6', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 6 }
            })
            expect(container.querySelector('h6')).toBeTruthy()
        })

        it('renders raw text when depth > 6', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 7, raw: '####### Too deep' }
            })
            expect(container.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull()
            expect(container.textContent).toContain('####### Too deep')
        })

        it('renders raw text when depth is 0', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: 0, raw: 'No heading' }
            })
            expect(container.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull()
            expect(container.textContent).toContain('No heading')
        })

        it('renders raw text when depth is negative', () => {
            const { container } = render(Heading, {
                props: { ...defaultProps, depth: -1, raw: 'Invalid depth' }
            })
            expect(container.querySelector('h1,h2,h3,h4,h5,h6')).toBeNull()
            expect(container.textContent).toContain('Invalid depth')
        })
    })

    describe('header IDs', () => {
        it('renders heading with id when headerIds is true', () => {
            const { container } = render(Heading, {
                props: {
                    ...defaultProps,
                    depth: 1,
                    text: 'My Title',
                    options: { headerIds: true, headerPrefix: '' }
                }
            })
            expect(container.querySelector('h1')?.id).toBe('my-title')
        })

        it('renders heading without id when headerIds is false', () => {
            const { container } = render(Heading, {
                props: {
                    ...defaultProps,
                    depth: 1,
                    options: { headerIds: false, headerPrefix: '' }
                }
            })
            expect(container.querySelector('h1')?.hasAttribute('id')).toBe(false)
        })

        it('renders heading with prefixed id', () => {
            const { container } = render(Heading, {
                props: {
                    ...defaultProps,
                    depth: 2,
                    text: 'Section',
                    options: { headerIds: true, headerPrefix: 'user-content-' }
                }
            })
            expect(container.querySelector('h2')?.id).toBe('user-content-section')
        })

        it('handles special characters in text for slug', () => {
            const { container } = render(Heading, {
                props: {
                    ...defaultProps,
                    depth: 1,
                    text: 'Hello World!',
                    options: { headerIds: true, headerPrefix: '' }
                }
            })
            expect(container.querySelector('h1')?.id).toBe('hello-world!')
        })
    })
})
