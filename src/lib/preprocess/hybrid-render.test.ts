import { fireEvent, render, screen } from '@testing-library/svelte'
import { Lexer } from 'marked'
import { describe, expect, it, vi } from 'vitest'
import Proof from '../../routes/test/preprocess/hybrid/+page.mdproof'
import Harness from '../test/preprocess/HybridHarness.svelte'

// Generated tokens are imported before these spies: compilation is allowed to
// lex. Mounting, prop updates, and interactions must not tokenize markdown.
describe('preparsed document runtime proof', () => {
    it('changes layout renderer overrides without rebuilding or reparsing the document', async () => {
        const block = vi.spyOn(Lexer.prototype, 'lex')
        const inline = vi.spyOn(Lexer.prototype, 'inlineTokens')
        try {
            render(Harness)
            expect(screen.getAllByTestId('custom-heading')).toHaveLength(2)
            expect(screen.getAllByTestId('custom-link')).toHaveLength(2)
            await fireEvent.click(screen.getByTestId('toggle-renderer'))
            expect(screen.queryByTestId('custom-heading')).not.toBeInTheDocument()
            expect(
                screen.getByRole('heading', { name: 'Build-time markdown, runtime renderers' })
            ).toBeInTheDocument()
            expect(screen.getAllByTestId('custom-link')).toHaveLength(2)
            await fireEvent.click(screen.getByTestId('typed-counter'))
            expect(screen.getByTestId('typed-counter')).toHaveTextContent('Count: 7')
            expect(block).not.toHaveBeenCalled()
            expect(inline).not.toHaveBeenCalled()
        } finally {
            block.mockRestore()
            inline.mockRestore()
        }
    })

    it('renders and reacts without invoking the markdown lexer', async () => {
        const block = vi.spyOn(Lexer.prototype, 'lex')
        const inline = vi.spyOn(Lexer.prototype, 'inlineTokens')
        try {
            const { rerender } = render(Proof, { data: { greeting: 'Initial load', start: 6 } })
            expect(screen.getByTestId('load-greeting')).toHaveTextContent('Initial load')
            expect(screen.getByText('Initial load', { selector: 'strong' })).toBeInTheDocument()
            expect(screen.getByTestId('typed-counter')).toHaveAttribute('data-start-type', 'number')
            expect(screen.getByTestId('typed-counter')).toHaveAttribute(
                'data-details-type',
                'object'
            )
            expect(screen.getByTestId('typed-counter')).toHaveTextContent('Count: 6 / typed object')
            await fireEvent.click(screen.getByTestId('typed-counter'))
            expect(screen.getByTestId('typed-counter')).toHaveTextContent('Count: 7')
            expect(screen.getByTestId('parent-changes')).toHaveTextContent('Parent updates: 1')
            expect(screen.getByTestId('conditional')).toBeInTheDocument()
            await rerender({ data: { greeting: 'Updated load', start: 10 } })
            expect(screen.getByTestId('load-greeting')).toHaveTextContent('Updated load')
            expect(screen.getByText('Updated load', { selector: 'strong' })).toBeInTheDocument()
            expect(screen.getByTestId('typed-counter')).toHaveTextContent('Count: 11')
            expect(screen.getAllByRole('link', { name: 'reference link' })).toHaveLength(2)
            expect(block).not.toHaveBeenCalled()
            expect(inline).not.toHaveBeenCalled()
        } finally {
            block.mockRestore()
            inline.mockRestore()
        }
    })
})
