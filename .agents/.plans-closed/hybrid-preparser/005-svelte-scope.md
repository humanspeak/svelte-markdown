# Plan 005: Preserve authored snippet scope and root-only Svelte elements

> **Executor instructions:** Read this entire plan; follow steps in order and
> run each verification. Honor STOP conditions. The conductor maintains index.
>
> Revision 2026-10-06: Rebaseline to reviewed410cc72 after004 PASS.004 added
> lexical-aware masking, paired regressions, template-literal greeting and
> experimental README boundary text;001 added preparsed-array/async semantics.
> Preserve these reviewed changes. Extraction still wraps every non-Text node
> independently; only its line anchors moved. No scope/gate/routing change.
>
> **Drift check (first):** `git diff --stat 410cc72..HEAD -- src/lib/preprocess/hybrid.js src/lib/preprocess/hybrid.test.ts src/lib/preprocess/hybrid-render.test.ts src/routes/test/preprocess/hybrid/+page.mdproof README.md`.
> Compare the current-state excerpts if paths changed; STOP on unexplained drift.
> Also inspect `git status --short`; unrelated pre-existing edits must not be
> staged, reformatted, or included in your report as your work.

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** MED
- **Depends on:** 004 DONE
- **Category:** bug
- **Planned at:** commit `410cc72`, 2026-10-06

## Why this matters

Independently wrapping declarations and root-only nodes changes Svelte semantics.
Preserve their document scope/root placement, while continuing to route rendered
nodes through compiled snippets and build-time tokens.

## Current state

`hybrid.js:305` loops tree.fragment.nodes, skipping only Text; :308 captures each
node; :392 wraps every island independently in `{#snippet smProofIslandN()}`.
For `{#snippet greeting()}Hello{/snippet}
{@render greeting()}`, generated JS
places greeting inside smProofIsland0 and calls it from smProofIsland1: compile
passes but SSR throws ReferenceError. `<svelte:window onresize={() => {}} />`
compiles natively but generated output fails svelte_meta_invalid_placement.
Svelte AST options may live outside fragment.nodes. Original scripts are still
leading-only; no styles support. Verified004 changed lexical masking while
preserving extraction/generation behavior; this plan is rebaselined above.

## Repository conventions and commands

This is @humanspeak/svelte-markdown, Svelte 5 with strict TypeScript, Marked 18,
SvelteKit/Vite, pnpm 12.6.0, Node >=22. The branch is an unpublished proof for
issue #372: build-time Markdown tokens use the existing customizable renderer,
and embedded Svelte compiles without authoring delimiters. Trusted local files
are application source; runtime CMS strings never gain executable expressions.
Do not add a bundled DOM sanitizer, remote fetching, or editor functionality.

Use Trunk, never raw ESLint/Prettier; never eslint-disable. Match existing Vitest
`describe/it/expect` tests and Playwright `test/expect` tests. Svelte components
use `$props`, `$state`, `$derived`. Regression tests must assert rendered output,
not only generated-source spelling. README updates are required for changed
public behavior; keep experimental framing. Coverage gates are 95% statements,
89% branches, 95% functions, 96% lines (vite.config.ts).

| Purpose                    | Command                                                    | Expected                                                           |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Bootstrap if necessary     | `pnpm install --frozen-lockfile`                           | exit 0, no tracked changes                                         |
| Unit tests                 | `pnpm test`                                                | all pass; coverage gates pass                                      |
| Focused preparser tests    | `pnpm test:only src/lib/preprocess/`                       | all pass                                                           |
| Types                      | `pnpm check`                                               | exit 0; zero errors; three baseline warnings permitted             |
| Format                     | `trunk fmt`                                                | exit 0; changed files only                                         |
| Lint                       | `trunk check`                                              | exit 0                                                             |
| Build/package              | `pnpm build`                                               | exit 0, publint passes; existing import.meta.env warning permitted |
| Focused production browser | `pnpm exec playwright test <test-file> --project=chromium` | all pass                                                           |

## Git and executor workflow

The conductor owns commits and integration. Do not commit, push, open PRs, edit
this plan, any guard artifacts, or the batch README. Run serially on the supplied
checkout; no other executor writes it. If the checkout/workdir differs, STOP.
Report exact commands, red-first evidence, green results, changed files,
assumptions, and blocked verification. No fake green. The conductor updates the
status index and independently reruns done criteria. No dependency changes unless
explicitly in scope. Use existing dependencies, not a new parser ecosystem.

## Scope

Only these files may be changed:

- `src/lib/preprocess/hybrid.js`
- `src/lib/preprocess/hybrid.test.ts`
- `src/lib/preprocess/hybrid-render.test.ts`
- `src/routes/test/preprocess/hybrid/+page.mdproof`
- `README.md`

Everything else is out of scope, including dependencies, lockfile, unrelated
streaming/parser optimizations, published package exports, and productionizing
nested Markdown. Do not silently widen scope.

## Steps

### Step 1: Add runtime and compiler regressions before changing extraction

Add authored snippet declaration plus later render separated by Markdown.
Assert actual client and server rendering produces the snippet content; compiler
acceptance alone misses the bug. Parameterized snippet must access page props;
include a forward reference if native Svelte accepts it. Add native-valid
svelte:window and svelte:options cases and verify both compiler targets. Preserve
invalid-placement rejection in author source. Match Code.test.ts server compiler
helper pattern where useful, using the SAME internal server runtime for render
and compiled output; do not mock lexical scope. Add fixture snippet declaration
and render for production/client integration coverage.

**Verify:** focused preparser tests FAIL current code with unbound greeting at
render time and root-element placement errors, not unrelated mock/import failures.

### Step 2: Classify declarations and root-only nodes separately

Use Svelte AST node types, not tag-name capitalization regexes, to keep authored
snippet declarations at generated document scope and emit supported root metadata
at component root. Preserve source order, nesting and bindings. Do not hoist
nested declarations out of their original parent; the existing compiled parent
subtree retains ownership. Handle AST options explicitly. Root metadata must not
produce Markdown marker tokens or visible output. Preserve all source maps work
as deferred; preserve current leading scripts and no styles rule.
Keep extractSvelteIslands exported return source/islands compatibility; additional
fields may be added with explicit tests and generateHybridDocument integration.
Do not rename generated identifiers or solve binding collisions in this plan.
If supported root options conflict with generated runes/language mode, reject
with a clear diagnostic and explain rather than silently ignoring them.

**Verify:** new scope/root tests and existing focused preparser suite pass.

### Step 3: Verify production composition and document supported syntax

Update experimental README supported snippet/root syntax conservatively. Run
full gates plus production hybrid Chromium tests, ensuring counter, custom
renderers and inline bold still work and no runtime Lexer calls occur.

**Verify:** `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm exec playwright test tests/preprocess-hybrid.test.ts --project=chromium`
all succeed.

## Test plan

Red-first actual rendering anchors declaration/use scope. Both Svelte targets
cover root metadata placement and native acceptance. Browser fixture covers
snippet data and existing hydration behavior. No snapshots-only solution; assert
rendered text and no unbound variable/hydration errors. Nested Markdown remains
literal, and generated-name hygiene remains a separate follow-up.

## Done criteria

- [ ] Declaration/render separated by Markdown works in real SSR and client render.
- [ ] Supported root elements/options compile at root; invalid authored placement stays rejected.
- [ ] No marker token is emitted for declarations/root metadata.
- [ ] Existing references, inline bold, custom renderers and zero Lexer tests pass.
- [ ] Focused hybrid production Chromium tests pass.
- [ ] `pnpm test`, `pnpm check`, `trunk check`, `pnpm build` exit0.
- [ ] `git diff --check` exits 0.
- [ ] The contribution modifies only the listed paths; conductor artifacts excluded.
- [ ] The final report names all verification limitations and deviations.

## STOP conditions

- Native compiler also rejects a proposed fixture: correct the reproduction, not native grammar.
- Need to hoist nested declarations, implement nested Markdown, styles, or routing proposal.
- Root options change runes semantics incompatibly: document error policy and report before expanding scope.
- Live excerpts differ without an explained predecessor change.
- A fix needs out-of-scope files or a new dependency.
- A verification failure persists after two reasonable attempts.

## Maintenance notes

Every new Svelte AST node type needs a deliberate classification: rendered,
declaration, root-only, or unsupported. Treating all non-Text as rendered is not
safe. Preserve scopes rather than reconstructing them from text.
