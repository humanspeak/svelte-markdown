import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import type { SvelteMarkdownProps } from './types.js'

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
            const elements = Array.from(container.children)
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
