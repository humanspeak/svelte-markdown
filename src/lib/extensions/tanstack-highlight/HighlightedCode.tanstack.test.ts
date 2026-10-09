/**
 * Streaming-compatibility and interchangeability coverage for the TanStack
 * engine driving the shared `HighlightedCode` renderer.
 *
 * Load-bearing assertions:
 *   1. mounting `<SvelteMarkdown streaming>` with the renderer emits NO
 *      async-extension warning and produces DOM identical to the non-streaming
 *      render (the engine is synchronous, so `hasAsyncExtension` never trips),
 *   2. an unchanged code block is NOT re-highlighted as prose appends after it,
 *   3. the legacy `ShikiCode` / `setShikiHighlighter` names accept a TanStack
 *      highlighter — one renderer, one context key, any engine.
 */

import { ts } from '@tanstack/highlight/languages/ts'
import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import { afterEach, beforeEach, describe, expect, type Mock, test, vi } from 'vitest'
import SvelteMarkdown from '../../SvelteMarkdown.svelte'
import { tokenCache } from '../../utils/token-cache.js'
import type { CodeHighlighter } from '../highlight/codeHighlighter.js'
import { setShikiHighlighter, ShikiCode } from '../shiki/index.js'
import { createTanstackHighlighter, HighlightedCode, setCodeHighlighter } from './index.js'

let highlightSpy: Mock<(code: string, lang: string) => string>
let highlighter: CodeHighlighter

beforeEach(() => {
    tokenCache.clearAllTokens()
    const real = createTanstackHighlighter({ languages: [ts] })
    highlightSpy = vi.fn((code: string, lang: string) => real.highlight(code, lang))
    highlighter = { highlight: highlightSpy, hasLang: (lang: string) => real.hasLang(lang) }
    setCodeHighlighter(highlighter)

    vi.useFakeTimers()
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
        return setTimeout(() => cb(performance.now()), 16) as unknown as number
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
})

afterEach(() => {
    setCodeHighlighter(undefined)
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

\`\`\`ts
const answer: number = 42
function greet(name: string) {
    return \`hello \${name}\`
}
\`\`\`

Trailing prose paragraph.`

const renderStatic = async (source: string) => {
    const harness = render(SvelteMarkdown, {
        props: { source, renderers: { code: HighlightedCode } }
    })
    await act(async () => {
        await vi.advanceTimersByTimeAsync(20)
    })
    return harness.container
}

const renderStreamedChunks = async (chunks: string[]) => {
    const harness = render(SvelteMarkdown, {
        props: { source: '', streaming: true, renderers: { code: HighlightedCode } }
    })
    for (const chunk of chunks) {
        await act(() => harness.component.writeChunk(chunk))
        await flushStreamingBatch()
    }
    return harness.container
}

describe('HighlightedCode with the TanStack engine', () => {
    test('renders semantic th-* markup for a registered language', () => {
        const { container } = render(HighlightedCode, {
            props: { lang: 'ts', text: 'const x = 1', highlighter }
        })
        expect(container.querySelector('pre.th-code')).not.toBeNull()
        expect(container.querySelector('.th-keyword')).not.toBeNull()
        expect(highlightSpy).toHaveBeenCalledWith('const x = 1', 'ts')
    })

    test('never mounts a <script> element from code content', () => {
        const { container } = render(HighlightedCode, {
            props: { lang: 'ts', text: '<script>alert(1)</script>', highlighter }
        })
        expect(container.querySelector('script')).toBeNull()
    })

    test('is accepted by the legacy ShikiCode / setShikiHighlighter names', () => {
        setShikiHighlighter(highlighter)
        const { container } = render(ShikiCode, { props: { lang: 'ts', text: 'let a = 1' } })
        expect(container.querySelector('pre.th-code')).not.toBeNull()
    })
})

describe('TanStack engine streaming compatibility', () => {
    test('emits no async-extension warning and matches non-streaming DOM', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

        const chunks = CODE_DOC.match(/\S+\s*/g) ?? []
        const streamed = await renderStreamedChunks(chunks)
        const staticContainer = await renderStatic(CODE_DOC)

        const asyncWarnings = warnSpy.mock.calls
            .map((c) => String(c[0]))
            .filter((m) => m.includes('async extension'))
        expect(asyncWarnings).toEqual([])

        expect(normalizeHtml(streamed.innerHTML)).toBe(normalizeHtml(staticContainer.innerHTML))
        expect(streamed.querySelector('pre.th-code')).not.toBeNull()

        warnSpy.mockRestore()
    })

    test('does NOT re-highlight an unchanged code block as later prose streams in', async () => {
        const codePortion = `\`\`\`ts
const answer = 42
function greet(name) {
    return name
}
\`\`\`
`
        const harness = render(SvelteMarkdown, {
            props: { source: '', streaming: true, renderers: { code: HighlightedCode } }
        })
        await act(() => harness.component.writeChunk(codePortion))
        await flushStreamingBatch()

        const finalCode = 'const answer = 42\nfunction greet(name) {\n    return name\n}'
        expect(highlightSpy.mock.calls.some((c) => c[0] === finalCode)).toBe(true)

        highlightSpy.mockClear()
        for (const chunk of ['Some ', 'trailing ', 'prose ', 'that ', 'keeps ', 'coming.']) {
            await act(() => harness.component.writeChunk(chunk))
            await flushStreamingBatch()
        }

        const rehighlights = highlightSpy.mock.calls.filter((c) => c[0] === finalCode)
        expect(rehighlights).toEqual([])
    })
})
