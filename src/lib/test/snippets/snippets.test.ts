import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import SnippetBlockquote from './SnippetBlockquote.svelte'
import SnippetCode from './SnippetCode.svelte'
import SnippetHeading from './SnippetHeading.svelte'
import SnippetHtmlAnchor from './SnippetHtmlAnchor.svelte'
import SnippetHtmlDiv from './SnippetHtmlDiv.svelte'
import SnippetImage from './SnippetImage.svelte'
import SnippetLink from './SnippetLink.svelte'
import SnippetList from './SnippetList.svelte'
import SnippetMultiple from './SnippetMultiple.svelte'
import SnippetNested from './SnippetNested.svelte'
import SnippetParagraph from './SnippetParagraph.svelte'
import SnippetPartial from './SnippetPartial.svelte'
import SnippetPrecedence from './SnippetPrecedence.svelte'
import SnippetTable from './SnippetTable.svelte'
import SnippetWithChildren from './SnippetWithChildren.svelte'

describe('Snippet Overrides', () => {
    describe('Markdown renderer snippets', () => {
        it('renders paragraph with snippet override', () => {
            const { container } = render(SnippetParagraph, {
                props: { source: 'Hello world' }
            })
            const p = container.querySelector('[data-testid="snippet-paragraph"]')
            expect(p).toBeTruthy()
            expect(p?.textContent).toContain('Hello world')
            expect(p?.classList.contains('custom-paragraph')).toBe(true)
        })

        it('renders heading with snippet override and correct depth', () => {
            const { container } = render(SnippetHeading, {
                props: { source: '## Title' }
            })
            const h = container.querySelector('[data-testid="snippet-heading"]')
            expect(h).toBeTruthy()
            expect(h?.getAttribute('data-depth')).toBe('2')
            expect(h?.textContent).toContain('Title')
        })

        it('renders link with snippet override and target="_blank"', () => {
            const { container } = render(SnippetLink, {
                props: { source: '[Click](https://example.com)' }
            })
            const a = container.querySelector('[data-testid="snippet-link"]')
            expect(a).toBeTruthy()
            expect(a?.getAttribute('href')).toBe('https://example.com')
            expect(a?.getAttribute('target')).toBe('_blank')
        })

        it('renders code block with snippet override (leaf node)', () => {
            const { container } = render(SnippetCode, {
                props: { source: '```js\nconsole.log("hi")\n```' }
            })
            const code = container.querySelector('[data-testid="snippet-code"]')
            expect(code).toBeTruthy()
            expect(code?.getAttribute('data-lang')).toBe('js')
            expect(code?.textContent).toContain('console.log')
        })

        it('renders image with snippet override (leaf node)', () => {
            const { container } = render(SnippetImage, {
                props: { source: '![Alt text](/img.png "Title")' }
            })
            const img = container.querySelector('[data-testid="snippet-image"]')
            expect(img).toBeTruthy()
            expect(img?.getAttribute('alt')).toBe('Alt text')
        })

        it('renders blockquote with snippet override', () => {
            const { container } = render(SnippetBlockquote, {
                props: { source: '> Quoted text' }
            })
            const bq = container.querySelector('[data-testid="snippet-blockquote"]')
            expect(bq).toBeTruthy()
            expect(bq?.textContent).toContain('Quoted text')
        })

        it('renders list and listitem with snippet overrides', () => {
            const { container } = render(SnippetList, {
                props: { source: '- Item 1\n- Item 2' }
            })
            const list = container.querySelector('[data-testid="snippet-list"]')
            expect(list).toBeTruthy()
            const items = container.querySelectorAll('[data-testid="snippet-listitem"]')
            expect(items.length).toBe(2)
        })

        it('renders table with snippet overrides for all table parts', () => {
            const { container } = render(SnippetTable, {
                props: { source: '| A | B |\n|---|---|\n| 1 | 2 |' }
            })
            expect(container.querySelector('[data-testid="snippet-table"]')).toBeTruthy()
            expect(container.querySelector('[data-testid="snippet-tablehead"]')).toBeTruthy()
            expect(container.querySelector('[data-testid="snippet-tablebody"]')).toBeTruthy()
            expect(
                container.querySelectorAll('[data-testid="snippet-tablerow"]').length
            ).toBeGreaterThan(0)
            expect(
                container.querySelectorAll('[data-testid="snippet-tablecell"]').length
            ).toBeGreaterThan(0)
        })
    })

    describe('Snippet precedence', () => {
        it('snippet wins over component renderer for the same type', () => {
            const { container } = render(SnippetPrecedence, {
                props: { source: 'Test paragraph' }
            })
            // Snippet should win — data-testid="snippet-paragraph" present
            expect(container.querySelector('[data-testid="snippet-paragraph"]')).toBeTruthy()
            // Component renderer marker should NOT be present
            expect(container.querySelector('[data-testid="component-wins"]')).toBeFalsy()
        })
    })

    describe('Partial overrides', () => {
        it('non-overridden renderers use defaults', () => {
            const { container } = render(SnippetPartial, {
                props: { source: '# Heading\n\nParagraph with **bold**' }
            })
            // Paragraph uses snippet
            expect(container.querySelector('[data-testid="snippet-paragraph"]')).toBeTruthy()
            // Heading uses default (no data-testid)
            const h1 = container.querySelector('h1')
            expect(h1).toBeTruthy()
            expect(h1?.getAttribute('data-testid')).toBeNull()
            // Strong uses default
            expect(container.querySelector('strong')).toBeTruthy()
        })
    })

    describe('Children rendering', () => {
        it('children snippet renders nested inline content', () => {
            const { container } = render(SnippetWithChildren, {
                props: { source: 'Text with **bold** and *italic*' }
            })
            const p = container.querySelector('[data-testid="snippet-paragraph"]')
            expect(p).toBeTruthy()
            // Children should include the nested inline elements
            expect(p?.querySelector('strong')).toBeTruthy()
            expect(p?.querySelector('em')).toBeTruthy()
        })

        it('deeply nested content renders through multiple snippet layers', () => {
            const { container } = render(SnippetNested, {
                props: { source: '> - [Link](https://example.com)\n> - **Bold item**' }
            })
            const bq = container.querySelector('[data-testid="snippet-blockquote"]')
            expect(bq).toBeTruthy()
            // List inside blockquote
            const list = bq?.querySelector('[data-testid="snippet-list"]')
            expect(list).toBeTruthy()
            // Link inside list item
            const link = list?.querySelector('[data-testid="snippet-link"]')
            expect(link).toBeTruthy()
        })
    })

    describe('HTML snippet overrides', () => {
        it('renders html_div snippet override', () => {
            const { container } = render(SnippetHtmlDiv, {
                props: { source: '<div class="test">Content</div>' }
            })
            const div = container.querySelector('[data-testid="snippet-html-div"]')
            expect(div).toBeTruthy()
            expect(div?.textContent).toContain('Content')
        })

        it('renders html_a snippet override with custom attributes', () => {
            const { container } = render(SnippetHtmlAnchor, {
                props: { source: '<a href="https://example.com">Link</a>' }
            })
            const a = container.querySelector('[data-testid="snippet-html-a"]')
            expect(a).toBeTruthy()
            expect(a?.getAttribute('target')).toBe('_blank')
        })

        it('non-overridden HTML tags use default renderers', () => {
            const { container } = render(SnippetHtmlDiv, {
                props: { source: '<div>Div</div><span>Span</span>' }
            })
            // div uses snippet
            expect(container.querySelector('[data-testid="snippet-html-div"]')).toBeTruthy()
            // span uses default (no data-testid)
            const span = container.querySelector('span')
            expect(span).toBeTruthy()
            expect(span?.getAttribute('data-testid')).toBeNull()
        })
    })

    describe('Multiple simultaneous overrides', () => {
        it('applies multiple snippet overrides in a single component', () => {
            const { container } = render(SnippetMultiple, {
                props: {
                    source: '# Title\n\nParagraph with [link](https://example.com)'
                }
            })
            expect(container.querySelector('[data-testid="snippet-heading"]')).toBeTruthy()
            expect(container.querySelector('[data-testid="snippet-paragraph"]')).toBeTruthy()
            expect(container.querySelector('[data-testid="snippet-link"]')).toBeTruthy()
        })
    })
})
