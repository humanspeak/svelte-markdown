/**
 * Rendered-output parity for streaming: what a user sees after a stream
 * completes must equal what a one-shot render of the same source shows.
 *
 * Companion to `utils/incremental-parser.parity.test.ts`, which pins the token
 * tree after every chunk. These tests pin the DOM for the symptoms users would
 * actually notice. `red` marks a known failure that asserts the CORRECT
 * behavior; see the parser suite for the convention.
 *
 * Run with `PARITY_STRICT=1` to see the real failure of every red test.
 */

import '@testing-library/jest-dom'
import { act, render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import { flushStreamingBatch, useStreamingTestHarness } from './test/streaming/harness.js'

const red = process.env.PARITY_STRICT ? it : it.fails

useStreamingTestHarness()

/** Element structure without Svelte's hydration/anchor comments or whitespace noise. */
const structure = (root: HTMLElement): string => {
    const clone = root.cloneNode(true) as HTMLElement
    const walker = document.createTreeWalker(clone, NodeFilter.SHOW_COMMENT)
    const comments: Comment[] = []
    while (walker.nextNode()) comments.push(walker.currentNode as Comment)
    for (const comment of comments) comment.remove()
    clone.normalize()
    return clone.innerHTML.replace(/\s+/g, ' ').trim()
}

const renderStreamed = async (chunks: string[]): Promise<HTMLElement> => {
    const { component, container } = render(SvelteMarkdown, {
        props: { source: '', streaming: true }
    })
    for (const chunk of chunks) {
        await act(() => component.writeChunk(chunk))
        await flushStreamingBatch()
    }
    return container
}

const renderOneShot = async (source: string): Promise<HTMLElement> => {
    const { container } = render(SvelteMarkdown, { props: { source } })
    await flushStreamingBatch()
    return container
}

const expectRenderedParity = async (chunks: string[]): Promise<void> => {
    const streamed = await renderStreamed(chunks)
    const oneShot = await renderOneShot(chunks.join(''))
    expect(structure(streamed)).toBe(structure(oneShot))
}

describe('streaming rendered parity', () => {
    describe('A. offset integrity', () => {
        red('CRLF source keeps every paragraph', async () => {
            const container = await renderStreamed(['a\r\n', '\r\nb'])
            const paragraphs = Array.from(container.querySelectorAll('p'), (p) => p.textContent)
            expect(paragraphs).toEqual(['a', 'b'])
        })

        red('a duplicate definition renders no stray text', async () => {
            const container = await renderStreamed([
                'See [1] for details.\n\n[1]: https://a.example\n\nSome prose.\n\n',
                '[1]: https://b.exam',
                'ple',
                '\n\nFinal paragraph.\n'
            ])
            const paragraphs = Array.from(container.querySelectorAll('p'), (p) => p.textContent)
            expect(paragraphs).toEqual(['See 1 for details.', 'Some prose.', 'Final paragraph.'])
        })
    })

    describe('B. block boundaries', () => {
        red('a loose ordered list renders as one list', async () => {
            const container = await renderStreamed(['1. first\n\n2', '. second\n\n3', '. third\n'])
            expect(container.querySelectorAll('ol')).toHaveLength(1)
            expect(container.querySelectorAll('ol > li')).toHaveLength(3)
        })

        red('an HTML block with blank lines contains its children', async () => {
            const container = await renderStreamed(['<div>\n\n', '**b**\n\n', '</div>\n'])
            // `:scope div` excludes the test container itself, which is a <div>.
            expect(container.querySelector(':scope div strong')?.textContent).toBe('b')
            await expectRenderedParity(['<div>\n\n', '**b**\n\n', '</div>\n'])
        })

        it('a tight list renders identically streamed and one-shot (guard)', async () => {
            await expectRenderedParity(['- one\n- t', 'wo\n  - nested\n', '- three\n\nAfter.\n'])
        })
    })

    describe('C. reference scope', () => {
        red('a definition inside a blockquote links an earlier reference', async () => {
            const container = await renderStreamed(['See [one].\n\n', '> [one]: /in-quote\n'])
            expect(container.querySelector('a')?.getAttribute('href')).toBe('/in-quote')
        })

        it('a plain definition links an earlier reference (guard)', async () => {
            const container = await renderStreamed(['See [p].\n\n', '[p]: https://example.com/p\n'])
            expect(container.querySelector('a')?.getAttribute('href')).toBe('https://example.com/p')
        })
    })
})
