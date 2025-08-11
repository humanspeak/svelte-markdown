import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Br from './Br.svelte'

describe('Br (markdown)', () => {
    it('renders a br element', () => {
        const { container } = render(Br)
        const br = container.querySelector('br')
        expect(br).toBeTruthy()
    })
})
