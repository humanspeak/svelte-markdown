import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import Codespan from './Codespan.svelte'
import SvelteMarkdown from '../SvelteMarkdown.svelte'

describe('Codespan (markdown)', () => {
    it('renders the parsed text from an inline code span', () => {
        const { container } = render(Codespan, { props: { text: 'value' } })
        const code = container.querySelector('code')
        expect(code?.textContent).toBe('value')
    })

    it.each([
        ['`` `a` ``', '`a`'],
        ['``a`b``', 'a`b'],
        ['` x `', 'x']
    ])('renders CommonMark inline code source %s as %s', (source, expected) => {
        const { container } = render(SvelteMarkdown, { props: { source } })
        const code = container.querySelector('code')
        expect(code?.textContent).toBe(expected)
    })
})
