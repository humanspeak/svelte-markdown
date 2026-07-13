import type { Token } from '$lib/utils/markdown-parser.js'

export type ReusableStreamingNode = {
    raw?: string
    text?: string
    type?: string
}

type ReusableStreamingNodeArray = Array<ReusableStreamingNode | ReusableStreamingNodeArray>

const isReusableStreamingNode = (value: unknown): value is ReusableStreamingNode =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const isReusableStreamingNodeArray = (value: unknown): value is ReusableStreamingNodeArray =>
    Array.isArray(value) &&
    value.every((item) =>
        Array.isArray(item) ? isReusableStreamingNodeArray(item) : isReusableStreamingNode(item)
    )

const haveSameStableArrayIdentity = (
    previousArray: ReusableStreamingNodeArray,
    nextArray: ReusableStreamingNodeArray
): boolean => {
    if (previousArray.length !== nextArray.length) return false

    return previousArray.every((previousItem, index) => {
        const nextItem = nextArray[index]
        if (Array.isArray(previousItem) || Array.isArray(nextItem)) {
            return (
                Array.isArray(previousItem) &&
                Array.isArray(nextItem) &&
                haveSameStableArrayIdentity(previousItem, nextItem)
            )
        }

        return isSameStableNode(previousItem, nextItem)
    })
}

const haveSameStableChildIdentity = (
    previousNode: ReusableStreamingNode,
    nextNode: ReusableStreamingNode
): boolean => {
    const keys = new Set([...Object.keys(previousNode), ...Object.keys(nextNode)])
    const previousRecord = previousNode as Record<string, unknown>
    const nextRecord = nextNode as Record<string, unknown>

    for (const key of keys) {
        const previousValue = previousRecord[key]
        const nextValue = nextRecord[key]
        const previousIsChildArray = isReusableStreamingNodeArray(previousValue)
        const nextIsChildArray = isReusableStreamingNodeArray(nextValue)

        if (!previousIsChildArray && !nextIsChildArray) continue
        if (!previousIsChildArray || !nextIsChildArray) return false
        if (!haveSameStableArrayIdentity(previousValue, nextValue)) return false
    }

    return true
}

/** Returns whether two nodes and every nested token array have one stable identity. */
export const isSameStableNode = (
    previousNode: ReusableStreamingNode,
    nextNode: ReusableStreamingNode
): boolean => {
    if (previousNode.type !== nextNode.type) return false

    if (typeof previousNode.raw === 'string' || typeof nextNode.raw === 'string') {
        if (previousNode.raw !== nextNode.raw) return false
    } else if (typeof previousNode.text === 'string' || typeof nextNode.text === 'string') {
        if (previousNode.text !== nextNode.text) return false
    } else {
        return false
    }

    return haveSameStableChildIdentity(previousNode, nextNode)
}

const reuseStableNodeArray = (
    previousArray: ReusableStreamingNodeArray,
    nextArray: ReusableStreamingNodeArray
): ReusableStreamingNodeArray => {
    const limit = Math.min(previousArray.length, nextArray.length)
    let reusedArray: ReusableStreamingNodeArray | undefined

    for (let index = 0; index < limit; index++) {
        const previousItem = previousArray[index]
        const nextItem = nextArray[index]
        let reusedItem = nextItem

        if (Array.isArray(previousItem) && Array.isArray(nextItem)) {
            reusedItem = reuseStableNodeArray(previousItem, nextItem)
        } else if (isReusableStreamingNode(previousItem) && isReusableStreamingNode(nextItem)) {
            reusedItem = reuseStableNode(previousItem, nextItem)
        }

        if (reusedItem !== nextItem) {
            reusedArray ??= nextArray.slice()
            reusedArray[index] = reusedItem
        }
    }

    return reusedArray ?? nextArray
}

const reuseStableNode = (
    previousNode: ReusableStreamingNode,
    nextNode: ReusableStreamingNode
): ReusableStreamingNode => {
    if (isSameStableNode(previousNode, nextNode)) return previousNode

    let mergedNode: ReusableStreamingNode | undefined
    const previousRecord = previousNode as Record<string, unknown>
    const nextRecord = nextNode as Record<string, unknown>
    for (const key of Object.keys(nextNode)) {
        const previousValue = previousRecord[key]
        const nextValue = nextRecord[key]
        if (
            !isReusableStreamingNodeArray(previousValue) ||
            !isReusableStreamingNodeArray(nextValue)
        ) {
            continue
        }

        const reusedValue = reuseStableNodeArray(previousValue, nextValue)
        if (reusedValue !== nextValue) {
            mergedNode ??= { ...nextNode }
            const mergedRecord = mergedNode as Record<string, unknown>
            mergedRecord[key] = reusedValue
        }
    }

    return mergedNode ?? nextNode
}

/**
 * Reuses stable token objects from a previous streaming parse to preserve
 * component identity across incremental updates.
 */
export const reuseStableTokenArray = (
    previousTokens: Token[],
    nextTokens: Token[],
    divergeAt: number
): Token[] => {
    const reuseCount = Math.min(divergeAt, previousTokens.length, nextTokens.length)
    let reusedTokens: Token[] | undefined

    if (reuseCount > 0) {
        reusedTokens = new Array<Token>(nextTokens.length)

        for (let index = 0; index < reuseCount; index++) {
            reusedTokens[index] = previousTokens[index]
        }

        for (let index = reuseCount; index < nextTokens.length; index++) {
            reusedTokens[index] = nextTokens[index]
        }
    }

    if (reuseCount < previousTokens.length && reuseCount < nextTokens.length) {
        const reusedToken = reuseStableNode(
            previousTokens[reuseCount] as ReusableStreamingNode,
            nextTokens[reuseCount] as ReusableStreamingNode
        ) as Token

        if (reusedToken !== nextTokens[reuseCount]) {
            reusedTokens ??= nextTokens.slice()
            reusedTokens[reuseCount] = reusedToken
        }
    }

    return reusedTokens ?? nextTokens
}
