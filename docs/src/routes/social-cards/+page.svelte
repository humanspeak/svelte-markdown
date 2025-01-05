<script lang="ts">
    import { page } from '$app/state'
    import OG from '$lib/components/OG.svelte'

    const cardType: 'og' | 'twitter' = $derived(page.url.searchParams.get('type') || 'og') as
        | 'og'
        | 'twitter'
</script>

<OG type={cardType} url={page.url.origin} />
