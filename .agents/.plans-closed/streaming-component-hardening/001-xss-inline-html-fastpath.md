# Plan 001: Inline HTML fast-path stops rendering unknown/dangerous tags as live elements

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in the `README.md` that sits alongside this plan file
> (`.agents/.plans/streaming-component-hardening/README.md`).
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- src/lib/Parser.svelte`
> If `src/lib/Parser.svelte` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `939f154`, 2026-07-07

## Why this matters

In the **default** configuration, raw markdown containing `<script>…</script>`,
`<style>…</style>`, `<meta http-equiv=refresh>`, or `<base href>` executes /
takes effect in the host page. The inline-HTML fast path (issue #286
optimization) renders **any** html token whose tag is absent from the built-in
`Html` renderer map as a live element via `<svelte:element this={tag}>`, because
its eligibility check `renderers.html[tag] === Html[tag]` evaluates
`undefined === undefined` → `true` for unknown tags. The **non-inline** path for
the same token type does the opposite — it drops the unknown tag and renders
only its children (safe). This divergence is a full stored/streamed XSS under
the package's advertised "XSS-safe defaults". Fixing it makes the fast path
agree with the safe non-inline path: unknown tags fall through and their tag is
dropped.

Confirmed end-to-end while planning: `marked.lexer('<script>alert(1)</script>')`
emits a single `{type:'html', raw:'<script>alert(1)</script>'}` token; the
cleanup pipeline (`expandHtmlBlockNested`, htmlparser2 with script/style content
as text) turns it into an html token with `tag:'script'` and a text child
`alert(1)`; that reaches the inline branch and is rendered as a live
`<script>` element.

## Current state

- `src/lib/Parser.svelte` — the recursive renderer. The `dispatch` snippet
  (lines 215–270) contains the inline fast paths.
- `src/lib/renderers/html/index.ts` — the `Html` map of supported tag →
  component. It contains `iframe` (line 156) but **not** `script`, `style`,
  `object`, `meta`, or `base`. For any tag not in this map, `Html[tag]` is
  `undefined`.

The vulnerable eligibility flag, `src/lib/Parser.svelte:221-226`:

```svelte
{@const inlineHtmlOk =
    token.type === 'html' &&
    !!htmlTok.tag &&
    !!renderers.html &&
    renderers.html[htmlTok.tag] === Html[htmlTok.tag] &&
    !htmlSnippetOverrides[htmlTok.tag]}
```

For `tag = 'script'`: `renderers.html['script']` is `undefined` and
`Html['script']` is `undefined`, so the `===` comparison is `true` and the tag
is treated as an unmodified default → rendered live at lines 231–249.

The **safe** non-inline path already handles unknown tags correctly,
`src/lib/Parser.svelte:481` and `:494-502`:

```svelte
{:else if renderers.html && htmlTag in renderers.html}
    ... render <HtmlComponent> ...
{:else}
    <!-- unknown tag: drop tag, render children only -->
    {@const fallbackRest = ...}
    {#each fallbackTokens as fallbackToken, index (...)}
        {@render dispatch(fallbackToken, fallbackRest)}
    {/each}
{/if}
```

The fix is to make `inlineHtmlOk` require the tag to actually exist in the
renderer map, so unknown tags fall through to the general `<Parser>` dispatch
(and from there into the safe non-inline branch above).

Repo conventions: no `eslint-disable` comments — use `// trunk-ignore(...)` if a
suppression is ever needed (not expected here). Tests are Vitest + Testing
Library under `src/lib/**/*.test.ts`; issue-reproduction tests live in
`tests/issues/` (Playwright) but unit-level DOM assertions for this component
live in `src/lib/SvelteMarkdown.test.ts`.

## Commands you will need

| Purpose   | Command                                         | Expected on success |
| --------- | ----------------------------------------------- | ------------------- |
| Install   | `pnpm install`                                  | exit 0              |
| Typecheck | `pnpm check`                                    | exit 0, 0 errors    |
| Unit test | `pnpm test:only`                                | all pass            |
| One file  | `pnpm test:only src/lib/SvelteMarkdown.test.ts` | all pass            |
| Lint      | `trunk fmt && trunk check`                      | exit 0              |

## Scope

**In scope**:

- `src/lib/Parser.svelte` — tighten `inlineHtmlOk`.
- `src/lib/SvelteMarkdown.test.ts` — add regression tests (or a new
  `src/lib/SvelteMarkdown.xss.test.ts` if you prefer isolation; either is fine).

**Out of scope** (do NOT touch):

- `src/lib/utils/sanitize.ts` — URL/attribute sanitization is a separate,
  working layer; this bug is about tag identity, not attributes.
- `src/lib/renderers/html/**` — do not add `script`/`style` renderers; the goal
  is to _drop_ those tags, not render them.
- The non-inline `type === 'html'` branch (lines 460–502) — it is already
  correct; do not change its behavior.

## Git workflow

- Branch: `advisor/001-xss-inline-html-fastpath` (create with
  `git checkout -b advisor/001-xss-inline-html-fastpath --no-track origin/main`
  — the `--no-track` avoids accidentally configuring `main` as push upstream).
- Commit message style is conventional commits (see `git log`): e.g.
  `fix(parser): drop unknown HTML tags in inline fast path (XSS)`.
- Do NOT push or open a PR unless the operator instructs it.

## Steps

### Step 1: Require the tag to exist in the renderer map

In `src/lib/Parser.svelte`, change the `inlineHtmlOk` `@const` (lines 221–226)
so an unknown tag is not eligible for inline rendering. The load-bearing change:
replace the identity comparison with a membership check **plus** the identity
comparison, so the flag is true only when the tag is a real key of both
`renderers.html` and the built-in `Html` map:

```svelte
{@const inlineHtmlOk =
    token.type === 'html' &&
    !!htmlTok.tag &&
    !!renderers.html &&
    htmlTok.tag in Html &&
    renderers.html[htmlTok.tag] === Html[htmlTok.tag] &&
    !htmlSnippetOverrides[htmlTok.tag]}
```

`htmlTok.tag in Html` is the fix: for `script`/`style`/`object`/`meta`/`base`
(and any other unmapped tag) it is `false`, so `inlineHtmlOk` is `false` and the
token falls through to the general `<Parser>` dispatch at lines 250–269, which
routes html tokens to the safe non-inline branch.

**Verify**: `pnpm check` → exit 0, 0 errors.

### Step 2: Add regression tests

Add tests asserting that dangerous unknown tags are neutralized in the default
configuration, and that a mapped tag (e.g. `div`) still renders inline as
before. Model the render/assertion style on existing cases in
`src/lib/SvelteMarkdown.test.ts` (it already renders `SvelteMarkdown` with a
`source` string and queries the container).

Cases to cover:

- `source="<script>alert(1)</script>"` → the rendered container contains **no**
  `<script>` element (`container.querySelector('script')` is `null`), and the
  literal text `alert(1)` is not injected as executable script (it may appear as
  escaped text — that is acceptable; a live `<script>` is not).
- `source="<style>*{color:red}</style>"` → `container.querySelector('style')`
  is `null`.
- `source="<div>ok</div>"` → still renders a `<div>` containing `ok` (proves the
  fast path still works for supported tags).
- Sanity for `iframe` (which _is_ in the map): `source="<iframe></iframe>"`
  continues to render via its existing renderer (do not assert exact internals;
  just that behavior is unchanged from before your edit — run the test before
  and after Step 1 if unsure).

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.test.ts` → all pass,
including the new cases.

### Step 3: Full suite + lint

**Verify**:

- `pnpm test:only` → all pass.
- `trunk fmt && trunk check` → exit 0.

## Test plan

- New tests in `src/lib/SvelteMarkdown.test.ts` (or `SvelteMarkdown.xss.test.ts`):
  the four cases above. The `<script>`/`<style>` cases are the regression guards
  for this exact vulnerability; the `<div>` case guards against over-correcting
  and disabling the legitimate fast path.
- Structural pattern: existing render-and-query tests in
  `src/lib/SvelteMarkdown.test.ts`.
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0.
- [ ] `pnpm test:only` exits 0; new `<script>`/`<style>`/`<div>` tests exist and pass.
- [ ] `grep -n "htmlTok.tag in Html" src/lib/Parser.svelte` returns the new line.
- [ ] Rendering `<script>alert(1)</script>` produces no live `<script>` element
      (asserted by a passing test).
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 001 is updated.

## STOP conditions

Stop and report (do not improvise) if:

- `src/lib/Parser.svelte` no longer contains an `inlineHtmlOk` `@const` matching
  the excerpt (the fast path was refactored since 939f154).
- After Step 1, any **existing** test starts failing that asserts a supported
  tag (e.g. `div`, `span`, `iframe`) renders inline — that would mean
  `htmlTok.tag in Html` is excluding tags it shouldn't; report the failing test
  rather than loosening the guard.
- You find that removing inline eligibility for unknown tags causes them to
  render live through some _other_ path — that is a second bug; report it.

## Maintenance notes

- If a future change adds `script`/`style`/etc. to the `Html` map (e.g. an
  opt-in "trusted HTML" renderer), this guard would once again make them inline-
  eligible — that must be a deliberate, sanitized decision, not incidental.
- Reviewer should confirm the inline path and the non-inline path (lines
  460–502) now agree on the set of tags they will render, for both the
  self-closing and container sub-cases.
- The attribute-sanitization layer (`sanitize.ts`) is unaffected and still the
  right place for `href`/`src`/`on*`/`srcdoc` handling.
