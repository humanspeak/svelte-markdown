import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token, TokensList } from '$lib/utils/markdown-parser.js'
import { countStreamStat, STREAM_STATS_ENABLED } from '$lib/utils/streaming-token-reuse.js'
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

/**
 * Source characters covered by one root segment (plan 011). A root belongs to
 * segment `Math.floor(rootStartOffset / ROOT_SEGMENT_SPAN)`.
 */
export const ROOT_SEGMENT_SPAN = 4096

/**
 * A run of consecutive root tokens whose source start offsets fall into the
 * same {@link ROOT_SEGMENT_SPAN}-character bucket. The root Parser renders
 * `{#each segments (segment.id)}{#each segment.tokens (key)}` so a streaming
 * update only re-diffs the segment it touched instead of every root.
 *
 * Ownership rule: a root's render key is its source offset, and its segment
 * is a pure function of that offset, so a root can never move between
 * segments (inner `{#each}` owners) while its key is alive — it is mounted
 * and destroyed by one owner for its whole life. Segment layout is a pure
 * function of the final token array, so a streamed render and a one-shot
 * render of the same source produce the same segments.
 */
export interface RootSegment {
    /** Bucket index; unique within one render and stable across renders */
    readonly id: number
    /** The segment's roots, in document order */
    readonly tokens: readonly Token[]
}

/** Where a built segment starts in the prepared root array. */
interface RootSegmentStart {
    index: number
    offset: number
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
    /**
     * Root segments prepared for exactly this root array (source-backed
     * passes only), or `undefined` — callers then render the array flat.
     */
    getRootSegments: (_tokens: unknown) => readonly RootSegment[] | undefined
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
    /**
     * Source-backed passes only (streaming re-walk of a diverged open block,
     * plan 010 H3). `keyedSubtreeOffsets` records the absolute offset at which
     * a node's whole subtree was last keyed; a node seen again at the same
     * offset with the same stored key still has correct keys below it, because
     * parsed tokens are immutable. `headingFreeSubtrees` marks nodes with no
     * heading anywhere below them, so heading-id passes skip those subtrees
     * while still visiting every subtree that holds a heading. Both are gated
     * on source-backed passes: caller-supplied token arrays may be mutated in
     * place between renders.
     */
    const keyedSubtreeOffsets = new WeakMap<object, number>()
    const headingFreeSubtrees = new WeakSet<object>()
    let headingSubtreeCacheEnabled = false
    /**
     * Root segments of the last source-backed pass (plan 011): built for
     * `segmentedTokens`, with each segment's start index/offset and the end
     * of the root array so a partial pass rebuilds only from the segment
     * holding `startIndex`.
     */
    let segmentedTokens: unknown
    let rootSegments: RootSegment[] = []
    let rootSegmentStarts: RootSegmentStart[] = []
    let rootSegmentsEnd: RootSegmentStart = { index: 0, offset: 0 }

    const setRenderKey = (node: object, value: unknown) => {
        renderKeys.set(node, value)
    }

    const getRenderKey = (node: unknown) =>
        typeof node === 'object' && node !== null ? renderKeys.get(node) : undefined

    const getStableNodeKey = (node: unknown, index: number): unknown => {
        if (STREAM_STATS_ENABLED) countStreamStat('keyEvaluations')
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
            const key = spanLength === 0 ? `src:${nodeOffset}:zero:${index}` : `src:${nodeOffset}`
            cursor += spanLength

            // Same object, same offset, same key: its subtree keys are current.
            if (keyedSubtreeOffsets.get(node) === nodeOffset && renderKeys.get(node) === key) {
                continue
            }

            setRenderKey(node, key)
            assignSourceKeysToChildren(node, nodeOffset)
            keyedSubtreeOffsets.set(node, nodeOffset)
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

    const clearRootSegments = () => {
        segmentedTokens = undefined
        rootSegments = []
        rootSegmentStarts = []
        rootSegmentsEnd = { index: 0, offset: 0 }
    }

    /**
     * Number of previous segments that lie wholly before `startIndex` (so
     * their roots are the same objects at the same offsets) and can be kept.
     * 0 when the previous segments cannot be trusted for this pass.
     */
    const countKeptSegments = (nodes: RenderMetadataNode[], startIndex: number): number => {
        if (segmentedTokens === undefined || startIndex <= 0) return 0
        if (startIndex > rootSegmentsEnd.index || startIndex > nodes.length) return 0

        let keep = 0
        while (keep < rootSegments.length) {
            const end =
                keep + 1 < rootSegmentStarts.length
                    ? rootSegmentStarts[keep + 1].index
                    : rootSegmentsEnd.index
            if (end > startIndex) break
            keep++
        }
        return keep
    }

    /** True when `segment` holds exactly the objects in `tokens`. */
    const segmentHoldsTokens = (segment: RootSegment, tokens: readonly Token[]): boolean => {
        if (segment.tokens.length !== tokens.length) return false
        for (let index = 0; index < tokens.length; index++) {
            if (segment.tokens[index] !== tokens[index]) return false
        }
        return true
    }

    /**
     * Groups root tokens into offset buckets (see {@link RootSegment}). On a
     * partial pass (`startIndex > 0`, roots before it unchanged) the segments
     * wholly before `startIndex` are kept as-is and only the rest is rebuilt,
     * so the work is proportional to one segment plus the changed tail. A
     * rebuilt segment whose roots are all the previous objects keeps its
     * previous segment object, so its inner `{#each}` is not re-diffed.
     */
    const prepareRootSegments = (
        nodes: RenderMetadataNode[],
        startIndex: number,
        startOffset: number
    ) => {
        let keep = countKeptSegments(nodes, startIndex)
        let from: RootSegmentStart =
            keep < rootSegmentStarts.length ? rootSegmentStarts[keep] : rootSegmentsEnd
        // An appended root may still fall into the last kept bucket.
        if (keep > 0 && Math.floor(from.offset / ROOT_SEGMENT_SPAN) === rootSegments[keep - 1].id) {
            keep--
            from = rootSegmentStarts[keep]
        }
        if (keep === 0) from = { index: 0, offset: 0 }
        // `startOffset` pins the offset of `startIndex`; it must agree.
        if (from.index === startIndex && from.offset !== startOffset) {
            keep = 0
            from = { index: 0, offset: 0 }
        }

        const segments = rootSegments.slice(0, keep)
        const starts = rootSegmentStarts.slice(0, keep)
        // Previous segments after the kept ones, walked in id order (ids
        // increase with offset) to reuse unchanged segment objects.
        let previous = keep
        let index = from.index
        let offset = from.offset
        while (index < nodes.length) {
            const id = Math.floor(offset / ROOT_SEGMENT_SPAN)
            const start: RootSegmentStart = { index, offset }
            while (index < nodes.length && Math.floor(offset / ROOT_SEGMENT_SPAN) === id) {
                offset += getNodeSourceLength(nodes[index])
                index++
            }
            const tokens = (nodes as unknown as Token[]).slice(start.index, index)
            while (previous < rootSegments.length && rootSegments[previous].id < id) previous++
            const candidate = rootSegments[previous]
            const reusable = candidate?.id === id && segmentHoldsTokens(candidate, tokens)
            segments.push(reusable ? candidate : { id, tokens })
            starts.push(start)
        }

        segmentedTokens = nodes
        rootSegments = segments
        rootSegmentStarts = starts
        rootSegmentsEnd = { index, offset }
    }

    /**
     * Prepares heading ids in `nodes` (from `startIndex`) and their subtrees,
     * in document order.
     *
     * @returns `true` when a heading was found in `nodes` or below them
     */
    const assignHeadingIds = (
        nodes: RenderMetadataNode[] | undefined,
        options: SvelteMarkdownOptions,
        startIndex = 0,
        rootIndex?: number
    ): boolean => {
        if (!nodes) return false

        let found = false
        for (let index = startIndex; index < nodes.length; index++) {
            const node = nodes[index]
            const headingRootIndex = rootIndex ?? index
            if (node.type === 'heading') {
                prepareHeadingId(node, options, headingRootIndex)
                found = true
            }
            if (assignHeadingIdsBelow(node, options, headingRootIndex)) found = true
        }
        return found
    }

    /**
     * Walks `node`'s children for headings, skipping subtrees a previous
     * source-backed pass proved heading-free.
     *
     * @returns `true` when a heading exists below `node`
     */
    const assignHeadingIdsBelow = (
        node: RenderMetadataNode,
        options: SvelteMarkdownOptions,
        rootIndex: number
    ): boolean => {
        if (headingSubtreeCacheEnabled && headingFreeSubtrees.has(node)) return false

        let found = assignHeadingIds(asNodeArray(node.tokens), options, 0, rootIndex)
        if (assignHeadingIds(asNodeArray(node.items), options, 0, rootIndex)) found = true
        if (assignHeadingIds(asNodeArray(node.header), options, 0, rootIndex)) found = true
        const rows = asNodeArray(node.rows)
        if (rows) {
            for (const row of rows) {
                if (assignHeadingIds(asNodeArray(row), options, 0, rootIndex)) found = true
            }
        }

        if (!found && headingSubtreeCacheEnabled) headingFreeSubtrees.add(node)
        return found
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
        headingSubtreeCacheEnabled = source !== undefined
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
                prepareRootSegments(
                    renderNodes,
                    preparation.startIndex ?? 0,
                    preparation.startOffset ?? 0
                )
            } else {
                clearRootSegments()
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
        },
        getRootSegments: (tokens: unknown): readonly RootSegment[] | undefined =>
            tokens !== undefined && tokens === segmentedTokens ? rootSegments : undefined
    }
}
