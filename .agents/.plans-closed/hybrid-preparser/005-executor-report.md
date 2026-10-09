# Executor report — 005 Svelte scope/root placement, round 1

Verbatim Opus 5.5 terminal report.

```text
Plan 005 is done and every gate passes, all run one after another. Authored snippets now keep document scope and work in real SSR and client rendering, and top-level root-only elements compile at the component root. Nothing is committed; git is yours.

**Changed paths (only these five):** `src/lib/preprocess/hybrid.js`, `src/lib/preprocess/hybrid.test.ts`, `src/lib/preprocess/hybrid-render.test.ts`, `src/routes/test/preprocess/hybrid/+page.mdproof`, `README.md`. The drift check against `410cc72` came back empty.

**Red first (before any `hybrid.js` change):**
- **Snippet scope:** a snippet declared before or after its use, with Markdown in between, threw `ReferenceError: greeting is not defined` in SSR (`renderServer`) and on client mount.
- **Fixture:** after adding the snippet to the fixture, both `hybrid-render` tests threw the same `ReferenceError`.
- **`<svelte:window>`:** the generated document failed with `svelte_meta_invalid_placement` on both server and client.
- **`<svelte:head>`:** failed with `element_invalid_closing_tag`. The cause is that CommonMark reads `<svelte:head>` as an autolink, so the 004 masking blanked it out.
- **Options:** `<svelte:options …>` ended up in the Markdown and rendered as escaped visible text. Unsupported options were never rejected.
- **`{@const}`:** a top-level `{@const}` was silently accepted. Native Svelte rejects it, but the snippet wrapper made it valid.

**Implementation:** each top-level AST node type is now sorted into one of five explicit groups:
- **Rendered:** becomes an island, as before.
- **Declaration:** `SnippetBlock`, emitted at the root of the generated document.
- **Root-only:** `SvelteHead`, `SvelteWindow`, `SvelteDocument`, `SvelteBody`, plus `tree.options`, emitted at the component root.
- **Rejected:** `ConstTag`, `SvelteSelf` and `DeclarationTag`, each with a clear error message.
- **Unknown:** any other node type throws.

Declarations and root nodes produce no marker token. When one sits alone on a line, that line is removed so the surrounding paragraph isn't split. `extractSvelteIslands` still returns `source` and `islands`, plus new `declarations` and `root` fields, which `generateHybridDocument` uses and the tests check exactly. Nested declarations stay inside their parent island. Leading scripts, the no-styles rule and generated names are unchanged.

**Gates (all exit 0, after the last edit):**

| Gate | Result |
| --- | --- |
| `pnpm test:only src/lib/preprocess/` | 60 passed |
| `trunk fmt` / `trunk check` | no issues |
| `pnpm check` | 0 errors, 3 baseline warnings |
| `pnpm test` | 1470 tests / 168 files; coverage 97.36 / 92.88 / 98.31 / 98.61 |
| `pnpm build` | publint "All good!" |
| Playwright `preprocess-hybrid` (chromium) | 2 passed, on a fresh build and port 4173 (free before and after) |
| `git diff --check` | clean |

**Tests and fixture:**
- **SSR runtime:** I followed the `Code.test.ts` pattern — compile, then evaluate against the same `svelte/internal/*` runtime. These tests render through a small token document written inline in the test, not the real `MarkdownDocument`. Lexical scope isn't mocked: it comes entirely from the compiled generated code. The real document is covered by the fixture in Vitest on the client and by Playwright for SSR and hydration.
- **Snippet tests:** they cover a parameterized snippet reading page props, a forward reference, client updates when props change, and a nested declaration staying in its parent.
- **Root-element tests:** both compiler targets compile, the SSR `<title>` comes out in the head, `document.title` is set on the client, and a real `resize` event updates the page.
- **Rejections that still match native Svelte:** elements placed inside elements, blocks or snippets; duplicate root elements; a top-level `{@const}`.
- **Fixture:** the `load-greeting` paragraph now comes from an authored snippet, declared after the H1 and rendered inside the section, with the table in between. The existing Playwright and Vitest assertions on it now exercise the snippet. They are unchanged apart from one added length-1 check.

**Deviations and decisions for you to review:**
1. **Masking change:** I touched the 004 masking in one place: autolinks starting with `<svelte:` are no longer treated as Markdown literals. Without that, `<svelte:head>` cannot work. It also affects `<svelte:boundary>` and `<svelte:fragment>` written without attributes.
2. **Options policy:** `<svelte:options>` supports only `runes`, passed through as written; every other option is rejected with an error. Legacy `runes={false}` is checked on both compiler targets plus SSR, but not with a client runtime test. Options must come after the leading `<script>` blocks, because the existing leading-scripts rule otherwise errors.
3. **Extra rejections:** `{@const}` and `<svelte:self>` at the top level are now rejected; native Svelte rejects both, and the wrapper had made them valid. Svelte 5.57's top-level `{let}`/`{const}` declaration tags are rejected as unsupported rather than hoisted. Supporting them is a possible follow-up.

**Limitations (also in the README):**
- TypeScript in template expressions, including snippet parameter types, isn't recognized, because extraction parses without TS. The fixture and tests use untyped parameters.
- Generated-name collisions and the 004 regex-vs-division heuristic are untouched.
```
