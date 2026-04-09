import { render } from '@testing-library/svelte'
import { describe, expect, it } from 'vitest'
import SnippetPropsInspector from './test/snippets/SnippetPropsInspector.svelte'

/**
 * These tests verify that all expected properties from marked tokens
 * actually reach snippet overrides at runtime. This catches type gaps
 * where Parser.svelte spreads token properties that aren't declared
 * in the SnippetProps interfaces.
 *
 * See: https://github.com/humanspeak/svelte-markdown/issues/275
 */
describe('Snippet Props Completeness', () => {
    describe('ListItem props', () => {
        it('passes text, task, loose, and listItemIndex for plain list items', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '- Item text' }
            })
            const li = container.querySelector('[data-testid="props-listitem"]')
            expect(li).toBeTruthy()
            expect(li?.getAttribute('data-text')).toBe('Item text')
            expect(li?.getAttribute('data-task')).toBe('false')
            expect(li?.getAttribute('data-loose')).not.toBeNull()
            expect(li?.getAttribute('data-list-item-index')).toBe('0')
        })

        it('passes task=true and checked for task list items', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '- [x] Done\n- [ ] Todo' }
            })
            const items = container.querySelectorAll('[data-testid="props-listitem"]')
            expect(items.length).toBe(2)

            // Checked item
            expect(items[0]?.getAttribute('data-task')).toBe('true')
            expect(items[0]?.getAttribute('data-checked')).toBe('true')
            expect(items[0]?.getAttribute('data-list-item-index')).toBe('0')

            // Unchecked item
            expect(items[1]?.getAttribute('data-task')).toBe('true')
            expect(items[1]?.getAttribute('data-checked')).toBe('false')
            expect(items[1]?.getAttribute('data-list-item-index')).toBe('1')
        })
    })

    describe('List props', () => {
        it('passes ordered=false and loose for unordered lists', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '- A\n- B' }
            })
            const list = container.querySelector('[data-testid="props-list"]')
            expect(list).toBeTruthy()
            expect(list?.getAttribute('data-ordered')).toBe('false')
            expect(list?.getAttribute('data-loose')).not.toBeNull()
        })

        it('passes ordered=true and start for ordered lists', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '1. A\n2. B' }
            })
            const list = container.querySelector('[data-testid="props-list"]')
            expect(list).toBeTruthy()
            expect(list?.getAttribute('data-ordered')).toBe('true')
            expect(list?.getAttribute('data-start')).toBe('1')
        })
    })

    describe('Paragraph props', () => {
        it('passes raw and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: 'Hello world' }
            })
            const p = container.querySelector('[data-testid="props-paragraph"]')
            expect(p).toBeTruthy()
            expect(p?.getAttribute('data-text')).toBe('Hello world')
            expect(p?.getAttribute('data-raw')).toBeTruthy()
        })
    })

    describe('Heading props', () => {
        it('passes depth, raw, and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '## Title' }
            })
            const h = container.querySelector('[data-testid="props-heading"]')
            expect(h).toBeTruthy()
            expect(h?.getAttribute('data-depth')).toBe('2')
            expect(h?.getAttribute('data-text')).toBe('Title')
            expect(h?.getAttribute('data-raw')).toBeTruthy()
        })
    })

    describe('Link props', () => {
        it('passes href, title, raw, and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '[Click](https://example.com "My Title")' }
            })
            const a = container.querySelector('[data-testid="props-link"]')
            expect(a).toBeTruthy()
            expect(a?.getAttribute('data-href')).toBe('https://example.com')
            expect(a?.getAttribute('data-title')).toBe('My Title')
            expect(a?.getAttribute('data-text')).toBe('Click')
            expect(a?.getAttribute('data-raw')).toBeTruthy()
        })
    })

    describe('Image props', () => {
        it('passes href, title, text, and raw', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '![Alt text](/img.png "Image Title")' }
            })
            const img = container.querySelector('[data-testid="props-image"]')
            expect(img).toBeTruthy()
            expect(img?.getAttribute('data-href')).toBe('/img.png')
            expect(img?.getAttribute('data-title')).toBe('Image Title')
            expect(img?.getAttribute('data-text')).toBe('Alt text')
            expect(img?.getAttribute('data-raw')).toBeTruthy()
        })
    })

    describe('Code props', () => {
        it('passes lang, text, and escaped for fenced code blocks', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '```js\nconsole.log("hi")\n```' }
            })
            const code = container.querySelector('[data-testid="props-code"]')
            expect(code).toBeTruthy()
            expect(code?.getAttribute('data-lang')).toBe('js')
            expect(code?.getAttribute('data-text')).toBe('console.log("hi")')
            expect(code?.getAttribute('data-code-block-style')).toBeNull()
        })

        it('passes codeBlockStyle for indented code blocks', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '    indented code' }
            })
            const code = container.querySelector('[data-testid="props-code"]')
            expect(code).toBeTruthy()
            expect(code?.getAttribute('data-code-block-style')).toBe('indented')
        })
    })

    describe('Codespan props', () => {
        it('passes raw and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: 'Use `inline code` here' }
            })
            const code = container.querySelector('[data-testid="props-codespan"]')
            expect(code).toBeTruthy()
            expect(code?.getAttribute('data-text')).toBe('inline code')
            expect(code?.getAttribute('data-raw')).toBe('`inline code`')
        })
    })

    describe('Blockquote props', () => {
        it('passes raw and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '> Quoted text' }
            })
            const bq = container.querySelector('[data-testid="props-blockquote"]')
            expect(bq).toBeTruthy()
            expect(bq?.getAttribute('data-raw')).toBeTruthy()
            expect(bq?.getAttribute('data-text')).toBe('Quoted text')
        })
    })

    describe('Em props', () => {
        it('passes raw and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '*emphasized*' }
            })
            const em = container.querySelector('[data-testid="props-em"]')
            expect(em).toBeTruthy()
            expect(em?.getAttribute('data-raw')).toBe('*emphasized*')
            expect(em?.getAttribute('data-text')).toBe('emphasized')
        })
    })

    describe('Strong props', () => {
        it('passes raw and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '**bold**' }
            })
            const strong = container.querySelector('[data-testid="props-strong"]')
            expect(strong).toBeTruthy()
            expect(strong?.getAttribute('data-raw')).toBe('**bold**')
            expect(strong?.getAttribute('data-text')).toBe('bold')
        })
    })

    describe('Del props', () => {
        it('passes raw and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '~~deleted~~' }
            })
            const del = container.querySelector('[data-testid="props-del"]')
            expect(del).toBeTruthy()
            expect(del?.getAttribute('data-raw')).toBe('~~deleted~~')
            expect(del?.getAttribute('data-text')).toBe('deleted')
        })
    })

    describe('TableCell props', () => {
        it('passes header and align', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '| Left | Center |\n|:-----|:------:|\n| a | b |' }
            })
            const cells = container.querySelectorAll('[data-testid="props-tablecell"]')
            expect(cells.length).toBeGreaterThan(0)

            // Header cells
            const headerCells = Array.from(cells).filter(
                (c) => c.getAttribute('data-header') === 'true'
            )
            expect(headerCells.length).toBeGreaterThan(0)

            // Body cells
            const bodyCells = Array.from(cells).filter(
                (c) => c.getAttribute('data-header') === 'false'
            )
            expect(bodyCells.length).toBeGreaterThan(0)

            // Alignment
            const leftAligned = Array.from(cells).filter(
                (c) => c.getAttribute('data-align') === 'left'
            )
            expect(leftAligned.length).toBeGreaterThan(0)

            const centerAligned = Array.from(cells).filter(
                (c) => c.getAttribute('data-align') === 'center'
            )
            expect(centerAligned.length).toBeGreaterThan(0)
        })
    })

    describe('Escape props', () => {
        it('passes text and raw', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: '\\*not italic\\*' }
            })
            const escapes = container.querySelectorAll('[data-testid="props-escape"]')
            expect(escapes.length).toBeGreaterThan(0)
            expect(escapes[0]?.getAttribute('data-text')).toBe('*')
            expect(escapes[0]?.getAttribute('data-raw')).toBe('\\*')
        })
    })

    describe('Text props', () => {
        it('passes raw and text', () => {
            const { container } = render(SnippetPropsInspector, {
                props: { source: 'Plain text content' }
            })
            const text = container.querySelector('[data-testid="props-text"]')
            expect(text).toBeTruthy()
            expect(text?.getAttribute('data-raw')).toBeTruthy()
            expect(text?.getAttribute('data-text')).toBe('Plain text content')
        })
    })
})
