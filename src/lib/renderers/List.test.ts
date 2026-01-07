import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import List from './List.svelte'

describe('List (markdown)', () => {
    describe('unordered lists', () => {
        it('renders ul by default', () => {
            const { container } = render(List)
            expect(container.querySelector('ul')).toBeTruthy()
            expect(container.querySelector('ol')).toBeNull()
        })

        it('renders ul when ordered is false', () => {
            const { container } = render(List, { props: { ordered: false } })
            expect(container.querySelector('ul')).toBeTruthy()
        })

        it('does not have start attribute on ul', () => {
            const { container } = render(List, { props: { ordered: false, start: 5 } })
            const ul = container.querySelector('ul')
            expect(ul?.hasAttribute('start')).toBe(false)
        })
    })

    describe('ordered lists', () => {
        it('renders ol when ordered', () => {
            const { container } = render(List, { props: { ordered: true } })
            expect(container.querySelector('ol')).toBeTruthy()
            expect(container.querySelector('ul')).toBeNull()
        })

        it('renders ol with default start of 1', () => {
            const { container } = render(List, { props: { ordered: true } })
            const ol = container.querySelector('ol')
            expect(ol?.getAttribute('start')).toBe('1')
        })

        it('renders ol with custom start value', () => {
            const { container } = render(List, { props: { ordered: true, start: 5 } })
            const ol = container.querySelector('ol')
            expect(ol?.getAttribute('start')).toBe('5')
        })

        it('renders ol with start value of 0', () => {
            const { container } = render(List, { props: { ordered: true, start: 0 } })
            const ol = container.querySelector('ol')
            expect(ol?.getAttribute('start')).toBe('0')
        })

        it('handles negative start values', () => {
            const { container } = render(List, { props: { ordered: true, start: -3 } })
            const ol = container.querySelector('ol')
            expect(ol?.getAttribute('start')).toBe('-3')
        })
    })
})
