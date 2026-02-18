<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import ClickRenderer from '$lib/test/snippets/ClickRenderer.svelte'
</script>

<div data-testid="custom-tags-test">
    <h2>Component Renderer</h2>
    <div data-testid="component-section">
        <SvelteMarkdown
            source="<click>Component Click</click>"
            renderers={{ html: { click: ClickRenderer } }}
        />
    </div>

    <h2>Snippet Override</h2>
    <div data-testid="snippet-section">
        <SvelteMarkdown source="<click data-action=&quot;submit&quot;>Snippet Click</click>">
            {#snippet html_click({ attributes, children })}
                <button {...attributes} data-testid="custom-tag-snippet"
                    >{@render children?.()}</button
                >
            {/snippet}
        </SvelteMarkdown>
    </div>

    <h2>Snippet Precedence</h2>
    <div data-testid="precedence-section">
        <SvelteMarkdown
            source="<click>Precedence Click</click>"
            renderers={{ html: { click: ClickRenderer } }}
        >
            {#snippet html_click({ attributes, children })}
                <button {...attributes} data-testid="custom-tag-snippet"
                    >{@render children?.()}</button
                >
            {/snippet}
        </SvelteMarkdown>
    </div>

    <h2>Standard Tags Unaffected</h2>
    <div data-testid="standard-section">
        <SvelteMarkdown source="<div class=&quot;normal&quot;>Standard div</div>">
            {#snippet html_click({ attributes, children })}
                <button {...attributes} data-testid="custom-tag-snippet"
                    >{@render children?.()}</button
                >
            {/snippet}
        </SvelteMarkdown>
    </div>
</div>
