import type { Tooltip } from 'layerchart'
import { getContext, setContext, type Component, type ComponentProps, type Snippet } from 'svelte'

export const THEMES = { light: '', dark: '.dark' } as const

export type ChartConfig = {
    [k in string]: {
        label?: string
        icon?: Component
    } & (
        | { color?: string; theme?: never }
        | { color?: never; theme: Record<keyof typeof THEMES, string> }
    )
}

export type ExtractSnippetParams<T> = T extends Snippet<[infer P]> ? P : never

export type TooltipPayload = ExtractSnippetParams<
    ComponentProps<typeof Tooltip.Root>['children']
>['payload'][number]

/**
 * Retrieves a chart configuration entry corresponding to a given key from a tooltip payload.
 *
 * Attempts to resolve the most appropriate config key by inspecting the payload and its nested payload object, matching against the provided key, `key` and `name` properties, or string properties within the payload.
 *
 * @param config - The chart configuration object to search.
 * @param payload - The tooltip payload object containing possible key references.
 * @param key - The key to resolve within the payload and config.
 * @returns The matching configuration entry if found; otherwise, `undefined`.
 */
export function getPayloadConfigFromPayload(
    config: ChartConfig,
    payload: TooltipPayload,
    key: string
) {
    if (typeof payload !== 'object' || payload === null) return undefined

    const payloadPayload =
        'payload' in payload && typeof payload.payload === 'object' && payload.payload !== null
            ? payload.payload
            : undefined

    let configLabelKey: string = key

    if (payload.key === key) {
        configLabelKey = payload.key
    } else if (payload.name === key) {
        configLabelKey = payload.name
    } else if (key in payload && typeof payload[key as keyof typeof payload] === 'string') {
        configLabelKey = payload[key as keyof typeof payload] as string
    } else if (
        payloadPayload &&
        key in payloadPayload &&
        typeof payloadPayload[key as keyof typeof payloadPayload] === 'string'
    ) {
        configLabelKey = payloadPayload[key as keyof typeof payloadPayload] as string
    }

    return configLabelKey in config ? config[configLabelKey] : config[key as keyof typeof config]
}

type ChartContextValue = {
    config: ChartConfig
}

const chartContextKey = Symbol('chart-context')

/**
 * Sets the chart configuration context for descendant Svelte components.
 *
 * Makes the provided chart configuration available to child components via Svelte's context API.
 */
export function setChartContext(value: ChartContextValue) {
    return setContext(chartContextKey, value)
}

/**
 * Retrieves the current chart context value from Svelte's context API.
 *
 * @returns The current {@link ChartContextValue}, or `undefined` if no chart context is set.
 */
export function useChart() {
    return getContext<ChartContextValue>(chartContextKey)
}
