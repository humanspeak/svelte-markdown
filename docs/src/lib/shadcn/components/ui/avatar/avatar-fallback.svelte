<script lang="ts">
    import { Avatar as AvatarPrimitive } from 'bits-ui'
    import { cn } from '$lib/shadcn/utils.js'

    let {
        ref = $bindable(null),
        class: className,
        ...restProps
    }: AvatarPrimitive.FallbackProps = $props()
</script>

<AvatarPrimitive.Fallback
    bind:ref
    class={cn('flex size-full items-center justify-center bg-muted', className)}
    {...restProps}
/>
