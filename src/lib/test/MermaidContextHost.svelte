<!--
Test-only host that sets the shared Mermaid engine context before mounting
`MermaidRenderer`, so the resolution-order tests can exercise the context
channel without a full `SvelteMarkdown` tree.
-->
<script lang="ts">
    import { setContext } from 'svelte'
    import MermaidRenderer from '../extensions/mermaid/MermaidRenderer.svelte'
    import { MERMAID_ENGINE_CONTEXT_KEY } from '../extensions/mermaid/mermaidContext.js'
    import type { MermaidEngine } from '../extensions/mermaid/mermaidEngine.js'

    interface Props {
        contextEngine?: MermaidEngine
        propEngine?: MermaidEngine
        text: string
    }

    const { contextEngine, propEngine, text }: Props = $props()

    // Context is read once at init by MermaidRenderer; the initial value is
    // the intended one.
    // svelte-ignore state_referenced_locally
    setContext(MERMAID_ENGINE_CONTEXT_KEY, contextEngine)
</script>

<MermaidRenderer {text} engine={propEngine} />
