<script>
    import Markdown from '$lib/test/issues/issue-214/Markdown.svelte'
</script>

<main>
    <h2>Supported markdown types:</h2>
    <Markdown
        source={`**strong** __strong too__\n
*Italic* _italic too_\n
[Link](http://a.com)\n
<http://autolink.baz>\n
* Unordered list item
* Unordered list item
* Unordered list item
1. One
2. Two
3. Three
\n
text \`Inline code\` more text\n`}
    />

    <h2>Unsupported markdown types:</h2>
    <Markdown
        source={`# Header
> Blockquote

![image](https://picsum.photos/150/150 "title")\n

<strong>any html</strong>

<span>asdf</span>`}
    />

    <h2>The issue</h2>
    <p>
        The issue is that I get &lt;strong&gt; and &lt;span&gt; instead of &lt;strong&gt;any
        html&lt;/strong&gt; and &lt;span&gt;asdf&lt;/span&gt;
    </p>
</main>

<style>
</style>
