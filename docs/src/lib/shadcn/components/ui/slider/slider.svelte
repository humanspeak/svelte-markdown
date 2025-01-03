<script lang="ts">
    import { Slider as SliderPrimitive, type WithoutChildrenOrChild } from 'bits-ui'
    import { cn } from '$lib/shadcn/utils.js'

    let {
        ref = $bindable(null),
        value = $bindable(),
        class: className,
        ...restProps
    }: WithoutChildrenOrChild<SliderPrimitive.RootProps> = $props()
</script>

<!--
Discriminated Unions + Destructing (required for bindable) do not
get along, so we shut typescript up by casting `value` to `never`.
-->
<SliderPrimitive.Root
    bind:value={value as never}
    bind:ref
    class={cn('relative flex w-full touch-none select-none items-center', className)}
    {...restProps}
>
    {#snippet children({ thumbs })}
        <span class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
            <SliderPrimitive.Range class="absolute h-full bg-primary" />
        </span>
        {#each thumbs as thumb}
            <SliderPrimitive.Thumb
                index={thumb}
                class="block size-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
            />
        {/each}
    {/snippet}
</SliderPrimitive.Root>
