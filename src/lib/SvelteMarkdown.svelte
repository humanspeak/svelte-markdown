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
    import { IncrementalParser } from '$lib/utils/incremental-parser.js'
    import {
        defaultOptions,
        defaultRenderers,
        Slugger,
        type Token,
        type TokensList
    } from '$lib/utils/markdown-parser.js'
    import { parseAndCacheTokens, parseAndCacheTokensAsync } from '$lib/utils/parse-and-cache.js'
    import { rendererKeysInternal } from '$lib/utils/rendererKeys.js'
    import { Marked } from 'marked'

    // trunk-ignore(eslint/@typescript-eslint/no-explicit-any)
    type AnySnippet = (..._args: any[]) => any
    type StreamFlushHandle =
        | { kind: 'raf'; id: number }
        | { kind: 'timeout'; id: ReturnType<typeof setTimeout> }
        | null

    const STREAM_BATCH_FALLBACK_MS = 16
    const STREAM_BATCH_MAX_CHARS = 256

    const {
        source = [],
        streaming = false,
        renderers = {},
        options = {},
        isInline = false,
        parsed = () => {},
        extensions = [],
        ...rest
    }: SvelteMarkdownProps & {
        [key: string]: unknown
    } = $props()

    // Extract custom token type names from the extensions array
    const extensionTokenNames = $derived(
        extensions.flatMap((ext) => ext.extensions?.map((e) => e.name) ?? [])
    )

    // Create a scoped Marked instance and extract its resolved defaults
    const extensionDefaults = $derived(
        extensions.length > 0 ? new Marked(...extensions).defaults : {}
    )

    const combinedOptions = $derived({ ...defaultOptions, ...extensionDefaults, ...options })
    const slugger = new Slugger()

    // Detect if any extension requires async processing
    const hasAsyncExtension = $derived(extensions.some((ext) => ext.async === true))

    // Streaming mode: full re-parse + smart in-place diff
    let incrementalParser: IncrementalParser | undefined
    let lastOptionsSrc: typeof options | undefined
    let lastExtensionsSrc: typeof extensions | undefined
    let lastSourceProp: typeof source | undefined
    let streamSourceBuffer = ''
    let pendingStreamAppendBuffer = ''
    let streamFlushHandle: StreamFlushHandle = null
    let streamInputMode: 'append' | 'offset' | null = null
    let streamTokens = $state<Token[]>([])

    const warnStreaming = (message: string) => {
        console.warn(`[svelte-markdown] ${message}`)
    }

    const clearStreamingParser = () => {
        incrementalParser = undefined
        lastOptionsSrc = undefined
        lastExtensionsSrc = undefined
    }

    const cancelScheduledAppendFlush = () => {
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

        const { tokens: newTokens, divergeAt } = parser.update(nextSource)

        for (let i = divergeAt; i < newTokens.length; i++) {
            streamTokens[i] = newTokens[i]
        }
        streamTokens.length = newTokens.length
    }

    const commitPendingAppendBuffer = () => {
        if (pendingStreamAppendBuffer === '') return false

        streamSourceBuffer += pendingStreamAppendBuffer
        pendingStreamAppendBuffer = ''

        return true
    }

    const flushPendingAppendChunks = (forceNewParser = false) => {
        cancelScheduledAppendFlush()

        if (!commitPendingAppendBuffer()) return

        applyStreamingSource(streamSourceBuffer, forceNewParser)
    }

    const scheduleAppendFlush = () => {
        if (streamFlushHandle || pendingStreamAppendBuffer === '') return

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            const id = window.requestAnimationFrame(() => {
                streamFlushHandle = null
                flushPendingAppendChunks()
            })
            streamFlushHandle = { kind: 'raf', id }
            return
        }

        const id = setTimeout(() => {
            streamFlushHandle = null
            flushPendingAppendChunks()
        }, STREAM_BATCH_FALLBACK_MS)
        streamFlushHandle = { kind: 'timeout', id }
    }

    const resetStreamingState = (nextSource = '') => {
        cancelScheduledAppendFlush()
        pendingStreamAppendBuffer = ''
        streamInputMode = null
        streamSourceBuffer = nextSource

        if (nextSource === '') {
            clearStreamingParser()
            streamTokens.length = 0
            return
        }

        applyStreamingSource(nextSource, true)
    }

    const syncStreamingSourceFromProp = (nextSource: typeof source) => {
        lastSourceProp = nextSource
        streamInputMode = null

        if (Array.isArray(nextSource)) {
            cancelScheduledAppendFlush()
            pendingStreamAppendBuffer = ''
            streamSourceBuffer = ''
            clearStreamingParser()
            streamTokens = [...(nextSource as Token[])]
            return
        }

        resetStreamingState(nextSource as string)
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
        pendingStreamAppendBuffer += value

        if (pendingStreamAppendBuffer.length >= STREAM_BATCH_MAX_CHARS) {
            flushPendingAppendChunks()
            return
        }

        scheduleAppendFlush()
    }

    const applyOffsetChunk = ({ value, offset }: StreamingOffsetChunk) => {
        flushPendingAppendChunks()

        const padded =
            offset > streamSourceBuffer.length
                ? streamSourceBuffer + ' '.repeat(offset - streamSourceBuffer.length)
                : streamSourceBuffer
        const prefix = padded.slice(0, offset)
        const suffix = padded.slice(offset + value.length)

        streamSourceBuffer = prefix + value + suffix
        applyStreamingSource(streamSourceBuffer)
    }

    const isStreamingOffsetChunk = (chunk: StreamingChunk): chunk is StreamingOffsetChunk =>
        typeof chunk === 'object' && chunk !== null && 'offset' in chunk

    export function writeChunk(chunk: StreamingChunk): void {
        if (!canUseImperativeStreaming('writeChunk')) return

        if (typeof chunk === 'string') {
            if (streamInputMode === 'offset') {
                warnStreaming(
                    'offset mode active, string chunk dropped. Call resetStream() before switching streaming input modes.'
                )
                return
            }

            if (streamInputMode === null) {
                streamInputMode = 'append'
            }

            applyAppendChunk(chunk)
            return
        }

        if (!isStreamingOffsetChunk(chunk) || typeof chunk.value !== 'string') {
            warnStreaming(
                'Invalid chunk object passed to writeChunk(); expected { value: string, offset: number }.'
            )
            return
        }

        if (!Number.isSafeInteger(chunk.offset) || chunk.offset < 0) {
            warnStreaming(
                'Invalid offset chunk passed to writeChunk(); offset must be a non-negative safe integer.'
            )
            return
        }

        if (streamInputMode === 'append') {
            warnStreaming(
                'append mode active, offset chunk dropped. Call resetStream() before switching streaming input modes.'
            )
            return
        }

        if (streamInputMode === null) {
            streamInputMode = 'offset'
        }

        applyOffsetChunk(chunk)
    }

    export function resetStream(nextSource = ''): void {
        if (!canUseImperativeStreaming('resetStream')) return

        resetStreamingState(nextSource)
    }

    $effect(() => {
        return () => {
            cancelScheduledAppendFlush()
        }
    })

    $effect(() => {
        if (!streaming || hasAsyncExtension) {
            cancelScheduledAppendFlush()
            pendingStreamAppendBuffer = ''
            if (incrementalParser) clearStreamingParser()
            lastSourceProp = source
            streamInputMode = null
            streamSourceBuffer = ''
            if (streaming && hasAsyncExtension) {
                warnStreaming(
                    'streaming prop is ignored when async extensions are used. ' +
                        'Remove async extensions or set streaming={false} to silence this warning.'
                )
            }
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
            if (pendingStreamAppendBuffer !== '') {
                flushPendingAppendChunks(true)
                return
            }

            if (streamSourceBuffer === '') {
                clearStreamingParser()
                streamTokens.length = 0
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
    const tokens = $derived(
        streaming && !hasAsyncExtension
            ? streamTokens
            : hasAsyncExtension
              ? asyncTokens
              : syncTokens
    )

    $effect(() => {
        if (!tokens) return
        parsed(tokens)
    })

    const combinedRenderers = $derived({
        ...defaultRenderers,
        ...renderers,
        html: renderers.html
            ? {
                  ...defaultRenderers.html,
                  ...renderers.html
              }
            : defaultRenderers.html
    })

    // All renderer keys: built-in + extension token names
    const allRendererKeys = $derived([...rendererKeysInternal, ...extensionTokenNames])

    // Collect markdown snippet overrides (keys matching renderer names or extension token names)
    const snippetOverrides = $derived(
        Object.fromEntries(
            allRendererKeys
                .filter((key) => key in rest && rest[key] != null)
                .map((key) => [key, rest[key]])
        ) as Record<string, AnySnippet>
    )

    // Collect HTML snippet overrides (keys matching html_<tag>)
    const htmlSnippetOverrides = $derived(
        Object.fromEntries(
            Object.entries(rest)
                .filter(([key, val]) => key.startsWith('html_') && val != null)
                .map(([key, val]) => [key.slice(5), val])
        ) as Record<string, AnySnippet>
    )

    // Passthrough: everything that isn't a known snippet override
    const snippetKeySet = $derived(
        new Set([...allRendererKeys, ...Object.keys(rest).filter((k) => k.startsWith('html_'))])
    )
    const passThroughProps = $derived(
        Object.fromEntries(Object.entries(rest).filter(([key]) => !snippetKeySet.has(key)))
    )
</script>

<Parser
    {tokens}
    {...passThroughProps}
    options={combinedOptions}
    slug={(val: string): string => slugger.slug(val)}
    renderers={combinedRenderers}
    {snippetOverrides}
    {htmlSnippetOverrides}
/>
