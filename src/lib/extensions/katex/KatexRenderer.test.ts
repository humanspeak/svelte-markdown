import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import KatexRenderer from './KatexRenderer.svelte'

describe('KatexRenderer', () => {
    it('renders inline math by default (displayMode false)', () => {
        const { container } = render(KatexRenderer, {
            props: { text: 'x^2' }
        })
        const html = container.innerHTML
        expect(html).toContain('katex')
        // displayMode: false produces a `.katex` span without `.katex-display`
        expect(html).not.toContain('katex-display')
    })

    it('renders block math when displayMode is true', () => {
        const { container } = render(KatexRenderer, {
            props: { text: 'x^2', displayMode: true }
        })
        const html = container.innerHTML
        expect(html).toContain('katex')
        expect(html).toContain('katex-display')
    })

    it('renders an AMS environment passed as the full \\begin/\\end string', () => {
        const { container } = render(KatexRenderer, {
            props: {
                text: '\\begin{equation}\nx = 1\n\\end{equation}',
                displayMode: true
            }
        })
        expect(container.innerHTML).toContain('katex')
    })

    it('renders a malformed expression as an error span instead of throwing', () => {
        const { container } = render(KatexRenderer, {
            props: { text: '\\unknownmacro{x}' }
        })
        // With throwOnError: false (hardcoded in the renderer) KaTeX wraps the
        // bad source in its default errorColor (#cc0000) instead of throwing.
        expect(container.innerHTML).toContain('#cc0000')
    })

    it('renders empty input safely', () => {
        const { container } = render(KatexRenderer, {
            props: { text: '' }
        })
        // KaTeX produces a (possibly empty) `.katex` wrapper for empty input
        expect(container.innerHTML).toContain('katex')
    })

    it('renders simple greek letters', () => {
        const { container } = render(KatexRenderer, {
            props: { text: '\\alpha + \\beta' }
        })
        const html = container.innerHTML
        expect(html).toContain('katex')
        // KaTeX maps \alpha and \beta to specific unicode/MathML output —
        // verify *some* MathML/HTML structure surfaced.
        expect(html.length).toBeGreaterThan(20)
    })
})
