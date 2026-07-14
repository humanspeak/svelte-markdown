<!--
@component

 A Svelte component that renders Markdown content into HTML using a customizable parser.
 Supports both string input and pre-parsed markdown tokens, with configurable rendering
 options and custom renderers.

 @example
 ```svelte
 <SvelteMarkdown source="# Hello World" />

 <SvelteMarkdown
   source={markdownString}
   options={{ headerIds: false }}
   renderers={{ link: CustomLink }}
 />
 ```

 @property {string | Token[]} source - The markdown content to render, either as a string or pre-parsed tokens
 @property {Partial<Renderers>} [renderers] - Custom renderers for markdown elements
 @property {SvelteMarkdownOptions} [options] - Configuration options for the markdown parser
 @property {boolean} [isInline=false] - Whether to parse the content as inline markdown
 @property {function} [parsed] - Callback function called with the parsed tokens
-->
<script lang="ts">
    import { setContext } from 'svelte'
    /**
     * Component Evolution & Design Notes:
     *
     * 1. Core Purpose:
     * - Serves as the main entry point for markdown rendering in Svelte
     * - Handles both string input and pre-parsed tokens for flexibility
     *
     * 2. Key Design Decisions:
     * - Uses a separate Parser component for actual rendering to maintain separation of concerns
     * - Implements token cleanup via shrinkHtmlTokens to optimize HTML token handling
     * - Maintains state synchronization using Svelte 5's $state and $effect
     *
     * 3. Performance Considerations:
     * - Token caching: Parsed tokens are cached to avoid re-parsing unchanged content
     * - Fast FNV-1a hashing for efficient cache key generation
     * - LRU eviction keeps memory usage bounded (default: 50 cached documents)
     * - Cache hit: <1ms (vs 50-200ms parsing)
     * - Uses key directive for proper component rerendering when source changes
     * - Intentionally avoids reactive tokens to prevent double processing
     *
     * 4. Extensibility:
     * - Supports custom renderers through composition pattern
     * - Allows parser configuration via options prop
     * - Provides parsed callback for external token access
     */

    import Parser from '$lib/Parser.svelte'
    import {
        type StreamingChunk,
        type StreamingOffsetChunk,
        type SvelteMarkdownProps
    } from '$lib/types.js'
    import {
        buildCombinedRenderers,
        getAllRendererKeys,
        getHtmlSnippetOverrides,
        getPassThroughProps,
        getSnippetOverrides
    } from '$lib/utils/component-props.js'
    import {
        buildParserOptions,
        getExtensionTokenNames,
        hasAsyncExtension as getHasAsyncExtension
    } from '$lib/utils/extension-options.js'
    import { IncrementalParser } from '$lib/utils/incremental-parser.js'
    import { Slugger, type Token, type TokensList } from '$lib/utils/markdown-parser.js'
    import { parseAndCacheTokens, parseAndCacheTokensAsync } from '$lib/utils/parse-and-cache.js'
    import { createRenderMetadata, RENDER_METADATA_CONTEXT } from '$lib/utils/render-metadata.js'
    import { defaultSanitizeAttributes, defaultSanitizeUrl } from '$lib/utils/sanitize.js'
    import {
        applyStreamingOffsetChunk,
        appendStreamingChunk,
        commitStreamingAppendBuffer,
        getStreamingChunkInstruction,
        shouldFlushStreamingAppendBuffer,
        STREAM_BATCH_FALLBACK_MS,
        STREAM_MAX_OFFSET_GAP,
        type StreamingInputMode
    } from '$lib/utils/streaming-chunks.js'
    import { reuseStableTokenArray } from '$lib/utils/streaming-token-reuse.js'

    type StreamFlushHandle =
        { kind: 'raf'; id: number } | { kind: 'timeout'; id: ReturnType<typeof setTimeout> } | null

    const {
        source = [],
        streaming = false,
        streamId = undefined,
        renderers = {},
        options = {},
        isInline = false,
        parsed = () => {},
        extensions = [],
        sanitizeUrl = defaultSanitizeUrl,
        sanitizeAttributes = defaultSanitizeAttributes,
        ...rest
    }: SvelteMarkdownProps & {
        [key: string]: unknown
    } = $props()

    // Extract custom token type names from the extensions array
    const extensionTokenNames = $derived(getExtensionTokenNames(extensions))
    const combinedOptions = $derived(buildParserOptions(options, extensions))
    const slugger = new Slugger()
    const renderMetadata = createRenderMetadata()

    setContext(RENDER_METADATA_CONTEXT, renderMetadata)

    // Detect if any extension requires async processing
    const hasAsyncExtension = $derived(getHasAsyncExtension(extensions))

    // Streaming mode: full re-parse + smart in-place diff
    let incrementalParser: IncrementalParser | undefined
    let lastOptionsSrc: typeof options | undefined
    let lastExtensionsSrc: typeof extensions | undefined
    let lastSourceProp: typeof source | undefined
    // Left undefined rather than seeded from the prop: when `streamId` is unset
    // this matches on every run and falls through to the source check, and when
    // it is set the first-run reset does exactly what the source-sync path
    // would have done anyway (teardown + fresh parser).
    let lastStreamId: typeof streamId
    let streamSourceBuffer = ''
    let pendingStreamAppendBuffer = ''
    let pendingStreamFullSource: string | null = null
    let streamFlushHandle: StreamFlushHandle = null
    let streamInputMode: StreamingInputMode = null
    // Invariant (#291): only ever reassign this array wholesale — never
    // push/splice/index-write/shrink it in place. See the rationale comment
    // in applyStreamingSource before touching any write site.
    let streamTokens = $state<Token[]>([])
    let streamRenderMetadataStartIndex = 0
    let streamRenderMetadataStartOffset = 0

    const warnStreaming = (message: string) => {
        console.warn(`[svelte-markdown] ${message}`)
    }

    const clearStreamingParser = () => {
        incrementalParser = undefined
        lastOptionsSrc = undefined
        lastExtensionsSrc = undefined
    }

    const cancelScheduledStreamFlush = () => {
        if (!streamFlushHandle) return

        if (streamFlushHandle.kind === 'raf' && typeof cancelAnimationFrame === 'function') {
            cancelAnimationFrame(streamFlushHandle.id)
        } else if (streamFlushHandle.kind === 'timeout') {
            clearTimeout(streamFlushHandle.id)
        }

        streamFlushHandle = null
    }

    const hasStreamingParserConfigChanged = () =>
        !incrementalParser || lastOptionsSrc !== options || lastExtensionsSrc !== extensions

    const applyStreamingSource = (nextSource: string, forceNewParser = false) => {
        if (forceNewParser || hasStreamingParserConfigChanged()) {
            incrementalParser = new IncrementalParser(combinedOptions)
            lastOptionsSrc = options
            lastExtensionsSrc = extensions
        }

        const parser = incrementalParser
        if (!parser) return

        const { tokens: newTokens, divergeAt, divergeOffset, canReuse } = parser.update(nextSource)

        // Replace the array reference rather than mutating per-index +
        // length. Under Svelte 5's reactive proxy, shrinking the array
        // via per-index assignment + `length = N` (and even `splice()`)
        // didn't consistently dispatch the unmount signal to the each
        // block, leaving stale snippets in the DOM whenever a streamed
        // `</details>` collapsed several siblings into one nested token.
        // See #291.
        // Resets below follow the same rule: always replace, never shrink.
        // A freshly (re)created parser has an empty prevSource and always
        // reports canReuse=false on its first update, so that case needs no
        // separate guard here.
        streamTokens = canReuse
            ? reuseStableTokenArray(streamTokens, newTokens, divergeAt)
            : newTokens
        const canSkipRenderMetadataPrefix = canReuse && divergeOffset !== undefined
        streamRenderMetadataStartIndex = canSkipRenderMetadataPrefix ? divergeAt : 0
        streamRenderMetadataStartOffset = canSkipRenderMetadataPrefix ? divergeOffset : 0
    }

    const commitPendingAppendBuffer = () => {
        const result = commitStreamingAppendBuffer(streamSourceBuffer, pendingStreamAppendBuffer)
        if (!result.committed) return false

        streamSourceBuffer = result.sourceBuffer
        pendingStreamAppendBuffer = result.pendingBuffer

        return true
    }

    const flushPendingStreamChanges = (forceNewParser = false) => {
        cancelScheduledStreamFlush()

        if (pendingStreamFullSource !== null) {
            const nextSource = pendingStreamFullSource
            pendingStreamFullSource = null
            pendingStreamAppendBuffer = ''
            streamSourceBuffer = nextSource
            applyStreamingSource(nextSource, forceNewParser)
            return
        }

        if (!commitPendingAppendBuffer()) return

        applyStreamingSource(streamSourceBuffer, forceNewParser)
    }

    const scheduleStreamFlush = () => {
        if (
            streamFlushHandle ||
            (pendingStreamAppendBuffer === '' && pendingStreamFullSource === null)
        ) {
            return
        }

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            const id = window.requestAnimationFrame(() => {
                streamFlushHandle = null
                flushPendingStreamChanges()
            })
            streamFlushHandle = { kind: 'raf', id }
            return
        }

        const id = setTimeout(() => {
            streamFlushHandle = null
            flushPendingStreamChanges()
        }, STREAM_BATCH_FALLBACK_MS)
        streamFlushHandle = { kind: 'timeout', id }
    }

    const teardownStreamingBuffers = () => {
        cancelScheduledStreamFlush()
        pendingStreamAppendBuffer = ''
        pendingStreamFullSource = null
        streamInputMode = null
        streamSourceBuffer = ''
        streamRenderMetadataStartIndex = 0
        streamRenderMetadataStartOffset = 0
    }

    const resetStreamingState = (nextSource = '') => {
        teardownStreamingBuffers()
        streamSourceBuffer = nextSource

        if (nextSource === '') {
            clearStreamingParser()
            streamTokens = []
            return
        }

        applyStreamingSource(nextSource, true)
    }

    const syncStreamingSourceFromProp = (nextSource: typeof source) => {
        lastSourceProp = nextSource

        if (Array.isArray(nextSource)) {
            teardownStreamingBuffers()
            clearStreamingParser()
            streamTokens = [...nextSource]
            return
        }

        const nextStr = nextSource
        // Reuse the existing IncrementalParser when the new source extends
        // the buffered source. Without this, prop-driven streaming (the
        // common LLM-token-by-token case) drops the parser's prevTokens
        // cache on every chunk, forcing divergeAt=0 and re-rendering the
        // full token tree. Imperative writeChunk() already preserves the
        // parser; this brings prop-source parity.
        const isAppendOnly =
            incrementalParser !== undefined &&
            streamSourceBuffer !== '' &&
            nextStr !== '' &&
            nextStr.length > streamSourceBuffer.length &&
            nextStr.startsWith(streamSourceBuffer)

        if (isAppendOnly) {
            pendingStreamAppendBuffer = ''
            pendingStreamFullSource = nextStr
            scheduleStreamFlush()
            return
        }

        teardownStreamingBuffers()

        if (nextStr === '') {
            clearStreamingParser()
            streamTokens = []
            return
        }

        streamSourceBuffer = nextStr
        applyStreamingSource(nextStr, !isAppendOnly)
    }

    /**
     * Drops every trace of the previous stream and rebaselines on the current
     * `source` prop. Used when `streamId` changes, i.e. when a recycled
     * component instance begins rendering a different message.
     */
    const resetStreamingSession = () => {
        if (Array.isArray(source)) {
            // Also sets lastSourceProp.
            syncStreamingSourceFromProp(source)
            return
        }

        lastSourceProp = source
        resetStreamingState(source)
    }

    const canUseImperativeStreaming = (methodName: 'writeChunk' | 'resetStream'): boolean => {
        if (!streaming) {
            warnStreaming(`${methodName}() is only available when streaming={true}; call dropped.`)
            return false
        }

        if (hasAsyncExtension) {
            warnStreaming(
                `${methodName}() is unavailable when async extensions are used; call dropped.`
            )
            return false
        }

        if (Array.isArray(source)) {
            warnStreaming(
                `${methodName}() requires a string-backed source; token array sources are not supported.`
            )
            return false
        }

        return true
    }

    const applyAppendChunk = (value: string) => {
        if (pendingStreamFullSource !== null) {
            flushPendingStreamChanges()
        }

        pendingStreamAppendBuffer = appendStreamingChunk(pendingStreamAppendBuffer, value)

        if (shouldFlushStreamingAppendBuffer(pendingStreamAppendBuffer)) {
            flushPendingStreamChanges()
            return
        }

        scheduleStreamFlush()
    }

    const applyOffsetChunk = (chunk: StreamingOffsetChunk) => {
        streamSourceBuffer = applyStreamingOffsetChunk(streamSourceBuffer, chunk, {
            maxOffsetGap: STREAM_MAX_OFFSET_GAP
        })
        applyStreamingSource(streamSourceBuffer)
    }

    export function writeChunk(chunk: StreamingChunk): void {
        if (!canUseImperativeStreaming('writeChunk')) return

        // Reconcile a pending streamId change here rather than waiting for the
        // $effect: writeChunk() is synchronous, so a caller that swaps streamId
        // and writes in the same tick would otherwise append to the previous
        // stream's buffer (and have that write wiped when the effect later ran).
        if (lastStreamId !== streamId) {
            lastStreamId = streamId
            resetStreamingSession()
        }

        if (pendingStreamFullSource !== null) {
            flushPendingStreamChanges()
        }

        const instruction = getStreamingChunkInstruction(chunk, streamInputMode, {
            currentBufferLength: streamSourceBuffer.length,
            maxOffsetGap: STREAM_MAX_OFFSET_GAP
        })
        if (instruction.kind === 'drop') {
            warnStreaming(instruction.message)
            return
        }

        streamInputMode = instruction.nextMode

        if (instruction.kind === 'append') {
            applyAppendChunk(instruction.value)
            return
        }

        applyOffsetChunk(instruction.chunk)
    }

    export function resetStream(nextSource = ''): void {
        if (!canUseImperativeStreaming('resetStream')) return

        resetStreamingState(nextSource)
    }

    $effect(() => {
        return () => {
            cancelScheduledStreamFlush()
        }
    })

    $effect(() => {
        if (!streaming || hasAsyncExtension) {
            teardownStreamingBuffers()
            if (incrementalParser) clearStreamingParser()
            lastSourceProp = source
            lastStreamId = streamId
            if (streaming && hasAsyncExtension) {
                warnStreaming(
                    'streaming prop is ignored when async extensions are used. ' +
                        'Remove async extensions or set streaming={false} to silence this warning.'
                )
            }
            return
        }

        // Must precede the source check: when a new stream also carries a new
        // source, the reset rebaselines on it rather than treating the change
        // as an append to the previous message's buffer.
        if (lastStreamId !== streamId) {
            lastStreamId = streamId
            resetStreamingSession()
            return
        }

        if (lastSourceProp !== source) {
            syncStreamingSourceFromProp(source)
            return
        }

        if (Array.isArray(source)) {
            return
        }

        if (hasStreamingParserConfigChanged()) {
            if (pendingStreamFullSource !== null) {
                flushPendingStreamChanges(true)
                return
            }

            if (pendingStreamAppendBuffer !== '') {
                flushPendingStreamChanges(true)
                return
            }

            if (streamSourceBuffer === '') {
                clearStreamingParser()
                streamTokens = []
                return
            }

            applyStreamingSource(streamSourceBuffer, true)
        }
    })

    // Synchronous token derivation (default fast path — non-streaming)
    const syncTokens = $derived.by(() => {
        if (hasAsyncExtension) return undefined
        if (streaming) return undefined

        // Pre-parsed tokens - skip caching and parsing
        if (Array.isArray(source)) {
            return source as Token[]
        }

        // Empty string - return empty array (avoid cache overhead)
        if (source === '') {
            return []
        }

        // Standard mode - full parse with caching
        return parseAndCacheTokens(source as string, combinedOptions, isInline)
    }) satisfies Token[] | TokensList | undefined

    // Async token state (used only when extensions require async walkTokens)
    let asyncTokens = $state<Token[] | TokensList | undefined>(undefined)
    let asyncRequestId = 0

    $effect(() => {
        if (!hasAsyncExtension) return

        // Pre-parsed tokens - skip caching and parsing
        if (Array.isArray(source)) {
            asyncTokens = source as Token[]
            return
        }

        // Empty string - return empty array
        if (source === '') {
            asyncTokens = []
            return
        }

        // Async parse with caching
        const currentSource = source as string
        const currentOptions = combinedOptions
        const currentInline = isInline
        const requestId = ++asyncRequestId
        parseAndCacheTokensAsync(currentSource, currentOptions, currentInline)
            .then((result) => {
                if (requestId === asyncRequestId) {
                    asyncTokens = result
                }
            })
            .catch((error) => {
                if (requestId === asyncRequestId) {
                    console.error('[svelte-markdown] async walkTokens failed:', error)
                    asyncTokens = []
                }
            })
    })

    // Unified tokens: streaming > sync > async
    const rawTokens = $derived(
        streaming && !hasAsyncExtension
            ? streamTokens
            : hasAsyncExtension
              ? asyncTokens
              : syncTokens
    )

    const tokens = $derived.by(() => {
        if (!rawTokens) return rawTokens

        // This derived intentionally prepares WeakMap metadata before Parser
        // renders. An $effect would run too late: keyed each blocks and
        // heading props need the metadata during this render pass.
        const sourceForMetadata = Array.isArray(source)
            ? undefined
            : streaming && !hasAsyncExtension
              ? streamSourceBuffer
              : (source as string)

        // In streaming mode, streamSourceBuffer is a plain let that changes
        // in lockstep with streamTokens inside applyStreamingSource(). This
        // derived is invalidated by rawTokens; the buffer read relies on that
        // coupling so metadata sees the same source that produced the tokens.
        const streamingStart =
            streaming && !hasAsyncExtension
                ? {
                      startIndex: streamRenderMetadataStartIndex,
                      startOffset: streamRenderMetadataStartOffset
                  }
                : {}

        return renderMetadata.prepareTokensForRender(rawTokens, combinedOptions, {
            source: sourceForMetadata,
            ...streamingStart
        })
    })

    $effect(() => {
        if (!tokens) return
        parsed(tokens)
    })

    const combinedRenderers = $derived(buildCombinedRenderers(renderers))

    // All renderer keys: built-in + extension token names
    const allRendererKeys = $derived(getAllRendererKeys(extensionTokenNames))

    // Collect markdown snippet overrides (keys matching renderer names or extension token names)
    const snippetOverrides = $derived(getSnippetOverrides(rest, allRendererKeys))

    // Collect HTML snippet overrides (keys matching html_<tag>)
    const htmlSnippetOverrides = $derived(getHtmlSnippetOverrides(rest))

    // Passthrough: everything that isn't a known snippet override
    const passThroughProps = $derived(getPassThroughProps(rest, allRendererKeys))
</script>

<Parser
    {tokens}
    {...passThroughProps}
    options={combinedOptions}
    slug={(val: string): string => slugger.slug(val)}
    renderers={combinedRenderers}
    {snippetOverrides}
    {htmlSnippetOverrides}
    {sanitizeUrl}
    {sanitizeAttributes}
/>
