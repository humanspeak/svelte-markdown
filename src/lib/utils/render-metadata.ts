import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token, TokensList } from '$lib/utils/markdown-parser.js'
import Slugger from 'github-slugger'

type RenderMetadataNode = Record<string, unknown> & {
    raw?: string
    text?: string
    type?: string
    tokens?: unknown
    items?: unknown
    header?: unknown
    rows?: unknown
}

export interface RenderMetadata {
    prepareTokensForRender: (
        _tokens: Token[] | TokensList | undefined,
        _options: SvelteMarkdownOptions,
        _source?: string
    ) => Token[] | TokensList | undefined
    getPreparedHeadingId: (_node: unknown) => string | undefined
    getStableNodeKey: (_node: unknown, _index: number) => unknown
    getStableRowKey: (_row: unknown[] | undefined, _index: number) => unknown
}

export const RENDER_METADATA_CONTEXT = Symbol('svelte-markdown.renderMetadata')

const asNodeArray = (value: unknown): RenderMetadataNode[] | undefined =>
    Array.isArray(value) ? (value as RenderMetadataNode[]) : undefined

const getNodeSpanText = (node: RenderMetadataNode) => {
    if (typeof node.raw === 'string') return node.raw
    if (typeof node.text === 'string') return node.text
    return ''
}

export const createRenderMetadata = (): RenderMetadata => {
    const renderKeys = new WeakMap<object, unknown>()
    const headingIds = new WeakMap<object, string | undefined>()

    const setRenderKey = (node: object, value: unknown) => {
        renderKeys.set(node, value)
    }

    const getRenderKey = (node: unknown) =>
        typeof node === 'object' && node !== null ? renderKeys.get(node) : undefined

    const getStableNodeKey = (node: unknown, index: number): unknown => {
        const renderKey = getRenderKey(node)
        if (renderKey !== undefined) return renderKey

        if (typeof node === 'object' && node !== null) return node

        return `${index}:${String(node)}`
    }

    const assignSequentialSourceKeys = (
        nodes: RenderMetadataNode[] | undefined,
        source: string,
        absoluteOffset = 0
    ) => {
        if (!nodes) return

        let searchOffset = 0
        const zeroLengthCounts = new Map<number, number>()

        for (const node of nodes) {
            const spanText = getNodeSpanText(node)
            const relativeStart =
                spanText === ''
                    ? searchOffset
                    : source.indexOf(spanText, Math.min(searchOffset, source.length))
            const start = relativeStart >= 0 ? relativeStart : searchOffset
            const absoluteStart = absoluteOffset + start

            if (spanText === '') {
                const count = zeroLengthCounts.get(absoluteStart) ?? 0
                zeroLengthCounts.set(absoluteStart, count + 1)
                setRenderKey(node, `src:${absoluteStart}:zero:${count}`)
            } else {
                setRenderKey(node, `src:${absoluteStart}`)
                searchOffset = start + spanText.length
            }

            assignSourceKeysToChildren(node, spanText, absoluteStart)
        }
    }

    const assignRootFallbackKeys = (nodes: RenderMetadataNode[] | undefined) => {
        if (!nodes) return

        for (let index = 0; index < nodes.length; index++) {
            const node = nodes[index]
            if (getRenderKey(node) === undefined) {
                setRenderKey(node, `root:${index}:${node.type ?? 'token'}`)
            }
        }
    }

    const assignSourceKeysToRows = (
        rows: RenderMetadataNode[][] | undefined,
        source: string,
        absoluteOffset: number
    ) => {
        if (!rows) return

        let searchOffset = 0

        for (const row of rows) {
            if (row.length === 0) {
                setRenderKey(row, row)
                continue
            }

            const firstCellSpan = getNodeSpanText(row[0])
            const relativeStart =
                firstCellSpan === ''
                    ? searchOffset
                    : source.indexOf(firstCellSpan, Math.min(searchOffset, source.length))
            const rowStart = relativeStart >= 0 ? relativeStart : searchOffset

            assignSequentialSourceKeys(row, source.slice(rowStart), absoluteOffset + rowStart)
            setRenderKey(row, getStableNodeKey(row[0], 0))

            const lastCell = row[row.length - 1]
            const lastCellSpan = getNodeSpanText(lastCell)
            const lastCellKey = getStableNodeKey(lastCell, row.length - 1)
            const lastCellStart =
                typeof lastCellKey === 'string' && lastCellKey.startsWith('src:')
                    ? Number(lastCellKey.split(':')[1])
                    : absoluteOffset + rowStart
            searchOffset = Math.max(
                rowStart + 1,
                lastCellStart - absoluteOffset + lastCellSpan.length
            )
        }
    }

    const assignSourceKeysToChildren = (
        node: RenderMetadataNode,
        spanText: string,
        absoluteOffset: number
    ) => {
        assignSequentialSourceKeys(asNodeArray(node.tokens), spanText, absoluteOffset)
        assignSequentialSourceKeys(asNodeArray(node.items), spanText, absoluteOffset)
        assignSequentialSourceKeys(asNodeArray(node.header), spanText, absoluteOffset)
        assignSourceKeysToRows(
            asNodeArray(node.rows) as RenderMetadataNode[][] | undefined,
            spanText,
            absoluteOffset
        )
    }

    const assignHeadingIds = (
        nodes: RenderMetadataNode[] | undefined,
        options: SvelteMarkdownOptions,
        slugger: Slugger
    ) => {
        if (!nodes) return

        for (const node of nodes) {
            if (node.type === 'heading') {
                headingIds.set(
                    node,
                    options.headerIds && typeof node.text === 'string'
                        ? `${options.headerPrefix}${slugger.slug(node.text)}`
                        : undefined
                )
            }

            assignHeadingIds(asNodeArray(node.tokens), options, slugger)
            assignHeadingIds(asNodeArray(node.items), options, slugger)
            assignHeadingIds(asNodeArray(node.header), options, slugger)
            for (const row of asNodeArray(node.rows) ?? []) {
                assignHeadingIds(asNodeArray(row), options, slugger)
            }
        }
    }

    return {
        prepareTokensForRender: (
            tokens: Token[] | TokensList | undefined,
            options: SvelteMarkdownOptions,
            source?: string
        ): Token[] | TokensList | undefined => {
            if (!tokens) return tokens

            const renderNodes = tokens as RenderMetadataNode[]

            if (source !== undefined) {
                assignSequentialSourceKeys(renderNodes, source)
            } else {
                assignRootFallbackKeys(renderNodes)
            }

            assignHeadingIds(renderNodes, options, new Slugger())

            return tokens
        },
        getPreparedHeadingId: (node: unknown): string | undefined =>
            typeof node === 'object' && node !== null ? headingIds.get(node) : undefined,
        getStableNodeKey,
        getStableRowKey: (row: unknown[] | undefined, index: number): unknown => {
            const renderKey = getRenderKey(row)
            if (renderKey !== undefined) return renderKey

            if (row && row.length > 0) return getStableNodeKey(row[0], index)
            if (row) return row

            return index
        }
    }
}
