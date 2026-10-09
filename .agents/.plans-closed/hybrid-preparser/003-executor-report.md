# Executor report — 003 HTML routing, round 1

Verbatim Opus 5.5 terminal report.

```text
I wrote the plan 003 design report, and it recommends routing authored HTML by how the Svelte parser classifies each node. Lowercase elements with only static attributes, including custom elements like `<my-widget>`, go back through our renderer and sanitizers. Uppercase and dotted components like `<TypedCounter>` and `<UI.Card>` stay compiled Svelte with normal typed props. No new delimiters are needed. The report proposes this design; it doesn't authorize implementing it.

**Output:** `.agents/.plans/hybrid-preparser/003-html-routing-design.md` is the only file I created, and it is untracked. Nothing else in the repo changed and nothing was committed. HEAD is still `5fae1e2`.

## Pre-flight
- `git status` was clean on the branch at `5fae1e2`.
- The scoped drift check (`git diff --stat e6195d0..HEAD -- …/003-html-routing-design.md`) was empty.
- Between `e6195d0` and HEAD, plans 001 and 002 changed only `SvelteMarkdown.svelte`, tests, `README.md` and plan files. None of the files plan 003 reads changed.
- There is no `Html.svelte`. The plan's placeholder means the tag-to-component map in `src/lib/renderers/html/index.ts` plus the HTML branch in `Parser.svelte` (lines 560–595).

## What the probes showed
I ran small Node scripts against the installed packages (svelte 5.57.1, Node 24). Scripts lived in `/tmp/sm003probe` and were deleted afterwards; no repo files or fixtures were created.

1. **The Svelte parser already makes the split we need.** `<section>`, `<my-widget>` and `<svg>` come back as `RegularElement`. `<TypedCounter>`, `<UI.Card>`, `<Section>` and `<DIV>` come back as `Component`. Each attribute is marked as static text, an expression, a spread or a directive. Blocks, `{@html}`/`{@const}`/`{@render}` and `svelte:*` elements each have their own node type. Markdown inside a component is a single `Text` node.
2. **Static HTML can be turned into renderer tokens at build time.**
   - Running the existing `shrinkHtmlTokens` after Marked gives a structured `section` token. Markdown inside it becomes real tokens, and a reference link resolves from a definition outside the element.
   - Island markers placed inside an element nest correctly, both inline and as blocks, including inside raw HTML blocks.
   - The tokens survive a JSON round trip unchanged.
   - Attributes like `onclick` and `javascript:` URLs are still raw at build time, so sanitizing stays a render-time step.
   - Today's `preparseTokens` throws on all of these inputs.
3. **A capitalized tag that isn't imported compiles silently.** `<Callout>`, `<UI.Card>` and `<my-widget data={obj}>` compile with no warnings, and `Callout`/`UI.Card` end up as unresolved references in the output. So a component the author expects a layout to supply breaks with no build-time error. I didn't mount it, so the runtime failure itself is unconfirmed.

## Recommendation and tradeoffs
- **Routing:** static lowercase HTML goes to the renderer, so `renderers.html`, `html_<tag>` snippets and the sanitizers apply exactly as they do for CMS strings. Compiled code nested inside such an element becomes a nested island.
- **Kept compiled for now:** lowercase elements with dynamic attributes, spreads or directives, plus all expressions, blocks and tags. They still bypass the sanitizers, as today, and the report says so explicitly.
- **Who sanitizes:** renderer-routed HTML is sanitized at render time by whatever `sanitizeUrl`/`sanitizeAttributes` the consumer passes or sets in the layout. Compiled code is trusted application source with only Svelte's normal escaping. CMS strings are unchanged and still never run expressions.
- **Layout renderers vs imported components:** components a layout registers always get the attributes bag. Components imported in the page always get typed props.
- **Markdown inside static HTML** starts rendering, and document-wide reference definitions keep working there. Markdown inside components and control flow still renders as text; that stays deferred.
- **Downsides:**
  - Two parsers have to agree on where an element ends.
  - CommonMark's blank-line rules now decide whether Markdown inside routed HTML renders.
  - Default sanitizing now strips things like `javascript:` links from authored HTML.
  - An unregistered custom element loses its wrapper tag under the current fallback (`Parser.svelte:588-595`), which a native compile would keep.
- **Next step:** the smallest next step is routing only top-level static elements that have nothing compiled inside them, with seven failing tests to write first and its own stop conditions. Scope-based handling of components has to wait for plan 005.
- **Alternatives compared:** compile everything (today's behaviour), the recommended split, and an adapter that would pass dynamic attributes through the renderer and sanitizers. Whether that adapter can work is unknown. Re-parsing HTML at runtime is ruled out.

## Choices still open
- **Capitalized tags that aren't imported:** route them as lowercase HTML (my recommendation), or fail the build.
- **Unregistered custom elements:** keep the library's current behaviour of dropping the wrapper, or emit the element anyway.
- **Dynamic attributes:** keep them compiled for good, or build the adapter.
- **Default sanitizing of authored HTML:** apply the same defaults as CMS strings (my recommendation), or relax them for trusted files.
- **When the two parsers disagree on where an element ends:** fail the build, or compile that element natively.
- **Markdown inside components:** still deferred.

## Checks
- All nine required `## ` headings are present (`rg '^## '`).
- `trunk fmt` on the report exited 0; it only reformatted the report's table widths.
- `trunk check` on the report exited 0 with no issues.
- `git diff --check` exits 0 but skips untracked files. A separate `git diff --no-index --check /dev/null <report>` printed no whitespace errors (its exit code 1 only means the file differs from `/dev/null`).
- `git diff --name-only` is empty.

## Assumptions and what I couldn't verify
- Nothing was mounted, server-rendered or hydrated. I didn't confirm that nested islands render through `Parser`, or that renderer switching and the sanitizers work for routed HTML.
- I didn't check how the two parsers disagree on element boundaries on real pages, or how attribute entities round-trip.
- Nothing was measured, so the report claims no performance or payload advantage and no full mdsvex parity.
- Undeclared components failing at runtime is inferred from the compiled output, not observed.
- I assumed the installed `node_modules` matches the lockfile; I didn't reinstall.

Three authentication notices came up this session: claude.ai Granola and claude.ai Slack need authorizing in claude.ai connector settings, and plugin:posthog:posthog needs authorizing via `claude mcp` or `/mcp`. None were needed for this task.
```
