import type { Token } from '$lib/utils/markdown-parser.js'
import { describe, expect, it } from 'vitest'
import { reuseStableStreamingTokens } from './streaming-token-reuse.js'

type StreamingTestNode = Record<string, unknown> & {
    type?: string
    raw?: string
    text?: string
    tokens?: StreamingTestNode[]
    items?: StreamingTestNode[]
    header?: StreamingTestNode[]
    rows?: StreamingTestNode[][]
    customChildren?: StreamingTestNode[]
}

const token = (node: StreamingTestNode): Token => node as Token
const node = (tokenValue: Token): StreamingTestNode => tokenValue as unknown as StreamingTestNode

describe('reuseStableStreamingTokens', () => {
    it('returns the next token array unchanged when no stable identity can be reused', () => {
        const previous = [token({ type: 'paragraph', raw: 'Old paragraph', text: 'Old paragraph' })]
        const next = [token({ type: 'paragraph', raw: 'New paragraph', text: 'New paragraph' })]

        const result = reuseStableStreamingTokens(previous, next, 0)

        expect(result).toBe(next)
        expect(result[0]).toBe(next[0])
    })

    it('reuses previous token objects before divergeAt while preserving changed tail tokens', () => {
        const previousHeading = token({ type: 'heading', raw: '# Stable', text: 'Stable' })
        const previousSpace = token({ type: 'space', raw: '\n\n' })
        const previousParagraph = token({
            type: 'paragraph',
            raw: 'Old tail',
            text: 'Old tail'
        })
        const nextHeading = token({ type: 'heading', raw: '# Stable', text: 'Stable' })
        const nextSpace = token({ type: 'space', raw: '\n\n' })
        const nextParagraph = token({ type: 'paragraph', raw: 'New tail', text: 'New tail' })
        const appendedParagraph = token({
            type: 'paragraph',
            raw: 'Appended',
            text: 'Appended'
        })
        const previous = [previousHeading, previousSpace, previousParagraph]
        const next = [nextHeading, nextSpace, nextParagraph, appendedParagraph]

        const result = reuseStableStreamingTokens(previous, next, 2)

        expect(result).not.toBe(next)
        expect(result[0]).toBe(previousHeading)
        expect(result[1]).toBe(previousSpace)
        expect(result[2]).toBe(nextParagraph)
        expect(result[3]).toBe(appendedParagraph)
        expect(next[0]).toBe(nextHeading)
        expect(next[1]).toBe(nextSpace)
    })

    it('clamps divergeAt to the shared token range', () => {
        const previousHeading = token({ type: 'heading', raw: '# Stable', text: 'Stable' })
        const previousParagraph = token({ type: 'paragraph', raw: 'Removed', text: 'Removed' })
        const nextHeading = token({ type: 'heading', raw: '# Stable', text: 'Stable' })

        const result = reuseStableStreamingTokens(
            [previousHeading, previousParagraph],
            [nextHeading],
            99
        )

        expect(result).toHaveLength(1)
        expect(result[0]).toBe(previousHeading)
    })

    it('reuses stable list items and nested inline tokens inside a diverged list token', () => {
        const previousFirstItem = {
            type: 'list_item',
            raw: '- One\n',
            text: 'One',
            tokens: [{ type: 'text', raw: 'One', text: 'One' }]
        }
        const previousSecondText = { type: 'text', raw: 'Two', text: 'Two' }
        const previousSecondItem = {
            type: 'list_item',
            raw: '- Two',
            text: 'Two',
            tokens: [previousSecondText]
        }
        const nextFirstItem = {
            type: 'list_item',
            raw: '- One\n',
            text: 'One',
            tokens: [{ type: 'text', raw: 'One', text: 'One' }]
        }
        const nextSecondText = { type: 'text', raw: 'Two', text: 'Two' }
        const nextSecondItem = {
            type: 'list_item',
            raw: '- Two\n',
            text: 'Two',
            tokens: [nextSecondText]
        }
        const nextThirdItem = {
            type: 'list_item',
            raw: '- Three',
            text: 'Three',
            tokens: [{ type: 'text', raw: 'Three', text: 'Three' }]
        }
        const previousList = token({
            type: 'list',
            raw: '- One\n- Two',
            items: [previousFirstItem, previousSecondItem]
        })
        const nextList = token({
            type: 'list',
            raw: '- One\n- Two\n- Three',
            items: [nextFirstItem, nextSecondItem, nextThirdItem]
        })

        const result = reuseStableStreamingTokens([previousList], [nextList], 0)
        const resultList = node(result[0])
        const nextListNode = node(nextList)

        expect(resultList).not.toBe(node(previousList))
        expect(resultList).not.toBe(nextListNode)
        expect(resultList.items).not.toBe(nextListNode.items)
        expect(resultList.items).toHaveLength(3)
        expect(resultList.items?.[0]).toBe(previousFirstItem)
        expect(resultList.items?.[1]).not.toBe(previousSecondItem)
        expect(resultList.items?.[1]).not.toBe(nextSecondItem)
        expect(resultList.items?.[1]?.tokens?.[0]).toBe(previousSecondText)
        expect(resultList.items?.[2]).toBe(nextThirdItem)
        expect(nextListNode.items?.[0]).toBe(nextFirstItem)
        expect(nextListNode.items?.[1]?.tokens?.[0]).toBe(nextSecondText)
    })

    it('reuses stable table header cells and existing body rows inside a diverged table token', () => {
        const previousHeaderA = { text: 'A', tokens: [{ type: 'text', raw: 'A', text: 'A' }] }
        const previousHeaderB = { text: 'B', tokens: [{ type: 'text', raw: 'B', text: 'B' }] }
        const previousCell1 = { text: '1', tokens: [{ type: 'text', raw: '1', text: '1' }] }
        const previousCell2 = { text: '2', tokens: [{ type: 'text', raw: '2', text: '2' }] }
        const nextHeaderA = { text: 'A', tokens: [{ type: 'text', raw: 'A', text: 'A' }] }
        const nextHeaderB = { text: 'B', tokens: [{ type: 'text', raw: 'B', text: 'B' }] }
        const nextCell1 = { text: '1', tokens: [{ type: 'text', raw: '1', text: '1' }] }
        const nextCell2 = { text: '2', tokens: [{ type: 'text', raw: '2', text: '2' }] }
        const nextRow2 = [
            { text: '3', tokens: [{ type: 'text', raw: '3', text: '3' }] },
            { text: '4', tokens: [{ type: 'text', raw: '4', text: '4' }] }
        ]
        const nextRows = [[nextCell1, nextCell2], nextRow2]
        const previousTable = token({
            type: 'table',
            raw: '| A | B |\n|---|---|\n| 1 | 2 |',
            header: [previousHeaderA, previousHeaderB],
            rows: [[previousCell1, previousCell2]]
        })
        const nextTable = token({
            type: 'table',
            raw: '| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |',
            header: [nextHeaderA, nextHeaderB],
            rows: nextRows
        })

        const result = reuseStableStreamingTokens([previousTable], [nextTable], 0)
        const resultTable = node(result[0])

        expect(resultTable).not.toBe(node(previousTable))
        expect(resultTable).not.toBe(node(nextTable))
        expect(resultTable.header).not.toBe(node(nextTable).header)
        expect(resultTable.rows).not.toBe(nextRows)
        expect(resultTable.header?.[0]).toBe(previousHeaderA)
        expect(resultTable.header?.[1]).toBe(previousHeaderB)
        expect(resultTable.rows?.[0]).not.toBe(nextRows[0])
        expect(resultTable.rows?.[0]?.[0]).toBe(previousCell1)
        expect(resultTable.rows?.[0]?.[1]).toBe(previousCell2)
        expect(resultTable.rows?.[1]).toBe(nextRow2)
    })

    it('does not reuse an HTML token when child tokens appear after streaming closure', () => {
        const previousHtml = token({ type: 'html', raw: '<div>', tag: 'div' })
        const nextHtml = token({
            type: 'html',
            raw: '<div>',
            tag: 'div',
            tokens: [{ type: 'text', raw: 'inside', text: 'inside' }]
        })
        const next = [nextHtml]

        const result = reuseStableStreamingTokens([previousHtml], next, 0)

        expect(result).toBe(next)
        expect(result[0]).toBe(nextHtml)
    })

    it('does not reuse a stale HTML parent when child counts differ, but still reuses stable children', () => {
        const previousChild = { type: 'text', raw: 'one', text: 'one' }
        const nextChild = { type: 'text', raw: 'one', text: 'one' }
        const addedChild = { type: 'text', raw: 'two', text: 'two' }
        const previousHtml = token({
            type: 'html',
            raw: '<div>',
            tag: 'div',
            tokens: [previousChild]
        })
        const nextHtml = token({
            type: 'html',
            raw: '<div>',
            tag: 'div',
            tokens: [nextChild, addedChild]
        })

        const result = reuseStableStreamingTokens([previousHtml], [nextHtml], 0)
        const resultHtml = node(result[0])

        expect(resultHtml).not.toBe(node(previousHtml))
        expect(resultHtml).not.toBe(node(nextHtml))
        expect(resultHtml.tokens).toHaveLength(2)
        expect(resultHtml.tokens?.[0]).toBe(previousChild)
        expect(resultHtml.tokens?.[1]).toBe(addedChild)
        expect(node(nextHtml).tokens?.[0]).toBe(nextChild)
    })

    it('does not over-reuse a token when a child under a custom key changes', () => {
        const previousStableChild = { type: 'text', raw: 'stable', text: 'stable' }
        const previousChangedChild = { type: 'text', raw: 'old', text: 'old' }
        const nextStableChild = { type: 'text', raw: 'stable', text: 'stable' }
        const nextChangedChild = { type: 'text', raw: 'new', text: 'new' }
        const previousExtension = token({
            type: 'extension',
            raw: 'extension',
            customChildren: [previousStableChild, previousChangedChild]
        })
        const nextExtension = token({
            type: 'extension',
            raw: 'extension',
            customChildren: [nextStableChild, nextChangedChild]
        })

        const result = reuseStableStreamingTokens([previousExtension], [nextExtension], 0)
        const resultExtension = node(result[0])

        expect(resultExtension).not.toBe(node(previousExtension))
        expect(resultExtension).not.toBe(node(nextExtension))
        expect(resultExtension.customChildren?.[0]).toBe(previousStableChild)
        expect(resultExtension.customChildren?.[1]).toBe(nextChangedChild)
    })
})
