<script lang="ts">
    import { getContext, type Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        listItemIndex?: number
    }

    const { children, listItemIndex = 0 }: Props = $props()

    let checked = $state(false)
    const myContext = getContext<{
        // trunk-ignore(eslint/no-unused-vars)
        onChange: (index: number, value: boolean) => void
    }>('CustomList') ?? {
        // trunk-ignore(eslint/no-unused-vars,eslint/@typescript-eslint/no-unused-vars)
        onChange: (index: number, value: boolean) => {
            console.warn(`CustomListItem used outside of CustomList context (index: ${index})`)
        }
    }

    const onChange = (event: Event) => {
        const target = event.currentTarget as HTMLInputElement
        checked = target.checked
        myContext.onChange(listItemIndex, checked)
    }
</script>

<li data-list-item-index={listItemIndex}>
    <input type="checkbox" bind:checked onchange={onChange} />
    {@render children?.()}
</li>
