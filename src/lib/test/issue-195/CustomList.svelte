<script lang="ts">
    import { setContext, type Snippet } from 'svelte'

    interface Props {
        children?: Snippet
        index?: number
        start?: number
        ordered?: boolean
        items?: HTMLInputElement[]
    }

    const { ordered = false, start = 1, index = 0, items = [], children }: Props = $props()

    const checked = $state(items.map(() => false))

    const onChange = (index: number, value: boolean) => {
        console.log('onChange', index, value)
        checked[index] = value
        console.log('checked', $state.snapshot(checked))
    }

    setContext('CustomList', {
        index,
        items,
        onChange
    })
</script>

{#if ordered}
    <ol {start}>{@render children?.()}</ol>
{:else}
    <ul>{@render children?.()}</ul>
{/if}
