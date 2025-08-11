import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import TableCell from './TableCell.svelte'

describe('TableCell (markdown)', () => {
    it('renders td by default', () => {
        const { container } = render(TableCell, {
            props: { header: false, align: null, children: () => 'x' }
        })
        expect(container.querySelector('td')).toBeTruthy()
    })
    it('renders th when header is true', () => {
        const { container } = render(TableCell, {
            props: { header: true, align: 'left', children: () => 'x' }
        })
        expect(container.querySelector('th')).toBeTruthy()
    })
})
