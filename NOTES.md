# Investigation: markdown preprocessor for `.md` files

Working notes for the branch `investigate/issue-372-md-preprocessor`.

- Issue: [#372 — Automatically wrap `.md` files](https://github.com/humanspeak/svelte-markdown/issues/372)
- Bug filed from this work: [#383 — self-closing custom tags dropped](https://github.com/humanspeak/svelte-markdown/issues/383)

**Status: prototype / spike. Not a shipping decision.** Everything here lives in
the working tree to answer "is this feasible and what breaks", not to be
released as-is. See [Open questions](#open-questions) before building on it.

## The ask

`@tobiasBora` wants `+page.md` files rendered automatically by this library the
way mdsvex renders `.svx`, with custom components declared once in a layout. The
motivating use case is a project mixing **dynamic** content (git-based or
headless CMS) with **static** pages: a preprocessor alone can't handle the
dynamic half, so they'd rather maintain one library for both. They also asked
whether it would work with SSR and static site generation.

## What was built

| Path                                         | Purpose                                                         |
| -------------------------------------------- | --------------------------------------------------------------- |
| `src/lib/preprocess/index.js`                | The preprocessor. Markdown in, Svelte component out.            |
| `src/lib/preprocess/frontmatter.js`          | Minimal YAML front matter parser (scalars + inline arrays).     |
| `src/lib/preprocess/script-block.js`         | Extracts leading `<script>` blocks, collects component imports. |
| `src/lib/preprocess/MarkdownDocument.svelte` | Wrapper merging layout config + file-local components.          |
| `src/lib/preprocess/context.ts`              | `setMarkdownDocumentContext()` for layout-declared renderers.   |
| `src/lib/preprocess/ambient.d.ts`            | `declare module '*.md'` so TypeScript resolves `.md` imports.   |
| `src/routes/test/preprocess/**`              | Six fixture routes exercising each behaviour.                   |

Wiring lives in `svelte.config.js` (`extensions: ['.svelte', '.md']` plus the
preprocessor, which **must** run before `vitePreprocess()`).

The generated component is deliberately thin — front matter becomes a module
export, the body becomes a runtime string handed to `<SvelteMarkdown>`:

```svelte
<script module>
    export const metadata = { title: '...' }
</script>

<script>
    import Document__ from '@humanspeak/svelte-markdown/document'
    const source__ = '# the markdown body'
</script>

<Document__ source={source__} />
```

## Running it

```bash
pnpm dev   # http://localhost:8233/test/preprocess
```

Routes: `/test/preprocess` (page + layout renderers), `/imported` (import as a
component), `/edge` (hostile markdown), `/raw` (`?raw` import), `/with-load`
(load function + prerender), `/components` (script-block component imports).

**Gotcha:** the preprocessor is loaded once at dev-server startup. Editing
anything under `src/lib/preprocess/` requires a **full restart** — HMR will
happily serve stale output and make you chase phantom bugs.

## What works

- `+page.md` routing, fully server-rendered.
- Custom renderers declared once in a `+layout.svelte` via context.
- Front matter exported as `metadata`; `import Doc, { metadata } from './x.md'`.
- **Prerendering / SSG** — produces fully rendered static HTML. This answers the
  SSR/SSG question in #372 directly.
- Svelte components inside markdown, mdsvex-style, via a leading `<script>`
  block whose capitalized imports are auto-registered as HTML tag renderers.
- `?raw` imports still work — Vite short-circuits before the Svelte plugin.
- HMR on `.md` edits (page reload, same as mdsvex).
- Toolchain green: `pnpm check` 0 errors, `pnpm build` + publint clean,
  997 tests passing, coverage 96.4 / 91.3 / 96.4 / 97.8, `trunk check` clean.

## What does not work

### Fixed during the spike

`</script>` anywhere in the markdown — very common inside fenced code blocks —
closed the generated script block early and killed the Svelte parser with
`Unterminated string constant`. `JSON.stringify` is not sufficient on its own;
`</` is now escaped to `<\/`, which is inert in JS but invisible to the HTML
tokenizer. Regression test: `preprocess.test.ts`.

### Library limitations (tracked in #383, not preprocessor bugs)

These reproduce with plain `<SvelteMarkdown>` and custom `renderers.html` keys:

- `<Counter />` self-closing custom tags are **silently dropped**.
- Tag-name casing resolves differently inline vs nested, so the same component
  needs different registration keys depending on nesting depth.
- `<Counter></Counter>` leaks its raw opening tag into the output as text.

Until #383 is fixed, the paired form `<Counter attr="x">child</Counter>` is the
only reliable syntax.

### Architectural — will not change

- **No expression props.** `start={6}` never becomes an attribute; props are
  inert strings. mdsvex compiles to real Svelte template syntax, so its props
  are live JavaScript. Here the markdown is a runtime string parsed by
  marked/htmlparser2, so the compiler never sees the interpolation.
- **No access to load data.** `{data.greeting}` renders as literal text. A
  `+page.md` cannot reach its `+page.ts` load result, and cannot declare
  `export const prerender` itself — it needs a sibling `+page.ts`.

### Accepted trade-offs in this implementation

- Script blocks are extracted **only from the top of the file**. Scanning the
  whole document would wrongly capture `<script>` inside fenced code blocks —
  the `/edge` fixture proves this is a real hazard. mdsvex allows them anywhere.
- Front matter parsing is a minimal YAML subset. Nested maps, block sequences
  and multi-line strings are unsupported; a real implementation should delegate
  to a YAML library.
- `extensions: ['.md']` is repo-wide — every `.md` the bundler resolves becomes
  a Svelte component. Safe here (no `.md` under `src/`), but a consumer with a
  content directory would want opt-in scoping or an `.svx`-style extension.
- markdownlint lints `.md` route files as if they were prose. The fixtures are
  ignored in `.trunk/trunk.yaml`; consumers would hit the same friction.

## Open questions

1. **Ship it at all?** `CLAUDE.md` non-goals exclude a bundled DOM sanitizer,
   remote fetching and WYSIWYG — a preprocessor is not excluded, but it is a
   meaningfully larger maintenance surface than a single component.
2. **If shipped, where?** A separate entry point (`/preprocess`, `/document`)
   keeps it out of the main bundle. It also needs a real YAML dependency.
3. **Fix #383 first regardless.** Those bugs affect current users who register
   custom tag names today, independent of whether this preprocessor ships.
4. **Honest framing for #372:** this delivers "render `.md` as pages/components
   with shared custom renderers, including static builds" — genuinely useful,
   and it does unify the dynamic-CMS and static-page paths behind one renderer.
   It is not a drop-in mdsvex replacement, and shouldn't be sold as one.
