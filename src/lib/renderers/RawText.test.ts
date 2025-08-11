import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import RawText from './RawText.svelte'

describe('RawText (markdown)', () => {
    it('renders provided text', () => {
        const { container } = render(RawText, { props: { text: 'hello' } })
        expect(container.textContent).toBe('hello')
    })
})
