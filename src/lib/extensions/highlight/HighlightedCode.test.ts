/**
 * Engine-agnostic renderer coverage. The engine-specific suites
 * (`shiki/ShikiCode.test.ts`, `tanstack-highlight/*.test.ts`) prove real
 * output; this file pins the resolution order, the memoization contract, and
 * the interchangeability of the shared context key / singleton using a stub
 * highlighter so it runs without either optional peer.
 */

import '@testing-library/jest-dom'
import { render } from '@testing-library/svelte'
import { afterEach, describe, expect, test, vi } from 'vitest'
import ContextHost from '../../test/HighlightContextHost.svelte'
import type { CodeHighlighter } from './codeHighlighter.js'
import { getCodeHighlighter, setCodeHighlighter } from './highlightContext.js'
import { HIGHLIGHT_CONTEXT_KEY, HighlightedCode } from './index.js'

const stub = (label: string): CodeHighlighter & { calls: string[] } => {
    const calls: string[] = []
    return {
        calls,
        hasLang: () => true,
        highlight(code, lang) {
            calls.push(code)
            return `<pre class="stub" data-engine="${label}" data-lang="${lang}"><code>${code}</code></pre>`
        }
    }
}

afterEach(() => {
    setCodeHighlighter(undefined)
})

describe('HighlightedCode resolution order', () => {
    test('uses the explicit prop over context and singleton', () => {
        setCodeHighlighter(stub('singleton'))
        const { container } = render(ContextHost, {
            props: {
                contextHighlighter: stub('context'),
                propHighlighter: stub('prop'),
                lang: 'ts',
                text: 'x'
            }
        })
        expect(container.querySelector('pre')?.dataset.engine).toBe('prop')
    })

    test('uses context over the singleton', () => {
        setCodeHighlighter(stub('singleton'))
        const { container } = render(ContextHost, {
            props: { contextHighlighter: stub('context'), lang: 'ts', text: 'x' }
        })
        expect(container.querySelector('pre')?.dataset.engine).toBe('context')
    })

    test('falls back to the singleton', () => {
        setCodeHighlighter(stub('singleton'))
        const { container } = render(HighlightedCode, { props: { lang: 'ts', text: 'x' } })
        expect(container.querySelector('pre')?.dataset.engine).toBe('singleton')
    })

    test('renders the escaped shared fallback when nothing is configured', () => {
        const { container } = render(HighlightedCode, {
            props: { lang: 'ts', text: '<script>alert(1)</script>' }
        })
        expect(container.innerHTML).toContain('highlight-fallback')
        expect(container.querySelector('script')).toBeNull()
        expect(container.innerHTML).toContain('&lt;script&gt;')
    })
})

// Memoization across streaming token churn is proven per engine in
// `shiki/ShikiCode.test.ts` and `tanstack-highlight/HighlightedCode.tanstack.test.ts`
// (an unchanged fence is never re-highlighted as prose appends after it).

describe('shared context key and singleton', () => {
    test('the context key is a global-registry symbol so engine subpaths share it', () => {
        expect(HIGHLIGHT_CONTEXT_KEY).toBe(Symbol.for('svelte-markdown:code-highlighter'))
    })

    test('the singleton round-trips and clears', () => {
        const highlighter = stub('singleton')
        setCodeHighlighter(highlighter)
        expect(getCodeHighlighter()).toBe(highlighter)
        setCodeHighlighter(undefined)
        expect(getCodeHighlighter()).toBeUndefined()
    })

    test('a highlighter that throws is not swallowed by the renderer (factories own that)', () => {
        const throwing: CodeHighlighter = {
            hasLang: () => true,
            highlight: () => {
                throw new Error('engine exploded')
            }
        }
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(() =>
            render(HighlightedCode, { props: { lang: 'ts', text: 'x', highlighter: throwing } })
        ).toThrow('engine exploded')
        spy.mockRestore()
    })
})
