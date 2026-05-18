<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'
    import Tip from '$lib/test/issues/issue-297/Tip.svelte'

    const source = `<Tip title="foo bar baz">

Hello world.

</Tip>
`
</script>

<main>
    <h2>Issue 297: Incorrect HTML properties passed</h2>
    <p>
        Reproduces <a href="https://github.com/humanspeak/svelte-markdown/issues/297">issue #297</a
        >. The custom <code>&lt;Tip&gt;</code> tag has a single
        <code>title</code> attribute whose value contains spaces. The renderer below shows the attributes
        object it actually received.
    </p>

    <h3>Expected</h3>
    <pre><code
            >{`{
  "title": "foo bar baz"
}`}</code
        ></pre>

    <h3>Actual</h3>
    <div data-testid="issue-297-output">
        <SvelteMarkdown {source} renderers={{ html: { Tip } }} />
    </div>
</main>
