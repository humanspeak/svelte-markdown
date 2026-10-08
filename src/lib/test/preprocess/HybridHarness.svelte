<script lang="ts">
    import Layout from '../../../routes/test/preprocess/hybrid/+layout.svelte'
    import Proof from '../../../routes/test/preprocess/hybrid/+page.mdproof'
</script>

<Layout><Proof data={{ greeting: 'Configured renderer', start: 6 }} /></Layout>
