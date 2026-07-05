import type { Token } from '$lib/utils/markdown-parser.js'

type ReusableStreamingNode = Record<string, unknown> & {
    raw?: string
    text?: string
    type?: string
    tokens?: ReusableStreamingNode[]
    items?: ReusableStreamingNode[]
    header?: ReusableStreamingNode[]
    rows?: ReusableStreamingNode[][]
}

const hasSameStableNodeIdentity = (
    previousNode: ReusableStreamingNode,
    nextNode: ReusableStreamingNode
) => {
    if (previousNode.type !== nextNode.type) return false

    if (previousNode.type === 'html') {
        if ((previousNode.tokens === undefined) !== (nextNode.tokens === undefined)) return false
        if (previousNode.tokens && nextNode.tokens) {
            if (previousNode.tokens.length !== nextNode.tokens.length) return false
        }
    }

    if (typeof previousNode.raw === 'string' || typeof nextNode.raw === 'string') {
        return previousNode.raw === nextNode.raw
    }

    if (typeof previousNode.text === 'string' || typeof nextNode.text === 'string') {
        return previousNode.text === nextNode.text
    }

    return false
}

const reuseStableNodeArray = <T extends ReusableStreamingNode>(
    previousNodes: T[] | undefined,
    nextNodes: T[] | undefined
): T[] | undefined => {
    if (!previousNodes || !nextNodes) return nextNodes

    const limit = Math.min(previousNodes.length, nextNodes.length)
    let reusedNodes: T[] | undefined

    for (let index = 0; index < limit; index++) {
        const reusedNode = reuseStableNode(previousNodes[index], nextNodes[index])
        if (reusedNode !== nextNodes[index]) {
            reusedNodes ??= nextNodes.slice()
            reusedNodes[index] = reusedNode
        }
    }

    return reusedNodes ?? nextNodes
}

const reuseStableNodeRows = <T extends ReusableStreamingNode>(
    previousRows: T[][] | undefined,
    nextRows: T[][] | undefined
): T[][] | undefined => {
    if (!previousRows || !nextRows) return nextRows

    const limit = Math.min(previousRows.length, nextRows.length)
    let reusedRows: T[][] | undefined

    for (let index = 0; index < limit; index++) {
        const reusedRow = reuseStableNodeArray(previousRows[index], nextRows[index])
        if (reusedRow !== nextRows[index]) {
            reusedRows ??= nextRows.slice()
            reusedRows[index] = reusedRow ?? nextRows[index]
        }
    }

    return reusedRows ?? nextRows
}

const reuseStableNode = <T extends ReusableStreamingNode>(previousNode: T, nextNode: T): T => {
    if (hasSameStableNodeIdentity(previousNode, nextNode)) return previousNode

    const tokens = reuseStableNodeArray(previousNode.tokens, nextNode.tokens)
    const items = reuseStableNodeArray(previousNode.items, nextNode.items)
    const header = reuseStableNodeArray(previousNode.header, nextNode.header)
    const rows = reuseStableNodeRows(previousNode.rows, nextNode.rows)

    if (
        tokens === nextNode.tokens &&
        items === nextNode.items &&
        header === nextNode.header &&
        rows === nextNode.rows
    ) {
        return nextNode
    }

    return {
        ...nextNode,
        ...(tokens !== nextNode.tokens ? { tokens } : {}),
        ...(items !== nextNode.items ? { items } : {}),
        ...(header !== nextNode.header ? { header } : {}),
        ...(rows !== nextNode.rows ? { rows } : {})
    }
}

export const reuseStableStreamingTokens = (
    previousTokens: Token[],
    nextTokens: Token[],
    divergeAt: number
): Token[] => {
    const reuseCount = Math.min(divergeAt, previousTokens.length, nextTokens.length)
    let reusedTokens: Token[] | undefined

    for (let index = 0; index < reuseCount; index++) {
        reusedTokens ??= nextTokens.slice()
        reusedTokens[index] = previousTokens[index]
    }

    const tailIndex = reuseCount
    if (tailIndex < previousTokens.length && tailIndex < nextTokens.length) {
        const tailToken = reuseStableNode(
            previousTokens[tailIndex] as ReusableStreamingNode,
            nextTokens[tailIndex] as ReusableStreamingNode
        ) as Token

        if (tailToken !== nextTokens[tailIndex]) {
            reusedTokens ??= nextTokens.slice()
            reusedTokens[tailIndex] = tailToken
        }
    }

    return reusedTokens ?? nextTokens
}
