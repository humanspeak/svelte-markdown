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
            // reuseStableNodeArray only returns undefined when nextRows[index]
            // is undefined, which the `!== nextRows[index]` guard above rules
            // out, so reusedRow is always a defined array here.
            reusedRows[index] = reusedRow as T[]
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

    // Only reassign the child arrays that actually changed, so we never stamp
    // an `undefined` key onto a node that never had one (a changed array is
    // always defined). Copying once and mutating avoids the throwaway object
    // literals a conditional spread would allocate.
    const merged = { ...nextNode }
    if (tokens !== nextNode.tokens) merged.tokens = tokens
    if (items !== nextNode.items) merged.items = items
    if (header !== nextNode.header) merged.header = header
    if (rows !== nextNode.rows) merged.rows = rows
    return merged
}

export const reuseStableStreamingTokens = (
    previousTokens: Token[],
    nextTokens: Token[],
    divergeAt: number
): Token[] => {
    const reuseCount = Math.min(divergeAt, previousTokens.length, nextTokens.length)

    // Indices [0, reuseCount) are byte-identical, so reuse the previous token
    // objects to preserve Svelte component identity. Build the result in a
    // single pass (reused prefix + fresh tail) rather than copying the whole
    // next array and then overwriting the prefix.
    let reusedTokens: Token[] | undefined =
        reuseCount > 0
            ? previousTokens.slice(0, reuseCount).concat(nextTokens.slice(reuseCount))
            : undefined

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
