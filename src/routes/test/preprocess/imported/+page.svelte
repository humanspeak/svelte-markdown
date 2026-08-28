<script lang="ts">
    import Content, { metadata } from './content.md'
</script>

<h1 data-testid="fragment-title">{metadata.title}</h1>

<section data-testid="fragment-body">
    <Content />
</section>
