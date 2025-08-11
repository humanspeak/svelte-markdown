import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Blockquote from './Blockquote.svelte'

describe('Blockquote (markdown)', () => {
    it('renders blockquote element', () => {
        const { container } = render(Blockquote)
        const el = container.querySelector('blockquote')
        expect(el).toBeTruthy()
    })
})
