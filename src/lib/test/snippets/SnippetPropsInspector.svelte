<script lang="ts">
    import SvelteMarkdown from '$lib/SvelteMarkdown.svelte'

    const { source }: { source: string } = $props()
</script>

<SvelteMarkdown {source}>
    {#snippet paragraph(props)}
        <p data-testid="props-paragraph" data-raw={props.raw} data-text={props.text}>
            {@render props.children?.()}
        </p>
    {/snippet}

    {#snippet heading(props)}
        <div
            data-testid="props-heading"
            data-depth={props.depth}
            data-raw={props.raw}
            data-text={props.text}
        >
            {@render props.children?.()}
        </div>
    {/snippet}

    {#snippet link(props)}
        <a
            data-testid="props-link"
            data-href={props.href}
            data-title={props.title}
            data-raw={props.raw}
            data-text={props.text}
            href={props.href}
        >
            {@render props.children?.()}
        </a>
    {/snippet}

    {#snippet image(props)}
        <img
            data-testid="props-image"
            data-href={props.href}
            data-title={props.title}
            data-text={props.text}
            data-raw={props.raw}
            src={props.href}
            alt={props.text}
        />
    {/snippet}

    {#snippet code(props)}
        <pre
            data-testid="props-code"
            data-lang={props.lang}
            data-text={props.text}
            data-code-block-style={props.codeBlockStyle}
            data-escaped={props.escaped}><code>{props.text}</code></pre>
    {/snippet}

    {#snippet codespan(props)}
        <code data-testid="props-codespan" data-raw={props.raw} data-text={props.text}
            >{props.text ?? props.raw}</code
        >
    {/snippet}

    {#snippet blockquote(props)}
        <blockquote data-testid="props-blockquote" data-raw={props.raw} data-text={props.text}>
            {@render props.children?.()}
        </blockquote>
    {/snippet}

    {#snippet list(props)}
        <ul
            data-testid="props-list"
            data-ordered={props.ordered}
            data-start={props.start}
            data-loose={props.loose}
        >
            {@render props.children?.()}
        </ul>
    {/snippet}

    {#snippet listitem(props)}
        <li
            data-testid="props-listitem"
            data-text={props.text}
            data-task={props.task}
            data-checked={props.checked}
            data-loose={props.loose}
            data-list-item-index={props.listItemIndex}
        >
            {@render props.children?.()}
        </li>
    {/snippet}

    {#snippet em(props)}
        <em data-testid="props-em" data-raw={props.raw} data-text={props.text}>
            {@render props.children?.()}
        </em>
    {/snippet}

    {#snippet strong(props)}
        <strong data-testid="props-strong" data-raw={props.raw} data-text={props.text}>
            {@render props.children?.()}
        </strong>
    {/snippet}

    {#snippet del(props)}
        <del data-testid="props-del" data-raw={props.raw} data-text={props.text}>
            {@render props.children?.()}
        </del>
    {/snippet}

    {#snippet table(props)}
        <table data-testid="props-table">
            {@render props.children?.()}
        </table>
    {/snippet}

    {#snippet tablehead(props)}
        <thead data-testid="props-tablehead">
            {@render props.children?.()}
        </thead>
    {/snippet}

    {#snippet tablebody(props)}
        <tbody data-testid="props-tablebody">
            {@render props.children?.()}
        </tbody>
    {/snippet}

    {#snippet tablerow(props)}
        <tr data-testid="props-tablerow">
            {@render props.children?.()}
        </tr>
    {/snippet}

    {#snippet tablecell(props)}
        <td data-testid="props-tablecell" data-header={props.header} data-align={props.align}>
            {@render props.children?.()}
        </td>
    {/snippet}

    {#snippet escape(props)}
        <span data-testid="props-escape" data-text={props.text} data-raw={props.raw}
            >{props.text}</span
        >
    {/snippet}

    {#snippet text(props)}
        <span data-testid="props-text" data-raw={props.raw} data-text={props.text}>
            {@render props.children?.()}
        </span>
    {/snippet}
</SvelteMarkdown>
