<script lang="ts">
    interface Footnote {
        id: string
        text: string
    }

    interface Props {
        footnotes: Footnote[]
    }

    const { footnotes }: Props = $props()
</script>

<section class="footnotes" role="doc-endnotes">
    <ol>
        {#each footnotes as { id, text } (id)}
            <li id="fn-{id}">
                <p>
                    {text}
                    <a href="#fnref-{id}" class="footnote-backref" role="doc-backlink">&#8617;</a>
                </p>
            </li>
        {/each}
    </ol>
</section>
