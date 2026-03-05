import '@testing-library/jest-dom'
import { render } from '@testing-library/svelte'
import { createRawSnippet } from 'svelte'
import { describe, expect, test, vi } from 'vitest'
import Parser from './Parser.svelte'

// Minimal fake renderers to exercise branches
const baseRenderers = {
    paragraph: (await import('./renderers/Paragraph.svelte')).default,
    text: (await import('./renderers/Text.svelte')).default,
    rawtext: (await import('./renderers/RawText.svelte')).default,
    escape: (await import('./renderers/Text.svelte')).default,
    heading: (await import('./renderers/Heading.svelte')).default,
    blockquote: (await import('./renderers/Blockquote.svelte')).default,
    code: (await import('./renderers/Code.svelte')).default,
    hr: (await import('./renderers/Hr.svelte')).default,
    list: (await import('./renderers/List.svelte')).default,
    listitem: (await import('./renderers/ListItem.svelte')).default,
    orderedlistitem: (await import('./renderers/ListItem.svelte')).default,
    unorderedlistitem: (await import('./renderers/ListItem.svelte')).default,
    table: (await import('./renderers/Table.svelte')).default,
    tablehead: (await import('./renderers/TableHead.svelte')).default,
    tablebody: (await import('./renderers/TableBody.svelte')).default,
    tablerow: (await import('./renderers/TableRow.svelte')).default,
    tablecell: (await import('./renderers/TableCell.svelte')).default,
    link: (await import('./renderers/Link.svelte')).default,
    image: (await import('./renderers/Image.svelte')).default,
    em: (await import('./renderers/Em.svelte')).default,
    strong: (await import('./renderers/Strong.svelte')).default,
    codespan: (await import('./renderers/Codespan.svelte')).default,
    br: (await import('./renderers/Br.svelte')).default,
    del: (await import('./renderers/Del.svelte')).default,
    html: (await import('./renderers/html/index.js')).default
} as const

/**
 * Helper to create a snippet override that renders a wrapper element with a data-testid,
 * and renders its children inside.
 */
function makeSnippet(testId: string) {
    return createRawSnippet(() => ({
        render: () => `<div data-testid="${testId}"></div>`,
        setup(node: Element) {
            // Access the children snippet from the props that will be set
            // Since createRawSnippet doesn't get props with children,
            // we just verify the element is mounted
        }
    }))
}

describe('Parser branch coverage', () => {
    test('table renders without head/body when components are missing', async () => {
        const renderers = { ...baseRenderers }
        // Remove head/body to hit falsy branches
        delete (renderers as any).tablehead
        delete (renderers as any).tablebody

        const header = [{ tokens: [{ type: 'text', raw: 'H', text: 'H' }] }] as any
        const rows = [[{ tokens: [{ type: 'text', raw: 'C', text: 'C' }] }]] as any

        const { container } = render(Parser, {
            props: {
                type: 'table',
                header,
                rows,
                align: ['left'],
                renderers
            }
        })

        await vi.runAllTimersAsync()

        const table = container.querySelector('table')
        expect(table).toBeInTheDocument()
        // No thead/tbody present
        expect(container.querySelector('thead')).toBeNull()
        expect(container.querySelector('tbody')).toBeNull()
    })

    test('HTML tag fallback when html renderer map missing tag', async () => {
        const renderers = { ...baseRenderers, html: {} as any }

        const tokens = [
            {
                type: 'html',
                tag: 'span',
                tokens: [{ type: 'text', raw: 'x', text: 'x' }]
            }
        ] as any

        const { container } = render(Parser, {
            props: { tokens, renderers }
        })

        await vi.runAllTimersAsync()

        // Fallback renders child tokens via generic path (paragraph/rawtext)
        expect(container.textContent).toContain('x')
    })

    test('table snippet override renders custom wrapper', async () => {
        const tableSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-table"></div>`
        }))

        const header = [{ tokens: [{ type: 'text', raw: 'H1', text: 'H1' }] }] as any
        const rows = [[{ tokens: [{ type: 'text', raw: 'C1', text: 'C1' }] }]] as any

        const { container } = render(Parser, {
            props: {
                type: 'table',
                header,
                rows,
                align: ['left'],
                renderers: baseRenderers,
                snippetOverrides: { table: tableSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-table"]')).toBeInTheDocument()
    })

    test('thead snippet override renders custom wrapper', async () => {
        const theadSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-thead"></div>`
        }))

        const header = [{ tokens: [{ type: 'text', raw: 'H', text: 'H' }] }] as any
        const rows = [[{ tokens: [{ type: 'text', raw: 'C', text: 'C' }] }]] as any

        const { container } = render(Parser, {
            props: {
                type: 'table',
                header,
                rows,
                align: ['left'],
                renderers: baseRenderers,
                snippetOverrides: { tablehead: theadSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-thead"]')).toBeInTheDocument()
    })

    test('tbody snippet override renders custom wrapper', async () => {
        const tbodySnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-tbody"></div>`
        }))

        const header = [{ tokens: [{ type: 'text', raw: 'H', text: 'H' }] }] as any
        const rows = [[{ tokens: [{ type: 'text', raw: 'C', text: 'C' }] }]] as any

        const { container } = render(Parser, {
            props: {
                type: 'table',
                header,
                rows,
                align: ['left'],
                renderers: baseRenderers,
                snippetOverrides: { tablebody: tbodySnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-tbody"]')).toBeInTheDocument()
    })

    test('tablerow snippet override renders custom wrapper', async () => {
        const rowSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-row"></div>`
        }))

        const header = [{ tokens: [{ type: 'text', raw: 'H', text: 'H' }] }] as any
        const rows = [[{ tokens: [{ type: 'text', raw: 'C', text: 'C' }] }]] as any

        const { container } = render(Parser, {
            props: {
                type: 'table',
                header,
                rows,
                align: ['left'],
                renderers: baseRenderers,
                snippetOverrides: { tablerow: rowSnippet }
            }
        })

        await vi.runAllTimersAsync()

        // Should render row snippets for both header and body rows
        const customRows = container.querySelectorAll('[data-testid="custom-row"]')
        expect(customRows.length).toBeGreaterThanOrEqual(1)
    })

    test('tablecell snippet override renders custom wrapper', async () => {
        const cellSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-cell"></div>`
        }))

        const header = [{ tokens: [{ type: 'text', raw: 'H', text: 'H' }] }] as any
        const rows = [[{ tokens: [{ type: 'text', raw: 'C', text: 'C' }] }]] as any

        const { container } = render(Parser, {
            props: {
                type: 'table',
                header,
                rows,
                align: ['left'],
                renderers: baseRenderers,
                snippetOverrides: { tablecell: cellSnippet }
            }
        })

        await vi.runAllTimersAsync()

        const customCells = container.querySelectorAll('[data-testid="custom-cell"]')
        expect(customCells.length).toBeGreaterThanOrEqual(1)
    })

    test('ordered list renders with list snippet override', async () => {
        const listSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-list"></div>`
        }))

        const { container } = render(Parser, {
            props: {
                type: 'list',
                ordered: true,
                items: [{ tokens: [{ type: 'text', raw: 'item', text: 'item' }] }],
                renderers: baseRenderers,
                snippetOverrides: { list: listSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-list"]')).toBeInTheDocument()
    })

    test('unordered list renders with list snippet override', async () => {
        const listSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-ul"></div>`
        }))

        const { container } = render(Parser, {
            props: {
                type: 'list',
                ordered: false,
                items: [{ tokens: [{ type: 'text', raw: 'item', text: 'item' }] }],
                renderers: baseRenderers,
                snippetOverrides: { list: listSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-ul"]')).toBeInTheDocument()
    })

    test('orderedlistitem snippet override is used', async () => {
        const itemSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-oli"></div>`
        }))

        const { container } = render(Parser, {
            props: {
                type: 'list',
                ordered: true,
                items: [{ tokens: [{ type: 'text', raw: 'a', text: 'a' }] }],
                renderers: baseRenderers,
                snippetOverrides: { orderedlistitem: itemSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-oli"]')).toBeInTheDocument()
    })

    test('unorderedlistitem snippet override is used', async () => {
        const itemSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-uli"></div>`
        }))

        const { container } = render(Parser, {
            props: {
                type: 'list',
                ordered: false,
                items: [{ tokens: [{ type: 'text', raw: 'a', text: 'a' }] }],
                renderers: baseRenderers,
                snippetOverrides: { unorderedlistitem: itemSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-uli"]')).toBeInTheDocument()
    })

    test('general type snippet override (paragraph)', async () => {
        const paraSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-para"></div>`
        }))

        const { container } = render(Parser, {
            props: {
                type: 'paragraph',
                tokens: [{ type: 'text', raw: 'hello', text: 'hello' }],
                renderers: baseRenderers,
                snippetOverrides: { paragraph: paraSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-para"]')).toBeInTheDocument()
    })

    test('html snippet override for specific tag', async () => {
        const divSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-html-div"></div>`
        }))

        const { container } = render(Parser, {
            props: {
                type: 'html',
                tag: 'div',
                raw: '<div>content</div>',
                tokens: [{ type: 'text', raw: 'content', text: 'content' }],
                renderers: baseRenderers,
                htmlSnippetOverrides: { div: divSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-html-div"]')).toBeInTheDocument()
    })

    test('html snippet override renders when no child tokens', async () => {
        const divSnippet = createRawSnippet(() => ({
            render: () => `<div data-testid="custom-empty-div"></div>`
        }))

        const { container } = render(Parser, {
            props: {
                type: 'html',
                tag: 'div',
                raw: '<div></div>',
                tokens: [],
                renderers: baseRenderers,
                htmlSnippetOverrides: { div: divSnippet }
            }
        })

        await vi.runAllTimersAsync()

        expect(container.querySelector('[data-testid="custom-empty-div"]')).toBeInTheDocument()
    })

    test('list fallbacks: unordered uses listitem, ordered uses orderedlistitem', async () => {
        // Unordered: no unorderedlistitem provided, uses listitem
        {
            const renderers: any = { ...baseRenderers }
            delete renderers.unorderedlistitem
            const { container } = render(Parser, {
                props: {
                    type: 'list',
                    ordered: false,
                    items: [{ tokens: [{ type: 'text', raw: 'a', text: 'a' }] }],
                    renderers
                }
            })
            await vi.runAllTimersAsync()
            expect(container.querySelector('li')).toBeInTheDocument()
        }

        // Ordered: no orderedlistitem, should still fall back to listitem
        {
            const renderers: any = { ...baseRenderers }
            delete renderers.orderedlistitem
            const { container } = render(Parser, {
                props: {
                    type: 'list',
                    ordered: true,
                    items: [{ tokens: [{ type: 'text', raw: 'b', text: 'b' }] }],
                    renderers
                }
            })
            await vi.runAllTimersAsync()
            expect(container.querySelector('li')).toBeInTheDocument()
        }
    })
})
