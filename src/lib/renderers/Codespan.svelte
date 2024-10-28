<script>
    const { raw } = $props()
</script>

<code>{raw.replace(/`/g, '')}</code>
