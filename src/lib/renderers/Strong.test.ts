import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Strong from './Strong.svelte'

describe('Strong (markdown)', () => {
    it('renders strong element', () => {
        const { container } = render(Strong)
        expect(container.querySelector('strong')).toBeTruthy()
    })
})
