import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import TableRow from './TableRow.svelte'

describe('TableRow (markdown)', () => {
    it('renders tr wrapper', () => {
        const { container } = render(TableRow, { props: { children: () => 'x' } })
        expect(container.querySelector('tr')).toBeTruthy()
    })
})
