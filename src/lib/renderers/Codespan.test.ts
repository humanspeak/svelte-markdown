import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Codespan from './Codespan.svelte'

describe('Codespan (markdown)', () => {
    it('renders inline code from raw without backticks', () => {
        const { container } = render(Codespan, { props: { raw: '`value`' } })
        const code = container.querySelector('code')
        expect(code?.textContent).toBe('value')
    })
})
