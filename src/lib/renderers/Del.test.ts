import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Del from './Del.svelte'

describe('Del (markdown)', () => {
    it('renders del element', () => {
        const { container } = render(Del)
        const el = container.querySelector('del')
        expect(el).toBeTruthy()
    })
})
