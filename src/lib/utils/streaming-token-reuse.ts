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

const hasPlainPrototype = (value: object): boolean => {
    const prototype = Object.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
}

/** Element-wise comparison; elements may be primitives, `null`, arrays, or objects. */
const areArraysSemanticallyEqual = (a: unknown[], b: unknown[]): boolean => {
    if (a.length !== b.length) return false
    for (let index = 0; index < a.length; index++) {
        if (!isSemanticallyEqual(a[index], b[index])) return false
    }
    return true
}

/** Own enumerable keys of both records; skips the union allocation when they match. */
const getComparedKeys = (
    previousRecord: Record<string, unknown>,
    nextRecord: Record<string, unknown>
): Iterable<string> => {
    const previousKeys = Object.keys(previousRecord)
    const nextKeys = Object.keys(nextRecord)
    const sameKeys =
        previousKeys.length === nextKeys.length &&
        previousKeys.every((key, index) => key === nextKeys[index])
    return sameKeys ? previousKeys : new Set([...previousKeys, ...nextKeys])
}

/** Field-by-field comparison of two plain records (tokens or data objects). */
const areRecordsSemanticallyEqual = (
    previousRecord: Record<string, unknown>,
    nextRecord: Record<string, unknown>
): boolean => {
    // Cheap discriminators first: most real mismatches differ in type or raw.
    if (previousRecord.type !== nextRecord.type) return false
    if (previousRecord.raw !== nextRecord.raw) return false
    if (previousRecord.text !== nextRecord.text) return false

    for (const key of getComparedKeys(previousRecord, nextRecord)) {
        const previousValue = previousRecord[key]
        const nextValue = nextRecord[key]
        // Unknown callable state can never be assumed render-equivalent.
        if (typeof previousValue === 'function' || typeof nextValue === 'function') return false
        if (!isSemanticallyEqual(previousValue, nextValue)) return false
    }
    return true
}

/**
 * Recursively compares two token values by every own enumerable field.
 *
 * Handles every shape a token field can take: primitives, `null`, arrays of
 * mixed primitives/`null`/objects (e.g. a table's `align`), nested token
 * arrays, and plain data objects (e.g. an html token's `attributes`). Array
 * elements are never assumed to be objects.
 *
 * @param a - Previous value.
 * @param b - Next value.
 * @returns `true` only when both values are provably render-equivalent.
 */
const isSemanticallyEqual = (a: unknown, b: unknown): boolean => {
    // Same-object fast path: sound for a pure comparator, and it lets reused
    // prefix objects short-circuit without a deep walk every frame.
    if (a === b) return true
    // Distinct primitives, and distinct functions, are never equal.
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false

    const previousIsArray = Array.isArray(a)
    if (previousIsArray !== Array.isArray(b)) return false
    if (previousIsArray) return areArraysSemanticallyEqual(a as unknown[], b as unknown[])

    // Class instances (Map, Set, Date, ...) may hold state that is not an own
    // enumerable key; conservatively treat distinct instances as unequal.
    if (!hasPlainPrototype(a) || !hasPlainPrototype(b)) return false

    return areRecordsSemanticallyEqual(a as Record<string, unknown>, b as Record<string, unknown>)
}

/**
 * Returns whether a previously rendered token can stand in for a freshly
 * parsed one.
 *
 * Contract: equal iff a renderer given either object would produce identical
 * output; conservative on unknowns. Every own enumerable field is compared —
 * `type`, `raw`, `text`, nested token arrays, and every scalar or data field
 * (link `href`/`title`, heading `depth`, list `ordered`/`start`/`loose`, item
 * `task`/`checked`, table `align`, code `lang`, html `tag`/`attributes`, and
 * extension fields such as `displayMode`). Function-valued fields and class
 * instances are never considered equal unless they are the same object.
 * The same object is always equal to itself (fast path).
 *
 * Do not weaken this for speed: callers widen token reuse on the strength of
 * this contract.
 *
 * @param previousNode - Token from the previous streaming parse.
 * @param nextNode - Token from the current parse.
 * @returns `true` when `previousNode` may be reused in place of `nextNode`.
 * @example
 * ```ts
 * isSameStableNode(
 *     { type: 'code', raw: '```\nx\n```', text: 'x', lang: 'js' },
 *     { type: 'code', raw: '```\nx\n```', text: 'x', lang: 'ts' }
 * ) // false — `lang` changes the rendered output
 * ```
 */
export const isSameStableNode = (
    previousNode: ReusableStreamingNode,
    nextNode: ReusableStreamingNode
): boolean => {
    if (previousNode === nextNode) return true
    return isSemanticallyEqual(previousNode, nextNode)
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

/**
 * Reuses semantically unchanged token objects across the WHOLE array,
 * index-aligned, for updates where no stable prefix is known — e.g. an
 * appended reference definition that can change inline children of any root
 * without changing its `raw`.
 *
 * Each root is compared with {@link isSameStableNode}: an equal root keeps the
 * previous object (so its component receives no new props); an unequal root
 * becomes a new object whose unchanged nested token arrays and children are
 * still reused. When the arrays differ in length, only the shared index range
 * is compared and extra next tokens are kept as-is.
 *
 * @param previousTokens - Token array from the previous streaming parse.
 * @param nextTokens - Freshly parsed token array for the current source.
 * @returns `nextTokens` itself when nothing could be reused, otherwise a new
 *   array mixing reused previous objects and fresh tokens.
 * @example
 * ```ts
 * // `[1]: /x` appended: only the paragraph citing `[1]` becomes a new object
 * streamTokens = reuseStableTokenTree(streamTokens, parser.update(source).tokens)
 * ```
 */
export const reuseStableTokenTree = (previousTokens: Token[], nextTokens: Token[]): Token[] =>
    reuseStableNodeArray(
        previousTokens as ReusableStreamingNodeArray,
        nextTokens as ReusableStreamingNodeArray
    ) as Token[]
