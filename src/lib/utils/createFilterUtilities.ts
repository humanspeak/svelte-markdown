import type { Component } from 'svelte'

/**
 * Generic component type for filter utilities.
 * Allows Component, undefined, or null values.
 */
type FilterComponent = Component<any, any, any> | undefined | null // eslint-disable-line @typescript-eslint/no-explicit-any

/**
 * Creates a set of filter utility functions for renderer maps.
 * This factory generates three functions: buildUnsupported, allowOnly, and excludeOnly.
 *
 * Used to eliminate code duplication between unsupportedRenderers.ts and unsupportedHtmlRenderers.ts.
 *
 * @template TKey - The string literal type for valid keys
 * @template TResult - The result map type (e.g., Partial<Renderers> or HtmlRenderers)
 *
 * @param keys - Array of valid keys for this renderer type
 * @param unsupportedComponent - The component to use for unsupported/disabled renderers
 * @param defaultsMap - Map of keys to their default component implementations
 *
 * @returns Object containing buildUnsupported, allowOnly, and excludeOnly functions
 *
 * @example
 * ```typescript
 * import { createFilterUtilities } from './createFilterUtilities'
 *
 * type MyKey = 'foo' | 'bar' | 'baz'
 * const keys: readonly MyKey[] = ['foo', 'bar', 'baz'] as const
 * const UnsupportedComponent = () => null
 * const defaults = { foo: FooComponent, bar: BarComponent, baz: BazComponent }
 *
 * const { buildUnsupported, allowOnly, excludeOnly } = createFilterUtilities<MyKey, Record<MyKey, Component>>(
 *     keys,
 *     UnsupportedComponent,
 *     defaults
 * )
 *
 * // Block all renderers
 * const allUnsupported = buildUnsupported()
 *
 * // Allow only 'foo' and 'bar', block 'baz'
 * const allowList = allowOnly(['foo', 'bar'])
 *
 * // Block only 'baz', allow others with defaults
 * const denyList = excludeOnly(['baz'])
 * ```
 */
export const createFilterUtilities = <
    TKey extends string,
    TResult extends Record<string, FilterComponent>
>(
    keys: readonly TKey[],
    unsupportedComponent: FilterComponent,
    defaultsMap: Record<TKey, FilterComponent>
): {
    buildUnsupported: () => TResult
    allowOnly: (_allowed: Array<TKey | [TKey, FilterComponent]>) => TResult
    excludeOnly: (_excluded: TKey[], _overrides?: Array<[TKey, FilterComponent]>) => TResult
} => {
    /**
     * Checks if a key is valid for this renderer type.
     */
    const hasKey = (key: TKey): boolean => keys.includes(key)

    /**
     * Builds a map where every key is set to the unsupported component.
     * Useful for starting with a "deny all" approach.
     */
    const buildUnsupported = (): TResult => {
        const result = {} as TResult
        for (const key of keys) {
            ;(result as Record<TKey, FilterComponent>)[key] = unsupportedComponent
        }
        return result
    }

    /**
     * Produces a renderer map that allows only the specified keys.
     * All non-listed keys are set to the unsupported component.
     *
     * Each entry can be either:
     * - A key string (to use the default component for that key)
     * - A tuple [key, component] to specify a custom component
     */
    const allowOnly = (allowed: Array<TKey | [TKey, FilterComponent]>): TResult => {
        const result = buildUnsupported()

        for (const entry of allowed) {
            if (Array.isArray(entry)) {
                const [key, component] = entry
                if (hasKey(key)) {
                    ;(result as Record<TKey, FilterComponent>)[key] = component
                }
            } else {
                const key = entry
                if (hasKey(key)) {
                    ;(result as Record<TKey, FilterComponent>)[key] = defaultsMap[key]
                }
            }
        }

        return result
    }

    /**
     * Produces a renderer map that excludes only the specified keys.
     * Excluded keys are set to the unsupported component.
     * All other keys use the default components.
     *
     * Optionally, specific non-excluded keys can be overridden with custom components.
     * Exclusions take precedence over overrides.
     */
    const excludeOnly = (excluded: TKey[], overrides?: Array<[TKey, FilterComponent]>): TResult => {
        const result = {} as TResult

        // Start with all defaults
        for (const key of keys) {
            ;(result as Record<TKey, FilterComponent>)[key] = defaultsMap[key]
        }

        // Mark excluded keys as unsupported
        for (const key of excluded) {
            if (hasKey(key)) {
                ;(result as Record<TKey, FilterComponent>)[key] = unsupportedComponent
            }
        }

        // Apply overrides (exclusions take precedence)
        if (overrides) {
            for (const [key, component] of overrides) {
                if (excluded.includes(key)) continue
                if (hasKey(key)) {
                    ;(result as Record<TKey, FilterComponent>)[key] = component
                }
            }
        }

        return result
    }

    return {
        buildUnsupported,
        allowOnly,
        excludeOnly
    }
}
