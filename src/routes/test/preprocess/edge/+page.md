# Edge cases

Curly braces: {not_a_svelte_expression} and {@html "nope"}

Backticks in a template: `` `${danger}` ``

Raw HTML: <span class="raw">inline html</span>

A literal script tag in a fenced block:

```html
<script>
    alert('xss')
</script>
```

Svelte-ish component syntax: <Counter count={5} />
