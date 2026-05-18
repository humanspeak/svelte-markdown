<script lang="ts">
    import type { HtmlSnippetProps } from '$lib/index.js'

    let { attributes }: HtmlSnippetProps = $props()
</script>

<pre data-testid="issue-297-attributes"><code>{JSON.stringify(attributes, null, 2)}</code></pre>
