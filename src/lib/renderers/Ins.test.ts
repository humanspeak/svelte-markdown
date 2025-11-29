import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Ins from './Ins.svelte'

describe('Ins (markdown)', () => {
    it('renders ins element', () => {
        const { container } = render(Ins)
        const el = container.querySelector('ins')
        expect(el).toBeTruthy()
    })
})
