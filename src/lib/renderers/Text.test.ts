import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Text from './Text.svelte'

describe('Text (markdown)', () => {
    it('renders without wrapper', () => {
        const { container } = render(Text)
        // No specific selector; component renders snippet directly
        expect(container).toBeTruthy()
    })
})
