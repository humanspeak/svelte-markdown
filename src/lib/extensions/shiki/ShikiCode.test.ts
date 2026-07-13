/**
 * SPIKE — component, streaming-compatibility, and memoization coverage for the
 * Shiki `code` renderer.
 *
 * The load-bearing assertions here are:
 *   1. streaming compatibility — mounting `<SvelteMarkdown streaming>` with the
 *      shiki renderer emits NO async-extension console warning and produces DOM
 *      identical to the non-streaming render (the renderer is synchronous, so
 *      `hasAsyncExtension` never trips), and
 *   2. memoization survives token churn — an unchanged code block is NOT
 *      re-highlighted when prose appends after it during streaming.
 *
 * Streaming harness modeled on `SvelteMarkdown.streaming-html.test.ts`.
 */

import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import js from 'shiki/langs/javascript.mjs'
import ts from 'shiki/langs/typescript.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'
import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest'
import SvelteMarkdown from '../../SvelteMarkdown.svelte'
import { tokenCache } from '../../utils/token-cache.js'
import { createShikiHighlighter, type ShikiHighlighter } from './createShikiHighlighter.js'
import ShikiCode from './ShikiCode.svelte'
import { setShikiHighlighter } from './shikiContext.js'

/** A highlighter whose `highlight` is spied so tests can count invocations. */
let highlightSpy: Mock<(code: string, lang: string) => string>
let highlighter: ShikiHighlighter

beforeEach(() => {
    tokenCache.clearAllTokens()
    const real = createShikiHighlighter({ langs: [js, ts], themes: [githubDark] })
    highlightSpy = vi.fn((code: string, lang: string) => real.highlight(code, lang))
    highlighter = { highlight: highlightSpy, hasLang: (lang: string) => real.hasLang(lang) }
    setShikiHighlighter(highlighter)

    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
    setShikiHighlighter(undefined)
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

const flushStreamingBatch = async () => {
    await act(async () => {
        await vi.advanceTimersByTimeAsync(50)
    })
}

const normalizeHtml = (html: string): string =>
    html
        .replace(/<!--[^>]*-->/g, '')
        .replace(/ id="[^"]*"/g, '')
        .replace(/>\s+</g, '><')
        .replace(/\s+/g, ' ')
        .trim()

const CODE_DOC = `# Heading

\`\`\`javascript
const answer = 42
function greet(name) {
    return \`hello \${name}\`
}
\`\`\`

Trailing prose paragraph.`

const renderStatic = async (source: string) => {
    const harness = render(SvelteMarkdown, {
        props: { source, renderers: { code: ShikiCode } }
    })
    await act(async () => {
        await vi.advanceTimersByTimeAsync(20)
    })
    return harness.container
}

const renderStreamedChunks = async (chunks: string[]) => {
    const harness = render(SvelteMarkdown, {
        props: { source: '', streaming: true, renderers: { code: ShikiCode } }
    })
    for (const chunk of chunks) {
        await act(() => harness.component.writeChunk(chunk))
        await flushStreamingBatch()
    }
    return harness.container
}

describe('ShikiCode component', () => {
    test('renders highlighted output for a registered language', () => {
        const { container } = render(ShikiCode, {
            props: { lang: 'javascript', text: 'const x = 1', highlighter }
        })
        expect(container.innerHTML).toContain('shiki')
        expect(container.querySelector('span')).not.toBeNull()
        expect(highlightSpy).toHaveBeenCalledWith('const x = 1', 'javascript')
    })

    test('falls back to escaped text for an unregistered language without throwing', () => {
        const { container } = render(ShikiCode, {
            props: { lang: 'nope', text: 'a < b', highlighter }
        })
        expect(container.innerHTML).toContain('shiki-fallback')
        expect(container.innerHTML).toContain('a &lt; b')
    })

    test('degrades to an escaped <pre> when no highlighter is available', () => {
        // No prop, no context, and the singleton is cleared in afterEach — but
        // clear it here too to be explicit about the "unconfigured" path.
        setShikiHighlighter(undefined)
        const { container } = render(ShikiCode, {
            props: { lang: 'javascript', text: 'a < b & c' }
        })
        expect(container.innerHTML).toContain('shiki-fallback')
        expect(container.innerHTML).toContain('a &lt; b &amp; c')
        expect(container.querySelector('span')).toBeNull()
    })

    test('never mounts a <script> element from code content', () => {
        const { container } = render(ShikiCode, {
            props: { lang: 'javascript', text: '<script>alert(1)</script>', highlighter }
        })
        expect(container.querySelector('script')).toBeNull()
    })
})

describe('ShikiCode streaming compatibility', () => {
    test('emits no async-extension warning and matches non-streaming DOM', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const chunks = CODE_DOC.match(/\S+\s*/g) ?? []
        const streamed = await renderStreamedChunks(chunks)
        const staticContainer = await renderStatic(CODE_DOC)

        // The synchronous renderer must NOT trip the async-extension guard.
        const asyncWarnings = warnSpy.mock.calls
            .map((c) => String(c[0]))
            .filter((m) => m.includes('async extension'))
        expect(asyncWarnings).toEqual([])

        // Streaming DOM must equal the single-shot render.
        expect(normalizeHtml(streamed.innerHTML)).toBe(normalizeHtml(staticContainer.innerHTML))
        // And it must actually be highlighted, not plain <pre>.
        expect(streamed.innerHTML).toContain('shiki')

        warnSpy.mockRestore()
    })

    test('does NOT re-highlight an unchanged code block as later prose streams in', async () => {
        // Stream the complete code fence first...
        const codePortion = `\`\`\`javascript
const answer = 42
function greet(name) {
    return name
}
\`\`\`
`
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, renderers: { code: ShikiCode } }
        })
        await act(() => harness.component.writeChunk(codePortion))
        await flushStreamingBatch()

        // The block is now complete and highlighted.
        expect(harness.container.innerHTML).toContain('shiki')
        const finalCode = 'const answer = 42\nfunction greet(name) {\n    return name\n}'
        expect(highlightSpy.mock.calls.some((c) => c[0] === finalCode)).toBe(true)

        // From here on, only prose appends — the code block text is unchanged.
        highlightSpy.mockClear()
        const proseChunks = ['Some ', 'trailing ', 'prose ', 'that ', 'keeps ', 'coming.']
        for (const chunk of proseChunks) {
            await act(() => harness.component.writeChunk(chunk))
            await flushStreamingBatch()
        }

        // The unchanged code block must NOT be re-highlighted on any prose append.
        const rehighlights = highlightSpy.mock.calls.filter((c) => c[0] === finalCode)
        expect(rehighlights).toEqual([])
    })
})
