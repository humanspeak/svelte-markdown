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
    }>('CustomList')

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
