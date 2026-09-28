import type { Token } from '$lib/utils/markdown-parser.js'
import { Lexer } from 'marked'
import { describe, expect, it } from 'vitest'
import {
    isSameStableNode,
    reuseStableTokenArray,
    type ReusableStreamingNode
} from './streaming-token-reuse.js'

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

describe('reuseStableTokenArray', () => {
    it('returns the next token array unchanged when no stable identity can be reused', () => {
        const previous = [token({ type: 'paragraph', raw: 'Old paragraph', text: 'Old paragraph' })]
        const next = [token({ type: 'paragraph', raw: 'New paragraph', text: 'New paragraph' })]

        const result = reuseStableTokenArray(previous, next, 0)

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

        const result = reuseStableTokenArray(previous, next, 2)

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

        const result = reuseStableTokenArray(
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

        const result = reuseStableTokenArray([previousList], [nextList], 0)
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

        const result = reuseStableTokenArray([previousTable], [nextTable], 0)
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

        const result = reuseStableTokenArray([previousHtml], next, 0)

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

        const result = reuseStableTokenArray([previousHtml], [nextHtml], 0)
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

        const result = reuseStableTokenArray([previousExtension], [nextExtension], 0)
        const resultExtension = node(result[0])

        expect(resultExtension).not.toBe(node(previousExtension))
        expect(resultExtension).not.toBe(node(nextExtension))
        expect(resultExtension.customChildren?.[0]).toBe(previousStableChild)
        expect(resultExtension.customChildren?.[1]).toBe(nextChangedChild)
    })
})

describe('isSameStableNode semantics', () => {
    const lex = (source: string): ReusableStreamingNode[] =>
        new Lexer({ gfm: true }).lex(source) as unknown as ReusableStreamingNode[]
    const firstRoot = (source: string): ReusableStreamingNode => lex(source)[0]
    const hand = (value: Record<string, unknown>): ReusableStreamingNode =>
        value as ReusableStreamingNode

    describe('returns false when a render-affecting field differs', () => {
        it('reference link href changes while the paragraph raw is identical', () => {
            const before = firstRoot('See [ref].\n\n[ref]: https://example.com/a')
            const after = firstRoot('See [ref].\n\n[ref]: https://example.com/abc')

            expect(after.raw).toBe(before.raw)
            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('reference link title appears while the paragraph raw is identical', () => {
            const before = firstRoot('See [ref].\n\n[ref]: /a')
            const after = firstRoot('See [ref].\n\n[ref]: /a "Title"')

            expect(after.raw).toBe(before.raw)
            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('reference image src changes while the paragraph raw is identical', () => {
            const before = firstRoot('![alt][img]\n\n[img]: /one.png')
            const after = firstRoot('![alt][img]\n\n[img]: /two.png')

            expect(after.raw).toBe(before.raw)
            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('heading depth differs with identical raw and text', () => {
            const tokens = [{ type: 'text', raw: 'Title', text: 'Title' }]
            const before = hand({ type: 'heading', raw: 'Title', text: 'Title', depth: 1, tokens })
            const after = hand({ type: 'heading', raw: 'Title', text: 'Title', depth: 2, tokens })

            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('list ordered/start differ with identical items', () => {
            const items = [{ type: 'list_item', raw: 'a', text: 'a', task: false, tokens: [] }]
            const before = hand({
                type: 'list',
                raw: 'a',
                ordered: false,
                start: '',
                loose: false,
                items
            })
            const after = hand({
                type: 'list',
                raw: 'a',
                ordered: true,
                start: 3,
                loose: false,
                items
            })

            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('task list item checked differs with identical raw', () => {
            const before = hand({
                type: 'list_item',
                raw: '- [ ] a',
                text: 'a',
                task: true,
                checked: false,
                tokens: []
            })
            const after = hand({
                type: 'list_item',
                raw: '- [ ] a',
                text: 'a',
                task: true,
                checked: true,
                tokens: []
            })

            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('code lang differs with identical raw and text', () => {
            const before = hand({ type: 'code', raw: '```\nx\n```', text: 'x', lang: 'js' })
            const after = hand({ type: 'code', raw: '```\nx\n```', text: 'x', lang: 'ts' })

            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('html attributes object differs with identical raw', () => {
            const before = hand({
                type: 'html',
                raw: '<div>',
                tag: 'div',
                attributes: { class: 'a' }
            })
            const after = hand({
                type: 'html',
                raw: '<div>',
                tag: 'div',
                attributes: { class: 'b' }
            })

            expect(isSameStableNode(before, after)).toBe(false)
        })

        it('extension scalar field differs with identical raw and text', () => {
            const before = hand({ type: 'blockKatex', raw: '$$x$$', text: 'x', displayMode: true })
            const after = hand({ type: 'blockKatex', raw: '$$x$$', text: 'x', displayMode: false })

            expect(isSameStableNode(before, after)).toBe(false)
        })
    })

    describe('is conservative on unknown or mismatched shapes', () => {
        const base = { type: 'custom', raw: 'x', text: 'x' }

        it.each([
            { name: 'distinct function fields', a: { render: () => 1 }, b: { render: () => 1 } },
            { name: 'the same function field', a: { render: String }, b: { render: String } },
            { name: 'distinct class instances', a: { meta: new Map() }, b: { meta: new Map() } },
            { name: 'null versus an object', a: { meta: null }, b: { meta: {} } },
            { name: 'an array versus an object', a: { meta: [] }, b: { meta: {} } },
            { name: 'a key present on one side only', a: { extra: 1 }, b: {} },
            {
                name: 'an align entry changing',
                a: { align: [null, 'left'] },
                b: { align: [null, null] }
            }
        ])('returns false for $name', ({ a, b }) => {
            expect(isSameStableNode(hand({ ...base, ...a }), hand({ ...base, ...b }))).toBe(false)
        })

        it('returns true for equal null-prototype data objects', () => {
            const attributes = (value: string) =>
                Object.assign(Object.create(null) as Record<string, unknown>, { class: value })

            expect(
                isSameStableNode(
                    hand({ ...base, attributes: attributes('a') }),
                    hand({ ...base, attributes: attributes('a') })
                )
            ).toBe(true)
        })
    })

    describe('returns true when nothing render-affecting differs', () => {
        it.each([
            { name: 'unaligned', source: '| A | B |\n| --- | --- |\n| 1 | 2 |' },
            {
                name: 'mixed alignment',
                source: '| A | B | C |\n| :-- | --- | --: |\n| 1 | 2 | 3 |'
            }
        ])('a $name table compared with its own re-parse', ({ source }) => {
            const before = firstRoot(source) as ReusableStreamingNode & { align?: unknown }
            const after = firstRoot(source)

            expect(before.type).toBe('table')
            expect(before.align).toEqual(
                source.includes(':--') ? ['left', null, 'right'] : [null, null]
            )
            expect(before).not.toBe(after)
            expect(isSameStableNode(before, after)).toBe(true)
        })

        it('the same object', () => {
            const token = firstRoot('Some **bold** text with [a link](/x "T").')

            expect(isSameStableNode(token, token)).toBe(true)
        })

        it('has no false diffs on the closed prefix of an append-only mixed document', () => {
            const blocks: string[] = []
            for (let section = 1; section <= 5; section++) {
                blocks.push(
                    `${'#'.repeat((section % 3) + 1)} Section ${section}`,
                    `Paragraph ${section} with **bold**, _em_, \`code\`, and [a link](https://example.com/${section} "Title ${section}").`,
                    `- item ${section}.1 with [ref${section}]\n- [x] done ${section}\n- [ ] todo ${section}`,
                    `| Left | None | Right |\n| :--- | ---- | ----: |\n| ${section} | two | three |`,
                    `\`\`\`ts\nconst value${section} = ${section}\n\`\`\``,
                    `[ref${section}]: https://example.com/ref/${section} "Ref ${section}"`
                )
            }
            const source = blocks.join('\n\n')
            const before = lex(source)
            const after = lex(`${source}\n\nAn appended paragraph.`)

            expect(before.length).toBeGreaterThanOrEqual(30)
            expect(new Set(before.map((root) => root.type))).toEqual(
                new Set(['heading', 'paragraph', 'list', 'table', 'code', 'space', 'def'])
            )
            for (let index = 0; index < before.length - 1; index++) {
                expect(before[index]).not.toBe(after[index])
                expect(
                    isSameStableNode(before[index], after[index]),
                    `root ${index} (${before[index].type})`
                ).toBe(true)
            }
        })

        it('two independent parses of identical prose', () => {
            const source = 'Some **bold**, *em*, `code`, and [a link](https://example.com "T").'
            const before = lex(source)
            const after = lex(source)

            expect(before).toHaveLength(after.length)
            before.forEach((beforeRoot, index) => {
                expect(beforeRoot).not.toBe(after[index])
                expect(isSameStableNode(beforeRoot, after[index])).toBe(true)
            })
        })
    })
})
