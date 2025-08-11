import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import TableBody from './TableBody.svelte'

describe('TableBody (markdown)', () => {
    it('renders tbody wrapper', () => {
        const { container } = render(TableBody, { props: { children: () => 'x' } })
        expect(container.querySelector('tbody')).toBeTruthy()
    })
})
