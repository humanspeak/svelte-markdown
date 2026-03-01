<script lang="ts">
    import { iconMap, type IconName } from '$lib/icons'

    const { name, class: className = 'size-4' }: { name: IconName; class?: string } = $props()

    const Component = $derived(iconMap[name])
</script>

<Component class={className} />
