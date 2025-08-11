import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Paragraph from './Paragraph.svelte'

describe('Paragraph (markdown)', () => {
    it('renders p element', () => {
        const { container } = render(Paragraph)
        expect(container.querySelector('p')).toBeTruthy()
    })
})
