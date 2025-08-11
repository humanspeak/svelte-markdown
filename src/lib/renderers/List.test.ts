import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import List from './List.svelte'

describe('List (markdown)', () => {
    it('renders ul by default', () => {
        const { container } = render(List, { props: { children: () => 'x' } })
        expect(container.querySelector('ul')).toBeTruthy()
    })

    it('renders ol when ordered', () => {
        const { container } = render(List, { props: { ordered: true, children: () => 'x' } })
        expect(container.querySelector('ol')).toBeTruthy()
    })
})
