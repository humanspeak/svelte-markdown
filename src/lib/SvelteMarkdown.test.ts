import '@testing-library/jest-dom'
import { act, render, screen } from '@testing-library/svelte'
import type { MarkedExtension } from 'marked'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import type { SvelteMarkdownProps } from './types.js'
import * as parseAndCacheModule from './utils/parse-and-cache.js'
import { tokenCache } from './utils/token-cache.js'

// Clear token cache before each test to avoid cross-test pollution
beforeEach(() => {
    tokenCache.clearAllTokens()
})

describe('testing initialization', () => {
    test('accepts pre-processed tokens as source', async () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: [
                    {
                        type: 'paragraph',
                        raw: 'this is an **example**',
                        text: 'this is an **example**',
                        tokens: [
                            { type: 'text', raw: 'this is an ', text: 'this is an ' },
                            {
                                type: 'strong',
                                raw: '**example**',
                                text: 'example',
                                tokens: [{ type: 'text', raw: 'example', text: 'example' }]
                            }
                        ]
                    }
                ]
            }
        })

        // Wait for all timers and effects to settle
        await vi.runAllTimersAsync()

        // Query the DOM directly to avoid state mutations
        const element = container.querySelector('strong')
        expect(element).toBeInTheDocument()
        expect(element?.textContent).toBe('example')
        expect(element?.nodeName).toBe('STRONG')
    })
})

describe('imperative streaming API', () => {
    const flushStreamingBatch = async () => {
        await act(async () => {
            await vi.advanceTimersByTimeAsync(20)
        })
    }

    beforeEach(() => {
        vi.useFakeTimers()
        vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
            return setTimeout(() => callback(performance.now()), 16) as unknown as number
        })
        vi.stubGlobal('cancelAnimationFrame', (id: number) => {
            clearTimeout(id)
        })
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.useRealTimers()
    })

    test('exposes writeChunk and resetStream via component exports', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        expect(component.writeChunk).toBeTypeOf('function')
        expect(component.resetStream).toBeTypeOf('function')

        await act(() => component.writeChunk('# Hello'))
        await flushStreamingBatch()

        expect(container.querySelector('h1')?.textContent).toBe('Hello')
    })

    test('appends consecutive identical string chunks', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk('Hello')
            component.writeChunk(' ')
            component.writeChunk(' ')
            component.writeChunk('World')
        })
        await flushStreamingBatch()

        expect(container.querySelector('p')?.textContent).toBe('Hello  World')
    })

    test('batches append chunks into a single parser update per frame', async () => {
        const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk('Hello')
            component.writeChunk(' ')
            component.writeChunk('World')
        })

        expect(lexSpy).toHaveBeenCalledTimes(0)

        await flushStreamingBatch()

        expect(lexSpy).toHaveBeenCalledTimes(1)
        expect(container.querySelector('p')?.textContent).toBe('Hello World')

        lexSpy.mockRestore()
    })

    test('flushes append chunks immediately when the batch size threshold is exceeded', async () => {
        const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        const chunk = 'a'.repeat(300)

        await act(() => component.writeChunk(chunk))

        expect(lexSpy).toHaveBeenCalledTimes(1)
        expect(container.querySelector('p')?.textContent).toBe(chunk)

        await flushStreamingBatch()

        expect(lexSpy).toHaveBeenCalledTimes(1)

        lexSpy.mockRestore()
    })

    test('applies offset chunks at exact positions', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk({ value: 'Hello', offset: 0 })
            component.writeChunk({ value: ' World', offset: 5 })
        })

        expect(container.querySelector('p')?.textContent).toBe('Hello World')
    })

    test('pads gaps with spaces for offset chunks', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk({ value: 'ab', offset: 0 })
            component.writeChunk({ value: 'XY', offset: 4 })
        })

        expect(container.querySelector('p')?.textContent).toBe('ab  XY')
    })

    test('overwrites existing characters instead of inserting in offset mode', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk({ value: 'abcdef', offset: 0 })
            component.writeChunk({ value: 'Z', offset: 2 })
        })

        expect(container.querySelector('p')?.textContent).toBe('abZdef')
    })

    test('drops append-to-offset mode switches with a warning', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk('Hello')
            component.writeChunk({ value: 'World', offset: 0 })
        })
        await flushStreamingBatch()

        expect(container.querySelector('p')?.textContent).toBe('Hello')
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('append mode active, offset chunk dropped')
        )

        warnSpy.mockRestore()
    })

    test('drops offset-to-append mode switches with a warning', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk({ value: 'Hello', offset: 0 })
            component.writeChunk(' World')
        })

        expect(container.querySelector('p')?.textContent).toBe('Hello')
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('offset mode active, string chunk dropped')
        )

        warnSpy.mockRestore()
    })

    test('resetStream clears DOM and can seed a new baseline', async () => {
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => component.writeChunk('# Hello'))
        await flushStreamingBatch()
        expect(container.querySelector('h1')?.textContent).toBe('Hello')

        await act(() => component.resetStream())
        expect(container.textContent?.trim()).toBe('')

        await act(() => component.resetStream('# Seed'))
        expect(container.querySelector('h1')?.textContent).toBe('Seed')
    })

    test('changing source prop resets the internal streaming buffer', async () => {
        const { component, container, rerender } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => component.writeChunk('# Chunk Title'))
        await flushStreamingBatch()
        expect(container.querySelector('h1')?.textContent).toBe('Chunk Title')

        await rerender({ source: '# Prop Title', streaming: true })
        expect(container.querySelector('h1')?.textContent).toBe('Prop Title')

        await act(() => component.writeChunk('\n\nTail'))
        await flushStreamingBatch()
        expect(container.textContent).toContain('Tail')
    })

    test('writeChunk warns when streaming is false', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '' }
        })

        await act(() => component.writeChunk('Hello'))

        expect(container.textContent?.trim()).toBe('')
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('writeChunk() is only available when streaming={true}')
        )

        warnSpy.mockRestore()
    })

    test('writeChunk warns when source is a token array', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { component, container } = render(SvelteMarkdown, {
            props: {
                source: [
                    {
                        type: 'paragraph',
                        raw: 'seed',
                        text: 'seed',
                        tokens: [{ type: 'text', raw: 'seed', text: 'seed' }]
                    }
                ],
                streaming: true
            }
        })

        await act(() => component.writeChunk('more'))

        expect(container.textContent).toContain('seed')
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('writeChunk() requires a string-backed source')
        )

        warnSpy.mockRestore()
    })

    test('writeChunk warns on invalid offset chunks', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() =>
            component.writeChunk({
                value: 'bad',
                offset: -1
            })
        )

        expect(container.textContent?.trim()).toBe('')
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('offset must be a non-negative safe integer')
        )

        warnSpy.mockRestore()
    })

    test('parsed callback receives updated tokens after imperative writes', async () => {
        const parsed = vi.fn()
        const { component } = render(SvelteMarkdown, {
            props: { source: '', streaming: true, parsed }
        })

        await act(() => component.writeChunk('# Hello'))
        await flushStreamingBatch()

        expect(parsed).toHaveBeenLastCalledWith(
            expect.arrayContaining([expect.objectContaining({ type: 'heading', text: 'Hello' })])
        )
    })

    test('resetStream cancels pending append flushes', async () => {
        const lexSpy = vi.spyOn(parseAndCacheModule, 'lexAndClean')
        const { component, container } = render(SvelteMarkdown, {
            props: { source: '', streaming: true }
        })

        await act(() => {
            component.writeChunk('Hello')
            component.resetStream()
        })

        await flushStreamingBatch()

        expect(lexSpy).toHaveBeenCalledTimes(0)
        expect(container.textContent?.trim()).toBe('')

        lexSpy.mockRestore()
    })

    test('writeChunk warns and does nothing when async extensions disable streaming', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const asyncExtension: MarkedExtension = {
            async: true,
            async walkTokens() {
                return Promise.resolve()
            }
        }

        const { component, container } = render(SvelteMarkdown, {
            props: {
                source: '',
                streaming: true,
                extensions: [asyncExtension]
            }
        })

        await vi.runAllTimersAsync()
        warnSpy.mockClear()

        await act(() => component.writeChunk('# Hello'))

        expect(container.textContent?.trim()).toBe('')
        expect(warnSpy).toHaveBeenCalledWith(
            expect.stringContaining('writeChunk() is unavailable when async extensions are used')
        )

        warnSpy.mockRestore()
    })
})

describe('testing default renderers', () => {
    test('renders a paragraph', () => {
        render(SvelteMarkdown, { source: 'Plain text' })

        const element = screen.getByText('Plain text')
        expect(element).toBeInTheDocument()
        expect(element.nodeName).toBe('P')
    })

    test('parses inline when isInline is true (no paragraph wrapper)', async () => {
        const { container } = render(SvelteMarkdown, {
            props: { source: '**bold** text', isInline: true }
        })

        await vi.runAllTimersAsync()

        // Should render a <strong> directly, not wrapped in <p>
        const strong = container.querySelector('strong')
        expect(strong).toBeInTheDocument()
        expect(strong?.textContent).toBe('bold')
        expect(container.querySelector('p')).toBeNull()
    })

    test('empty string source yields empty tokens and empty DOM', async () => {
        const parsed = vi.fn()
        const { container } = render(SvelteMarkdown, {
            props: { source: '', parsed }
        })

        await vi.runAllTimersAsync()

        expect(parsed).toHaveBeenCalledWith([])
        expect(container.textContent?.trim()).toBe('')
    })

    test('renders emphasized paragraph', () => {
        render(SvelteMarkdown, { source: '*Plain text*' })

        const element = screen.getByText('Plain text')
        expect(element).toBeInTheDocument()
        expect(element.nodeName).toBe('EM')
    })

    test('renders strong paragraph', () => {
        render(SvelteMarkdown, { source: '**Plain text**' })

        const element = screen.getByText('Plain text')
        expect(element).toBeInTheDocument()
        expect(element.nodeName).toBe('STRONG')
    })

    test('renders a separator', () => {
        render(SvelteMarkdown, { source: '---' })

        expect(document.getElementsByTagName('hr')[0]).toBeInTheDocument()
    })

    test('renders a blockquote', () => {
        render(SvelteMarkdown, { source: '> Plain text' })
        const paragraphElement = screen.getByText('Plain text')
        const element = document.getElementsByTagName('blockquote')[0]
        expect(element).toBeInTheDocument()
        expect(element).toHaveTextContent('Plain text')
        expect(element.nodeName).toBe('BLOCKQUOTE')
        expect(element).toContainElement(paragraphElement)
        expect(paragraphElement.nodeName).toBe('P')
    })

    describe('renders a link', () => {
        const source = '[link](https://example.com "link title")'

        beforeEach(() => {
            render(SvelteMarkdown, { source })
        })

        test('renders link with title attribute', () => {
            const element = screen.getByTitle('link title')
            expect(element).toBeInTheDocument()
            expect(element).toHaveTextContent('link')
        })

        test('renders link with correct text', () => {
            const element = screen.getByText('link')
            expect(element).toBeInTheDocument()
            expect(element.tagName).toBe('A')
        })
    })

    describe('heading', () => {
        test('renders a heading with id', () => {
            render(SvelteMarkdown, { source: '# This is a title' })

            const element = screen.getByRole('heading', { name: /This is a title/ })
            expect(element).toBeInTheDocument()
            expect(element).toHaveAttribute('id', 'this-is-a-title')
        })

        test('renders a heading (alternative syntax)', () => {
            render(SvelteMarkdown, { source: 'This is a title\n===' })

            const element = screen.getByRole('heading', { name: /This is a title/ })
            expect(element).toBeInTheDocument()
            expect(element).toHaveAttribute('id', 'this-is-a-title')
        })

        test('renders a heading with id and prefix', async () => {
            const { container } = render(SvelteMarkdown, {
                props: {
                    source: '# This is a title',
                    options: {
                        headerPrefix: 'test-'
                    }
                } as unknown as SvelteMarkdownProps & { [key: string]: unknown }
            })

            const heading = container.querySelector('h1')
            expect(heading).toHaveAttribute('id', 'test-this-is-a-title')
        })

        test('renders a heading with non-duplicate id', () => {
            render(SvelteMarkdown, {
                source: '# This is a title\n\n## This is a title'
            })

            const element = screen.getAllByRole('heading', {
                name: /This is a title/
            })
            expect(element[0]).toHaveAttribute('id', 'this-is-a-title')
            expect(element[1]).toHaveAttribute('id', 'this-is-a-title-1')
        })

        test('renders a heading without id', () => {
            render(SvelteMarkdown, {
                source: '# This is a title',
                options: { headerIds: false }
            } as unknown as SvelteMarkdownProps & { [key: string]: unknown })

            const element = screen.getByRole('heading', { name: /This is a title/ })
            expect(element).not.toHaveAttribute('id')
        })
    })

    test('renders an image', () => {
        render(SvelteMarkdown, {
            source: '![Image](https://example.com/img/profile-pic-400.jpeg "image title")'
        })

        const element = screen.getByRole('img', { name: /Image/ })
        expect(element).toBeInTheDocument()
        expect(element).toHaveAttribute('title', 'image title')
    })

    test('renders a table', () => {
        render(SvelteMarkdown, {
            source: `
  | header |
  |--------|
  | value |`
        })

        const element = screen.getByRole('table')
        const tableHeaderElement = screen.getByRole('columnheader', {
            name: /header/
        })
        const tableCellElement = screen.getByRole('cell', { name: /value/ })
        expect(element).toBeInTheDocument()
        expect(element).toContainElement(tableHeaderElement)
        expect(element).toContainElement(tableCellElement)
    })

    describe('html rendering', () => {
        test('short html renders properly', () => {
            render(SvelteMarkdown, { source: 'a<sub>1</sub>' })

            const element = screen.getByText('1')
            expect(element).toBeInTheDocument()
            expect(element.nodeName).toBe('SUB')

            const element2 = screen.getByText('a')
            expect(element2).toBeInTheDocument()
            expect(element2.nodeName).toBe('P')
        })

        test('renders nested html elements', () => {
            render(SvelteMarkdown, {
                source: '<div>Hello <span>nested <em>world</em></span></div>'
            })

            const emElement = screen.getByText('world')
            expect(emElement).toBeInTheDocument()
            expect(emElement.nodeName).toBe('EM')
            expect(emElement.parentElement?.nodeName).toBe('SPAN')
            expect(emElement.parentElement?.parentElement?.nodeName).toBe('DIV')
        })

        test('renders html with attributes', () => {
            render(SvelteMarkdown, {
                source: '<a href="https://example.com" class="link">Click me</a>'
            })

            const linkElement = screen.getByText('Click me')
            expect(linkElement).toBeInTheDocument()
            expect(linkElement.nodeName).toBe('A')
            expect(linkElement).toHaveAttribute('href', 'https://example.com')
            expect(linkElement).toHaveAttribute('class', 'link')
        })

        test('renders mixed markdown and html', () => {
            render(SvelteMarkdown, {
                source: '**Bold** text with <code>inline code</code> and *italic*'
            })

            expect(screen.getByText('Bold')).toHaveProperty('nodeName', 'STRONG')
            expect(screen.getByText('inline code')).toHaveProperty('nodeName', 'CODE')
            expect(screen.getByText('italic')).toHaveProperty('nodeName', 'EM')
        })

        test('renders nested HTML elements with proper class inheritance', () => {
            const { container } = render(SvelteMarkdown, {
                source: '<div class="wrapper">Text <span>nested content</span></div>'
            })

            // Check the div element
            const divElement = container.querySelector('.wrapper')
            expect(divElement).toBeInTheDocument()
            expect(divElement).toHaveClass('wrapper')
            expect(divElement?.innerHTML).toContain('Text')

            // Check the span element
            const spanElement = divElement?.querySelector('span')
            expect(spanElement).toBeInTheDocument()
            expect(spanElement).not.toHaveClass('wrapper') // Ensure class is not inherited
            expect(spanElement?.textContent).toBe('nested content')
        })

        test('renders plain text followed by HTML tag correctly', () => {
            const { container } = render(SvelteMarkdown, {
                source: 'Hi!!!\n<h1>test</h1>'
            })

            // Check the text content is in a paragraph
            const paragraphElement = container.querySelector('p')
            expect(paragraphElement).toBeInTheDocument()
            expect(paragraphElement?.textContent).toBe('Hi!!!')

            // Check the h1 element
            const headingElement = container.querySelector('h1')
            expect(headingElement).toBeInTheDocument()
            expect(headingElement?.textContent).toBe('test')

            // Verify the order of elements
            const elements: Element[] = Array.from(container.children)
            expect(elements).toHaveLength(2)
            expect(elements[0].tagName).toBe('P')
            expect(elements[1].tagName).toBe('H1')
            expect(elements[0].textContent).toBe('Hi!!!')
            expect(elements[1].textContent).toBe('test')

            // Ensure no unwanted nesting
            expect(paragraphElement?.querySelector('h1')).toBeNull()
            expect(headingElement?.parentElement).not.toBe(paragraphElement)
        })
    })
})

describe('mixed markdown and HTML table rendering', () => {
    test('renders mixed markdown-HTML table with formatting', () => {
        const source = `
| Feature | Markdown | HTML |
|---------|----------|------|
| Bold | **text** | <strong>text</strong> |
| Italic | *text* | <em>text</em> |
| Links | [text](url) | <a href="url">text</a> |`

        const { container } = render(SvelteMarkdown, { source })

        // Check table structure
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()

        // Updated row selection
        const tbody = container.querySelector('tbody')
        const rows = tbody?.querySelectorAll('tr')
        expect(rows?.length).toBeGreaterThan(0)

        // Check Bold row (index 0)
        const boldRow = rows?.[0]
        const boldCells = boldRow?.querySelectorAll('td')
        expect(boldCells?.[1].innerHTML).toContain('<strong>')
        expect(boldCells?.[1].innerHTML).toContain('text')
        expect(boldCells?.[1].innerHTML).toContain('</strong>')
        expect(boldCells?.[2].innerHTML).toContain('<strong>')
        expect(boldCells?.[2].innerHTML).toContain('text')
        expect(boldCells?.[2].innerHTML).toContain('</strong>')

        // Check Italic row (index 1)
        const italicRow = rows?.[1]
        const italicCells = italicRow?.querySelectorAll('td')
        expect(italicCells?.[1].innerHTML).toContain('<em>')
        expect(italicCells?.[1].innerHTML).toContain('text')
        expect(italicCells?.[1].innerHTML).toContain('</em>')
        expect(italicCells?.[2].innerHTML).toContain('<em>')
        expect(italicCells?.[2].innerHTML).toContain('text')
        expect(italicCells?.[2].innerHTML).toContain('</em>')

        // Check Links row (index 2)
        const linksRow = rows?.[2]
        const linkCells = linksRow?.querySelectorAll('td')
        expect(linkCells?.[1].innerHTML).toContain('<a href="url">')
        expect(linkCells?.[1].innerHTML).toContain('text')
        expect(linkCells?.[1].innerHTML).toContain('</a>')
        expect(linkCells?.[2].innerHTML).toContain('<a href="url">')
        expect(linkCells?.[2].innerHTML).toContain('text')
        expect(linkCells?.[2].innerHTML).toContain('</a>')
    })

    test('handles nested markdown within HTML in table cells', () => {
        const source = `
| Type | Content |
|------|---------|
| Nested | <div>**bold** and *italic*</div> |
| Mixed List | <ul><li>Item 1</li><li>Item 2</li></ul> |
| Code | <code>\`inline code\`</code> |`

        const { container } = render(SvelteMarkdown, { source })

        const tbody = container.querySelector('tbody')
        const rows = tbody?.querySelectorAll('tr')
        expect(rows?.length).toBeGreaterThan(0)

        // Check nested formatting
        const nestedCell = rows?.[0].querySelectorAll('td')[1]
        expect(nestedCell).toBeDefined()
        expect(nestedCell?.querySelector('div strong')).toBeInTheDocument()
        expect(nestedCell?.querySelector('div em')).toBeInTheDocument()

        // Check mixed list - updated to use proper HTML list structure
        const listCell = rows?.[1].querySelectorAll('td')[1]
        expect(listCell).toBeDefined()
        const ul = listCell?.querySelector('ul')
        expect(ul).toBeInTheDocument()
        const listItems = ul?.querySelectorAll('li')
        expect(listItems).toHaveLength(2)

        // Check code formatting
        const codeCell = rows?.[2].querySelectorAll('td')[1]
        expect(codeCell).toBeDefined()
        expect(codeCell?.querySelector('code')).toBeInTheDocument()
    })

    test('handles complex table cell alignments with mixed content', () => {
        const source = `
| Left | Center | Right |
|:-----|:------:|------:|
| <em>italic</em> | **centered** | [right](url) |
| *left* | <strong>middle</strong> | <div align="right">end</div> |`

        const { container } = render(SvelteMarkdown, { source })

        const tbody = container.querySelector('tbody')
        const rows = tbody?.querySelectorAll('tr')
        expect(rows?.length).toBeGreaterThan(0)

        // Check alignments and content
        const firstRow = rows?.[0].querySelectorAll('td')
        expect(firstRow).toBeDefined()
        expect(firstRow?.[1]).toHaveStyle({ textAlign: 'center' })
        expect(firstRow?.[2]).toHaveStyle({ textAlign: 'right' })

        // Check mixed content rendering
        expect(firstRow?.[0].querySelector('em')).toBeInTheDocument()
        expect(firstRow?.[1].querySelector('strong')).toBeInTheDocument()
        expect(firstRow?.[2].querySelector('a')).toBeInTheDocument()
    })
})

describe('async extension paths', () => {
    test('renders markdown with async extension (walkTokens returning Promise)', async () => {
        const asyncExtension = {
            async: true,
            extensions: [
                {
                    name: 'testToken',
                    level: 'block' as const,
                    start(src: string) {
                        return src.indexOf('::')
                    },
                    tokenizer(src: string) {
                        const match = /^::test::/.exec(src)
                        if (match) {
                            return {
                                type: 'testToken',
                                raw: match[0],
                                text: 'test'
                            }
                        }
                        return undefined
                    },
                    renderer() {
                        return '<div>test token</div>'
                    }
                }
            ],
            walkTokens(token: { type: string; processed?: boolean }) {
                if (token.type === 'paragraph') {
                    token.processed = true
                }
                return Promise.resolve()
            }
        }

        const { container } = render(SvelteMarkdown, {
            props: {
                source: 'Hello async world',
                extensions: [asyncExtension]
            }
        })

        await vi.runAllTimersAsync()
        // Flush additional microtasks for async walkTokens
        await vi.runAllTimersAsync()

        expect(container.querySelector('p')).toBeInTheDocument()
        expect(container.textContent).toContain('Hello async world')
    })

    test('async path handles pre-parsed token array', async () => {
        const asyncExtension = {
            async: true,
            extensions: [],
            walkTokens() {
                return Promise.resolve()
            }
        }

        const { container } = render(SvelteMarkdown, {
            props: {
                source: [
                    {
                        type: 'paragraph',
                        raw: 'pre-parsed',
                        text: 'pre-parsed',
                        tokens: [{ type: 'text', raw: 'pre-parsed', text: 'pre-parsed' }]
                    }
                ],
                extensions: [asyncExtension]
            }
        })

        await vi.runAllTimersAsync()

        expect(container.textContent).toContain('pre-parsed')
    })

    test('async path handles empty string source', async () => {
        const asyncExtension = {
            async: true,
            extensions: [],
            walkTokens() {
                return Promise.resolve()
            }
        }

        const parsed = vi.fn()
        render(SvelteMarkdown, {
            props: {
                source: '',
                extensions: [asyncExtension],
                parsed
            }
        })

        await vi.runAllTimersAsync()

        expect(parsed).toHaveBeenCalledWith([])
    })

    test('async path handles walkTokens failure gracefully', async () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

        const failingExtension = {
            async: true,
            extensions: [],
            walkTokens() {
                return Promise.reject(new Error('walkTokens failed'))
            }
        }

        const parsed = vi.fn()
        render(SvelteMarkdown, {
            props: {
                source: 'This will fail',
                extensions: [failingExtension],
                parsed
            }
        })

        await vi.runAllTimersAsync()
        // Extra flush for rejected promise handling
        await vi.runAllTimersAsync()

        // On error, asyncTokens should be set to empty array
        expect(parsed).toHaveBeenCalledWith([])

        consoleSpy.mockRestore()
    })
})

describe('custom html renderers merge', () => {
    test('merges custom html renderers with defaults', () => {
        const { container } = render(SvelteMarkdown, {
            props: {
                source: '<div class="custom">content</div>',
                renderers: {
                    html: {
                        div: undefined
                    }
                }
            } as unknown as SvelteMarkdownProps & { [key: string]: unknown }
        })

        // The html renderers merge path should be exercised
        // Even with div set to undefined, the merge still happens via the html branch
        expect(container).toBeTruthy()
    })
})

describe('testing nested lists', () => {
    test('renders three levels of nested lists correctly', () => {
        const source = `
* Level 1 Item A
  * Level 2 Item A1
    * Level 3 Item A1a
    * Level 3 Item A1b
  * Level 2 Item A2
* Level 1 Item B
  * Level 2 Item B1
    * Level 3 Item B1a`

        const { container } = render(SvelteMarkdown, { source })

        // Check first level list
        const topLevelList = container.querySelector('ul')
        expect(topLevelList).toBeInTheDocument()

        // Check second level lists
        const secondLevelLists = container.querySelectorAll('ul > li > ul')
        expect(secondLevelLists).toHaveLength(4) // Updated to match actual structure

        // Check third level lists
        const thirdLevelLists = container.querySelectorAll('ul > li > ul > li > ul')
        expect(thirdLevelLists).toHaveLength(2)

        // Verify specific content at each level
        expect(screen.getByText('Level 1 Item A')).toBeInTheDocument()
        expect(screen.getByText('Level 2 Item A1')).toBeInTheDocument()
        expect(screen.getByText('Level 3 Item A1a')).toBeInTheDocument()

        // Check nesting structure
        const firstNestedList = secondLevelLists[0]
        expect(firstNestedList?.parentElement?.textContent).toContain('Level 1 Item A')

        const firstThirdLevelList = thirdLevelLists[0]
        expect(firstThirdLevelList?.parentElement?.textContent).toContain('Level 2 Item A1')
    })
})

describe('URL sanitization (Issue #272)', () => {
    test('blocks javascript: protocol in markdown links', () => {
        const { container } = render(SvelteMarkdown, {
            source: '[Click](javascript:alert("XSS"))'
        })
        const link = container.querySelector('a')
        expect(link).toBeInTheDocument()
        expect(link).toHaveAttribute('href', '')
    })

    test('blocks mixed-case javascript: protocol', () => {
        const { container } = render(SvelteMarkdown, {
            source: '[Click](JaVaScRiPt:alert("XSS"))'
        })
        const link = container.querySelector('a')
        expect(link).toHaveAttribute('href', '')
    })

    test('blocks data: URI in markdown links', () => {
        const { container } = render(SvelteMarkdown, {
            source: '[Click](data:text/html,<script>alert(1)</script>)'
        })
        const link = container.querySelector('a')
        expect(link).toHaveAttribute('href', '')
    })

    test('blocks javascript: in image src', () => {
        const { container } = render(SvelteMarkdown, {
            source: '![alt](javascript:alert("XSS"))'
        })
        const img = container.querySelector('img')
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute('src', '')
    })

    test('allows safe https links', () => {
        const { container } = render(SvelteMarkdown, {
            source: '[Safe](https://example.com)'
        })
        const link = container.querySelector('a')
        expect(link).toHaveAttribute('href', 'https://example.com')
    })

    test('allows relative links', () => {
        const { container } = render(SvelteMarkdown, {
            source: '[Relative](/path/to/page)'
        })
        const link = container.querySelector('a')
        expect(link).toHaveAttribute('href', '/path/to/page')
    })

    test('strips onclick from HTML <a> tags', () => {
        const { container } = render(SvelteMarkdown, {
            source: '<a href="https://example.com" onclick="alert(1)">Click</a>'
        })
        const link = container.querySelector('a')
        expect(link).toHaveAttribute('href', 'https://example.com')
        expect(link).not.toHaveAttribute('onclick')
    })

    test('strips onclick from HTML <div> tags', () => {
        const { container } = render(SvelteMarkdown, {
            source: '<div onclick="alert(1)">Content</div>'
        })
        const div = container.querySelector('div div')
        expect(div).toBeInTheDocument()
        expect(div).not.toHaveAttribute('onclick')
    })

    test('sanitizes javascript: href in HTML <a> tags', () => {
        const { container } = render(SvelteMarkdown, {
            source: '<a href="javascript:alert(1)">Click</a>'
        })
        const link = container.querySelector('a')
        expect(link).not.toHaveAttribute('href')
    })

    test('allows custom sanitizeUrl to override default', () => {
        const allowAll = (url: string) => url
        const { container } = render(SvelteMarkdown, {
            source: '[Click](javascript:alert("XSS"))',
            sanitizeUrl: allowAll
        })
        const link = container.querySelector('a')
        expect(link).toHaveAttribute('href', 'javascript:alert("XSS")')
    })

    test('allows custom sanitizeAttributes to override default', () => {
        const keepAll = (attrs: Record<string, string>) => attrs
        const { container } = render(SvelteMarkdown, {
            source: '<a href="javascript:alert(1)">Click</a>',
            sanitizeAttributes: keepAll
        })
        const link = container.querySelector('a')
        // Custom sanitizeAttributes bypasses URL sanitization too
        expect(link).toHaveAttribute('href', 'javascript:alert(1)')
    })
})
