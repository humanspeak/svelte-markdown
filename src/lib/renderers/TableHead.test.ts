import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import TableHead from './TableHead.svelte'

describe('TableHead (markdown)', () => {
    it('renders thead wrapper', () => {
        const { container } = render(TableHead, { props: { children: () => 'x' } })
        expect(container.querySelector('thead')).toBeTruthy()
    })
})
