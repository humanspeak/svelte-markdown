<script lang="ts">
    import SvelteMarkdown, { type Token, type TokensList } from '$lib/index.js'

    let source = `

| Syntax                                                   | Description                                                                                                                                                                                                                          |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| \`word\`                                                   | A single word will be parsed as a "word" token with no key. A \`defaultKey\` can be provided in the class options parameter.                                                                                                           |
| \`key:word\`                                               | A keyword includes a specific key to associate with the word or phrase. It will be parsed as a "keyword" token.                                                                                                                      |
| \`"a phrase"\`                                             | This syntax will be parsed as a "phrase" token. It allows you to join multiple words together into one token.                                                                                                                        |
| \`key:"a phrase"\`                                         | This syntax will be parsed as a "keyword_phrase" token. It combines the properties of the "keyword" and "phrase" tokens.                                                                                                             |
| \`/^regex$/\`                                              | This syntax will be parsed as a "regex" token. The regular expression between the \`/\` will be provided as a string and can be converted to a \`RegExp\` constructor in JS or passed to a SQL statement using supported syntax.         |
| \`key:/^regex$/\`                                          | This syntax combines the properties of the "keyword" syntax and the "regex" syntax.                                                                                                                                                  |
| \`key=10\`<br>\`key>=2024-01-01\`                            | When using numeric operators for numbers or dates, the token will become a "keyword_numeric" or "keyword_date" token with the operator provided. See below<sup>1</sup> for supported date formats.                                           |
| \`key:10..20\`<br>\`key:2024-01-01 00:00..2024-01-15 12:00\` | Range queries allow you to specify a range of values. For ranges, use \`key:start..end\`. The result will be two "keyword_numeric" or "keyword_date" tokens. See below<sup>1</sup> for supported date formats.                                  |
| \`AND\`, \`&\`<br>\`OR\`, \`\\|\`                                 | Use \`AND\`/\`&\` to require both conditions, \`OR\`/\`\\|\` for either condition. Adjacent terms default to \`AND\`.                                                                                                                           |
| \`foo (bar or baz)\`                                       | Tokens can be grouped together using parentheses. Groups can also be nested.                                                                                                                                                         |
| \`-\`<br>\`!\`                                               | The negator character can be used to negate any "word", "keyword", or "phrase" token. (Example: \`-word -"phrase"\` or \`!word !"phrase"\`) It can also be used to negate a group. (Example: \`-(word1 OR word2)\` or \`!(word1 \\| word2)\`) |

`

    const parsed = async (parsedTokens: Token[] | TokensList) => {
        console.log('displaying tokens', parsedTokens)
    }
</script>

<div class="container">
    <textarea bind:value={source} placeholder="Enter markdown here" data-testid="markdown-input">
    </textarea>
    <div class="preview">
        <SvelteMarkdown {source} {parsed} />
    </div>
</div>

<style>
    .container {
        display: flex;
        gap: 1rem;
        width: 100%;
    }

    textarea {
        width: 50%;
        min-height: 300px;
        padding: 1rem;
        font-family: monospace;
    }

    .preview {
        width: 50%;
        padding: 1rem;
        border: 1px solid #ccc;
        border-radius: 4px;
    }
</style>
