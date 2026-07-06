import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token, TokensList } from '$lib/utils/markdown-parser.js'
import Slugger from 'github-slugger'

/**
 * Per-SvelteMarkdown-instance render metadata.
 *
 * Stable render keys and precomputed heading ids are renderer concerns, not
 * markdown-token data, so they live in WeakMaps keyed by token objects. This
 * keeps caller-provided token arrays unmodified, avoids public property
 * collisions, and lets multiple SvelteMarkdown instances render concurrently
 * without sharing slug or key state.
 *
 * Source-backed renders use source offsets for keys. Append-only streaming can
 * skip the stable top-level prefix by passing the parser's `divergeAt` and
 * `divergeOffset`; reused-prefix tokens already have WeakMap keys from the
 * previous render pass. Pre-parsed token arrays have no source offsets, so
 * root tokens use object-based fallback keys. If a caller recreates a root
 * wrapper while reusing nested token objects, the wrapper inherits its prior
 * key from that nested identity; otherwise root and nested tokens both fall
 * through to object identity.
 *
 * Heading ids are recomputed in document order every pass because duplicate
 * heading slugs are global across nesting boundaries. That walk is intentional:
 * it resets slugger state for the render pass before any Heading component
 * renders.
 */
type RenderMetadataNode = Record<string, unknown> & {
    raw?: string
    sourceLength?: number
    text?: string
    type?: string
    tokens?: unknown
    items?: unknown
    header?: unknown
    rows?: unknown
}

interface SourceLessRootRecord {
    key: unknown
    identities: Set<object>
    type?: string
}

export interface RenderPreparation {
    source?: string
    startIndex?: number
    startOffset?: number
}

export interface RenderMetadata {
    prepareTokensForRender: (
        _tokens: Token[] | TokensList | undefined,
        _options: SvelteMarkdownOptions,
        _preparation?: RenderPreparation
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

const getNodeSourceLength = (node: RenderMetadataNode) => {
    if (typeof node.sourceLength === 'number') return node.sourceLength
    return getNodeSpanText(node).length
}

export const createRenderMetadata = (): RenderMetadata => {
    const renderKeys = new WeakMap<object, unknown>()
    const headingIds = new WeakMap<object, string | undefined>()
    let preparedHeadingNodes: RenderMetadataNode[] = []
    let previousSourceLessRoots: SourceLessRootRecord[] = []

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

    const getSourceOffset = (node: RenderMetadataNode): number | undefined => {
        const renderKey = getRenderKey(node)
        if (typeof renderKey !== 'string' || !renderKey.startsWith('src:')) return undefined

        const offset = Number(renderKey.split(':')[1])
        return Number.isFinite(offset) ? offset : undefined
    }

    const assignSequentialSourceKeys = (
        nodes: RenderMetadataNode[] | undefined,
        absoluteOffset = 0,
        startIndex = 0,
        startOffset = 0
    ) => {
        if (!nodes) return

        let cursor = startOffset

        for (let index = startIndex; index < nodes.length; index++) {
            const node = nodes[index]
            const spanLength = getNodeSourceLength(node)
            const nodeOffset = absoluteOffset + cursor

            if (spanLength === 0) {
                setRenderKey(node, `src:${nodeOffset}:zero:${index}`)
            } else {
                setRenderKey(node, `src:${nodeOffset}`)
            }

            assignSourceKeysToChildren(node, nodeOffset)
            cursor += spanLength
        }
    }

    const collectSourceLessIdentities = (value: unknown, identities = new Set<object>()) => {
        if (typeof value !== 'object' || value === null) return identities

        identities.add(value)

        if (Array.isArray(value)) {
            for (const item of value) {
                collectSourceLessIdentities(item, identities)
            }
            return identities
        }

        const node = value as RenderMetadataNode
        collectSourceLessIdentities(node.tokens, identities)
        collectSourceLessIdentities(node.items, identities)
        collectSourceLessIdentities(node.header, identities)
        collectSourceLessIdentities(node.rows, identities)

        return identities
    }

    const countIdentityOverlap = (a: Set<object>, b: Set<object>) => {
        let count = 0
        const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a]

        for (const identity of smaller) {
            if (larger.has(identity)) count++
        }

        return count
    }

    const findPreviousSourceLessRoot = (
        node: RenderMetadataNode,
        identities: Set<object>,
        usedPreviousRoots: Set<number>
    ) => {
        let bestIndex = -1
        let bestScore = 0

        for (let index = 0; index < previousSourceLessRoots.length; index++) {
            if (usedPreviousRoots.has(index)) continue

            const previous = previousSourceLessRoots[index]
            if (previous.type !== node.type) continue

            const score = countIdentityOverlap(identities, previous.identities)
            if (score > bestScore) {
                bestIndex = index
                bestScore = score
            }
        }

        return bestIndex === -1
            ? undefined
            : { index: bestIndex, record: previousSourceLessRoots[bestIndex] }
    }

    const assignSourceLessRootKeys = (nodes: RenderMetadataNode[] | undefined) => {
        if (!nodes) {
            previousSourceLessRoots = []
            return
        }

        const nextRoots: SourceLessRootRecord[] = []
        const usedPreviousRoots = new Set<number>()

        for (const node of nodes) {
            const identities = collectSourceLessIdentities(node)
            const existingKey = getRenderKey(node)
            const previous =
                existingKey === undefined
                    ? findPreviousSourceLessRoot(node, identities, usedPreviousRoots)
                    : undefined
            const key = existingKey ?? previous?.record.key ?? node

            if (previous) usedPreviousRoots.add(previous.index)
            if (existingKey === undefined) setRenderKey(node, key)

            nextRoots.push({
                key,
                identities,
                type: node.type
            })
        }

        previousSourceLessRoots = nextRoots
    }

    const assignSourceKeysToChildren = (node: RenderMetadataNode, absoluteOffset: number) => {
        assignSequentialSourceKeys(asNodeArray(node.tokens), absoluteOffset)
        assignSequentialSourceKeys(asNodeArray(node.items), absoluteOffset)
        assignSequentialSourceKeys(asNodeArray(node.header), absoluteOffset)
    }

    const assignHeadingIds = (
        nodes: RenderMetadataNode[] | undefined,
        options: SvelteMarkdownOptions,
        slugger: Slugger,
        nextHeadingNodes: RenderMetadataNode[],
        startIndex = 0
    ) => {
        if (!nodes) return

        for (let index = startIndex; index < nodes.length; index++) {
            const node = nodes[index]
            if (node.type === 'heading') {
                headingIds.set(
                    node,
                    options.headerIds && typeof node.text === 'string'
                        ? `${options.headerPrefix}${slugger.slug(node.text)}`
                        : undefined
                )
                nextHeadingNodes.push(node)
            }

            assignHeadingIds(asNodeArray(node.tokens), options, slugger, nextHeadingNodes)
            assignHeadingIds(asNodeArray(node.items), options, slugger, nextHeadingNodes)
            assignHeadingIds(asNodeArray(node.header), options, slugger, nextHeadingNodes)
            for (const row of asNodeArray(node.rows) ?? []) {
                assignHeadingIds(asNodeArray(row), options, slugger, nextHeadingNodes)
            }
        }
    }

    const seedHeadingSlugger = (
        node: RenderMetadataNode,
        options: SvelteMarkdownOptions,
        slugger: Slugger
    ) => {
        headingIds.set(
            node,
            options.headerIds && typeof node.text === 'string'
                ? `${options.headerPrefix}${slugger.slug(node.text)}`
                : undefined
        )
    }

    const assignPreparedHeadingIds = (
        nodes: RenderMetadataNode[],
        options: SvelteMarkdownOptions,
        preparation?: RenderPreparation
    ) => {
        const slugger = new Slugger()
        const nextHeadingNodes: RenderMetadataNode[] = []

        if (preparation?.source !== undefined && preparation.startOffset !== undefined) {
            for (const heading of preparedHeadingNodes) {
                const headingOffset = getSourceOffset(heading)
                if (headingOffset === undefined || headingOffset >= preparation.startOffset) {
                    continue
                }

                seedHeadingSlugger(heading, options, slugger)
                nextHeadingNodes.push(heading)
            }
        }

        assignHeadingIds(nodes, options, slugger, nextHeadingNodes, preparation?.startIndex ?? 0)
        preparedHeadingNodes = nextHeadingNodes
    }

    return {
        prepareTokensForRender: (
            tokens: Token[] | TokensList | undefined,
            options: SvelteMarkdownOptions,
            preparation?: RenderPreparation
        ): Token[] | TokensList | undefined => {
            if (!tokens) return tokens

            const renderNodes = tokens as RenderMetadataNode[]

            if (preparation?.source !== undefined) {
                previousSourceLessRoots = []
                assignSequentialSourceKeys(
                    renderNodes,
                    0,
                    preparation.startIndex ?? 0,
                    preparation.startOffset ?? 0
                )
            } else {
                assignSourceLessRootKeys(renderNodes)
            }

            assignPreparedHeadingIds(renderNodes, options, preparation)

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
