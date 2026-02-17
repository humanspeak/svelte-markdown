<script lang="ts">
    import { getBreadcrumbContext } from '$lib/components/contexts/Breadcrumb/Breadcrumb.context'
    import { getSeoContext } from '$lib/components/contexts/Seo/Seo.context'
    import Example from '$lib/components/general/Example.svelte'
    import TtlExpiration from '$lib/examples/TtlExpiration.svelte'

    const breadcrumbs = getBreadcrumbContext()
    $effect(() => {
        if (breadcrumbs) {
            breadcrumbs.breadcrumbs = [
                { title: 'Examples', href: '/examples' },
                { title: 'TTL Expiration' }
            ]
        }
    })

    const seo = getSeoContext()
    if (seo) {
        seo.title = 'TTL Expiration | Examples | Memory Cache'
        seo.description =
            'Watch cache entries expire in real-time with countdown timers. Explore how TTL-based expiration works in @humanspeak/memory-cache with this interactive demo.'
    }
</script>

<Example title="TTL Expiration">
    <TtlExpiration />
</Example>
