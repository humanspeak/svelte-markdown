import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token, TokensList } from '$lib/utils/markdown-parser.js'
import Slugger, { slug as slugBase } from 'github-slugger'

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
 * Heading ids share one slugger across nesting boundaries. An undo log ordered
 * by top-level token index lets streaming passes rewind only the divergent tail.
 * Full renders and configuration changes reset that state and walk all headings.
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

interface HeadingUndoEntry {
    rootIndex: number
    base: string
    result: string
    previousCount: number | undefined
}

// A `Pick<>` utility type, not an object-literal shape: an empty
// `interface … extends Pick<>` trips eslint/no-empty-object-type, so this
// stays a type alias.
type HeadingSluggerSignature = Pick<SvelteMarkdownOptions, 'headerIds' | 'headerPrefix'>

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

/**
 * Captures the heading-id options that affect slug output, so stored dedup
 * state can be invalidated when they change between passes.
 *
 * @param options - The active {@link SvelteMarkdownOptions}.
 * @returns The `headerIds`/`headerPrefix` pair that identifies the slugger's
 *   configuration for the current pass.
 * @example
 * ```ts
 * const signature = getHeadingSluggerSignature(options)
 * ```
 */
const getHeadingSluggerSignature = (options: SvelteMarkdownOptions): HeadingSluggerSignature => ({
    headerIds: options.headerIds,
    headerPrefix: options.headerPrefix
})

/**
 * Compares two heading-slugger signatures for equality. A previous signature of
 * `undefined` (no prior pass) never matches, forcing the safe replay path.
 *
 * @param a - The previously stored signature, or `undefined` on the first pass.
 * @param b - The current pass's signature.
 * @returns `true` when both `headerIds` and `headerPrefix` are identical.
 * @example
 * ```ts
 * if (headingSluggerSignaturesMatch(preparedHeadingSignature, current)) {
 *     // safe to rewind the heading undo log
 * }
 * ```
 */
const headingSluggerSignaturesMatch = (
    a: HeadingSluggerSignature | undefined,
    b: HeadingSluggerSignature
) => a !== undefined && a.headerIds === b.headerIds && a.headerPrefix === b.headerPrefix

/**
 * Creates a per-`SvelteMarkdown`-instance render metadata helper. State
 * (render keys, precomputed heading ids, source offsets, and cross-pass
 * bookkeeping) is captured in the returned closure via WeakMaps keyed by token
 * objects, so each component instance gets isolated metadata and caller token
 * arrays are never mutated. See the module overview above for the keying and
 * heading-id strategy.
 *
 * @returns A {@link RenderMetadata} whose methods precompute per-pass metadata
 *   (`prepareTokensForRender`) and read it back during render
 *   (`getPreparedHeadingId`, `getStableNodeKey`, `getStableRowKey`).
 * @example
 * ```ts
 * const metadata = createRenderMetadata()
 * // Streaming append: skip the stable prefix via the parser's diverge point.
 * const tokens = metadata.prepareTokensForRender(rawTokens, options, {
 *     source,
 *     startIndex,
 *     startOffset
 * })
 * const key = metadata.getStableNodeKey(tokens?.[0], 0)
 * const id = metadata.getPreparedHeadingId(tokens?.[0])
 * ```
 */
export const createRenderMetadata = (): RenderMetadata => {
    const renderKeys = new WeakMap<object, unknown>()
    const headingIds = new WeakMap<object, string | undefined>()
    const headingSlugger = new Slugger()
    const headingUndoLog: HeadingUndoEntry[] = []
    let headingStateReusable = false
    let preparedHeadingSignature: HeadingSluggerSignature | undefined
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
        const rows = asNodeArray(node.rows)
        if (rows) {
            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex]
                // Body cell keys intentionally mirror header cells below.
                // Rows need their own key space because getStableRowKey()
                // otherwise derives duplicate row keys from first-cell keys.
                setRenderKey(row, `src:${absoluteOffset}:row:${rowIndex}`)
                assignSequentialSourceKeys(asNodeArray(row), absoluteOffset)
            }
        }
    }

    const assignHeadingIds = (
        nodes: RenderMetadataNode[] | undefined,
        options: SvelteMarkdownOptions,
        startIndex = 0,
        rootIndex?: number
    ) => {
        if (!nodes) return

        for (let index = startIndex; index < nodes.length; index++) {
            const node = nodes[index]
            const headingRootIndex = rootIndex ?? index
            if (node.type === 'heading') {
                prepareHeadingId(node, options, headingRootIndex)
            }

            assignHeadingIds(asNodeArray(node.tokens), options, 0, headingRootIndex)
            assignHeadingIds(asNodeArray(node.items), options, 0, headingRootIndex)
            assignHeadingIds(asNodeArray(node.header), options, 0, headingRootIndex)
            const rows = asNodeArray(node.rows)
            if (rows) {
                for (const row of rows) {
                    assignHeadingIds(asNodeArray(row), options, 0, headingRootIndex)
                }
            }
        }
    }

    const prepareHeadingId = (
        node: RenderMetadataNode,
        options: SvelteMarkdownOptions,
        rootIndex: number
    ) => {
        if (!options.headerIds || typeof node.text !== 'string') {
            headingIds.set(node, undefined)
            return
        }

        const base = slugBase(node.text)
        const previousCount = headingSlugger.occurrences[base]
        const result = headingSlugger.slug(node.text)
        headingIds.set(node, `${options.headerPrefix}${result}`)

        headingUndoLog.push({ rootIndex, base, result, previousCount })
    }

    /**
     * github-slugger 2.x creates one final id and advances only the base's
     * counter (possibly several times when suffixes are already occupied).
     * Undo in reverse order: later headings may themselves use a generated id
     * as their base. Restore the exact saved counter, not count minus one.
     * Revisit this invariant when upgrading github-slugger's implementation.
     */
    const rewindHeadingIds = (startIndex: number) => {
        let entry = headingUndoLog.at(-1)
        // Source offsets can shift between parses (e.g. discarded duplicate
        // reference definitions). The parser's unchanged top-level token prefix
        // is the reuse boundary; every heading in a reprocessed root must undo.
        while (entry && entry.rootIndex >= startIndex) {
            delete headingSlugger.occurrences[entry.result]
            if (entry.previousCount !== undefined) {
                headingSlugger.occurrences[entry.base] = entry.previousCount
            }
            headingUndoLog.pop()
            entry = headingUndoLog.at(-1)
        }
    }

    const assignPreparedHeadingIds = (
        nodes: RenderMetadataNode[],
        options: SvelteMarkdownOptions,
        preparation?: RenderPreparation
    ) => {
        const signature = getHeadingSluggerSignature(options)
        const { source, startIndex = 0 } = preparation ?? {}
        const canReuse =
            source !== undefined &&
            startIndex > 0 &&
            headingStateReusable &&
            headingSluggerSignaturesMatch(preparedHeadingSignature, signature)

        if (canReuse) {
            rewindHeadingIds(startIndex)
        } else {
            headingSlugger.reset()
            headingUndoLog.length = 0
            headingStateReusable = source !== undefined
            // A reset also visits the prefix. Refresh its offsets if the caller
            // supplied a partial pass, e.g. after options or source mode changed.
            if (source !== undefined && startIndex > 0) {
                assignSequentialSourceKeys(nodes)
            }
        }

        assignHeadingIds(nodes, options, canReuse ? startIndex : 0)
        preparedHeadingSignature = signature
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
