import type { SvelteMarkdownOptions } from '$lib/types.js'
import { defaultOptions } from '$lib/utils/markdown-parser.js'
import { Marked, type MarkedExtension } from 'marked'

type ExtensionIdentityRecord = Record<string, unknown>

let extensionIdentityId = 0
const extensionIdentityIds = new WeakMap<object, number>()

const getExtensionIdentityId = (value: object) => {
    let id = extensionIdentityIds.get(value)
    if (!id) {
        id = ++extensionIdentityId
        extensionIdentityIds.set(value, id)
    }

    return id
}

const getFunctionIdentityId = (value: unknown) =>
    typeof value === 'function' ? getExtensionIdentityId(value) : null

/**
 * Gets the custom token names declared by Marked extensions.
 *
 * @param extensions Marked extensions passed to the component.
 * @returns Token names that can be rendered by custom renderers or snippets.
 */
export const getExtensionTokenNames = (extensions: MarkedExtension[]) =>
    extensions.flatMap(
        (extension) => extension.extensions?.map((tokenizer) => tokenizer.name) ?? []
    )

/**
 * Gets Marked's resolved defaults for a set of extensions.
 *
 * @param extensions Marked extensions to resolve in a scoped Marked instance.
 * @returns Marked defaults contributed by the extensions, or an empty object.
 */
export const getExtensionDefaults = (extensions: MarkedExtension[]) =>
    extensions.length > 0 ? new Marked(...extensions).defaults : {}

/**
 * Checks whether any extension requires async token walking.
 *
 * @param extensions Marked extensions passed to the component.
 * @returns True when at least one extension has `async: true`.
 */
export const hasAsyncExtension = (extensions: MarkedExtension[]) =>
    extensions.some((extension) => extension.async === true)

/**
 * Builds an internal cache signature from extension object identity.
 *
 * The token cache serializes parser options, so opaque extension objects need
 * stable WeakMap IDs to invalidate cached tokens when callers replace an
 * equivalent-looking extension with different closure state.
 *
 * @param extensions Marked extensions used to configure parsing.
 * @returns Serializable identity records included in parser cache inputs.
 */
export const getExtensionCacheSignature = (extensions: MarkedExtension[]) =>
    extensions.map((extension) => ({
        extension: getExtensionIdentityId(extension),
        async: extension.async ?? false,
        extensions:
            extension.extensions?.map((tokenizer) => {
                const tokenizerRecord = tokenizer as unknown as ExtensionIdentityRecord

                return {
                    token: getExtensionIdentityId(tokenizer),
                    name: tokenizer.name,
                    level: tokenizerRecord.level ?? null,
                    childTokens: tokenizerRecord.childTokens ?? null,
                    start: getFunctionIdentityId(tokenizerRecord.start),
                    tokenizer: getFunctionIdentityId(tokenizerRecord.tokenizer),
                    renderer: getFunctionIdentityId(tokenizerRecord.renderer)
                }
            }) ?? null,
        hooks: extension.hooks ? getExtensionIdentityId(extension.hooks) : null,
        renderer: extension.renderer ? getExtensionIdentityId(extension.renderer) : null,
        tokenizer: extension.tokenizer ? getExtensionIdentityId(extension.tokenizer) : null,
        walkTokens: getFunctionIdentityId(extension.walkTokens)
    }))

/**
 * Builds the complete parser options object used by sync and async parsing.
 *
 * @param options Caller-provided parser options.
 * @param extensions Marked extensions passed to the component.
 * @returns Parser options merged with defaults, extension defaults, and cache signature.
 */
export const buildParserOptions = (
    options: Partial<SvelteMarkdownOptions>,
    extensions: MarkedExtension[]
): SvelteMarkdownOptions => {
    const extensionDefaults = getExtensionDefaults(extensions)
    const extensionCacheSignature =
        extensions.length > 0 ? getExtensionCacheSignature(extensions) : undefined

    return {
        ...defaultOptions,
        ...extensionDefaults,
        ...options,
        ...(extensionCacheSignature
            ? { _svelteMarkdownExtensionCacheSignature: extensionCacheSignature }
            : {})
    }
}
