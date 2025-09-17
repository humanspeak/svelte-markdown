import '@testing-library/jest-dom'
import { render } from '@testing-library/svelte'
import { describe, expect, test, vi } from 'vitest'
import Parser from './Parser.svelte'

// Minimal fake renderers to exercise branches
const baseRenderers = {
    paragraph: (await import('./renderers/Paragraph.svelte')).default,
    text: (await import('./renderers/Text.svelte')).default,
    rawtext: (await import('./renderers/RawText.svelte')).default,
    list: (await import('./renderers/List.svelte')).default,
    listitem: (await import('./renderers/ListItem.svelte')).default,
    orderedlistitem: (await import('./renderers/ListItem.svelte')).default,
    table: (await import('./renderers/Table.svelte')).default,
    tablehead: (await import('./renderers/TableHead.svelte')).default,
    tablebody: (await import('./renderers/TableBody.svelte')).default,
    tablerow: (await import('./renderers/TableRow.svelte')).default,
    tablecell: (await import('./renderers/TableCell.svelte')).default,
    html: (await import('./renderers/html/index.ts')).default
} as const

describe('Parser branch coverage', () => {
    test('table renders without head/body when components are missing', async () => {
        const renderers = { ...baseRenderers }
        // Remove head/body to hit falsy branches
        // @ts-expect-error intentionally removing keys for branch coverage
        delete (renderers as any).tablehead
        // @ts-expect-error intentionally removing keys for branch coverage
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
