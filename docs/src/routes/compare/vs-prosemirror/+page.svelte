<script lang="ts">
    import ComparisonPage from '$lib/components/general/ComparisonPage.svelte'
    import { getCompetitor } from '$lib/compare-data'

    const competitor = getCompetitor('vs-prosemirror')!
</script>

<ComparisonPage {competitor} />
