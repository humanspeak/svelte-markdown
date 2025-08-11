import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Table from './Table.svelte'

describe('Table (markdown)', () => {
    it('renders table wrapper', () => {
        const { container } = render(Table, { props: { children: () => 'x' } })
        expect(container.querySelector('table')).toBeTruthy()
    })
})
