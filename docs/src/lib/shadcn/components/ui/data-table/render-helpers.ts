import type { Component, ComponentProps, Snippet } from 'svelte'

/**
 * A helper class to make it easy to identify Svelte components in
 * `columnDef.cell` and `columnDef.header` properties.
 *
 * > NOTE: This class should only be used internally by the adapter. If you're
 * reading this and you don't know what this is for, you probably don't need it.
 *
 * @example
 * ```svelte
 * {@const result = content(context as any)}
 * {#if result instanceof RenderComponentConfig}
 *   {@const { component: Component, props } = result}
 *   <Component {...props} />
 * {/if}
 * ```
 */
export class RenderComponentConfig<TComponent extends Component> {
    component: TComponent
    props: ComponentProps<TComponent> | Record<string, never>
    constructor(
        component: TComponent,
        props: ComponentProps<TComponent> | Record<string, never> = {}
    ) {
        this.component = component
        this.props = props
    }
}

/**
 * A helper class to make it easy to identify Svelte Snippets in `columnDef.cell` and `columnDef.header` properties.
 *
 * > NOTE: This class should only be used internally by the adapter. If you're
 * reading this and you don't know what this is for, you probably don't need it.
 *
 * @example
 * ```svelte
 * {@const result = content(context as any)}
 * {#if result instanceof RenderSnippetConfig}
 *   {@const { snippet, params } = result}
 *   {@render snippet(params)}
 * {/if}
 * ```
 */
export class RenderSnippetConfig<TProps> {
    snippet: Snippet<[TProps]>
    params: TProps
    constructor(snippet: Snippet<[TProps]>, params: TProps) {
        this.snippet = snippet
        this.params = params
    }
}

/**
 * Creates a configuration object for rendering a Svelte component in a table cell or header.
 *
 * Use this function with Svelte components to generate a {@link RenderComponentConfig} for use in column definitions.
 *
 * @param component - The Svelte component to render.
 * @param props - Optional props to pass to the component.
 * @returns A {@link RenderComponentConfig} instructing the table how to render the component.
 *
 * @example
 * const columns = [
 *   columnHelper.accessor('name', {
 *     header: header => renderComponent(SortHeader, { label: 'Name', header }),
 *   }),
 * ];
 *
 * @see {@link https://tanstack.com/table/latest/docs/guide/column-defs}
 */
export function renderComponent<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    T extends Component<any>,
    Props extends ComponentProps<T>
>(component: T, props: Props = {} as Props) {
    return new RenderComponentConfig(component, props)
}

/**
 * Creates a configuration object for rendering a Svelte snippet in a table column cell or header.
 *
 * Use this function to specify a Svelte snippet and its parameters for use with table column definitions. Intended only for snippets; for Svelte components, use {@link renderComponent}.
 *
 * @param snippet - The Svelte snippet function to render.
 * @param params - Parameters to pass to the snippet. Defaults to an empty object.
 * @returns A {@link RenderSnippetConfig} describing how to render the snippet in the table.
 *
 * @example
 * // +page.svelte
 * const defaultColumns = [
 *   columnHelper.accessor('name', {
 *     cell: cell => renderSnippet(nameSnippet, { name: cell.row.name }),
 *   }),
 *   columnHelper.accessor('state', {
 *     cell: cell => renderSnippet(stateSnippet, { state: cell.row.state }),
 *   }),
 * ]
 *
 * @see {@link https://tanstack.com/table/latest/docs/guide/column-defs}
 */
export function renderSnippet<TProps>(snippet: Snippet<[TProps]>, params: TProps = {} as TProps) {
    return new RenderSnippetConfig(snippet, params)
}
