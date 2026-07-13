# Plan 009: Lint the test files and enable type-aware lint rules that catch floating promises

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- eslint.config.mjs`
> On any change, compare "Current state" facts to live code; mismatch ⇒ STOP.
>
> **Revision 2026-07-09 (guard):** Replaced this plan's four `pnpm exec eslint .`
> invocations with Trunk equivalents. CLAUDE.md makes Trunk the source of truth
> and forbids running raw ESLint/Prettier. Use `trunk check` for changed files
> and `trunk check --all` for a full-repo pass. The `Planned at` SHA stays
> `939f154` — a tooling-command correction only, matching the batch README's
> 2026-07-07 revision, so the drift check keeps pointing at the originally
> audited commit.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (best done after 008 so fewer test files exist to fix)
- **Category**: dx
- **Planned at**: commit `939f154`, 2026-07-07

## Why this matters

Two lint blind spots in a promise-heavy streaming library:

1. `eslint.config.mjs` puts `'**/*.test.ts'` in the top-level `ignores`, so
   ~150 test files get **zero** static checking — the most bug-prone streaming/
   async tests (dangling `act()` promises, unrestored spies, accidental `.only`,
   unawaited `writeChunk`) ship unlinted.
2. The config uses `ts.configs.recommended` (not `recommendedTypeChecked`) and
   never sets `parserOptions.project`, so no type information reaches rules —
   `@typescript-eslint/no-floating-promises` and `no-misused-promises` are off.
   Those are exactly the rules that catch a dropped `await` in
   `parseAndCacheTokensAsync().then().catch()`, the rAF scheduling, and imperative
   `writeChunk` callers.

This is a real-bug-prevention change, not cosmetic. It is **effort M / risk MED**
because turning these on surfaces a batch of pre-existing violations to triage.

## Current state

`eslint.config.mjs:20-45` (abridged):

```js
ignores: [ /* ... */ '**/dist', '**/*.test.ts' ],   // line 30: test files ignored
// ...
js.configs.recommended,
...ts.configs.recommended,                            // line 34: NOT type-checked
...svelte.configs['flat/recommended'],
// ...
languageOptions: {
    // ...
    parserOptions: { tsconfigRootDir },               // lines 44-46: no `project`
},
```

Conventions: **never** use `eslint-disable` comments; use Trunk inline ignores
`// trunk-ignore(eslint/rule-name)` when a suppression is genuinely needed
(CLAUDE.md, "Code Style & Linting"). Formatting and linting run via Trunk:
`trunk fmt` (formatters, incl. prettier) then `trunk check` (eslint et al.).
CI runs on Node 22/24.

## Commands you will need

| Purpose       | Command                    | Expected on success |
| ------------- | -------------------------- | ------------------- |
| Lint          | `trunk fmt && trunk check` | exit 0              |
| Lint one file | `trunk check <path>`       | exit 0              |
| Lint all      | `trunk check --all`        | exit 0              |
| Typecheck     | `pnpm check`               | exit 0              |
| All unit      | `pnpm test:only`           | all pass            |

Never run `pnpm lint`, `pnpm format`, `npx prettier`, or `npx eslint` (CLAUDE.md).
Plain `trunk check` only inspects files changed relative to the upstream branch —
that covers a new/untracked scratch file from Step 3. Because this plan turns on
repo-wide rules, also run `trunk check --all` once before declaring done.

## Scope

**In scope**:

- `eslint.config.mjs` — remove the test-file ignore, add a test override block,
  enable typed linting.
- Possibly a lint-oriented tsconfig include if typed linting needs it (see
  Step 2). Do not change `tsconfig.json`'s compile behavior for the build.
- Source/test files **only** to fix violations the newly-enabled rules surface
  (minimal, mechanical fixes — add missing `await`, restore spies, etc.).

**Out of scope**:

- Rewriting tests beyond what a rule violation requires.
- Adding new runtime features.
- Changing Prettier config.

## Git workflow

- Branch: `advisor/009-lint-test-files-and-typed-lint` (`--no-track origin/main`).
- Commit style: `chore(lint): lint test files; enable type-aware promise rules`.
  Consider two commits: one config change, one violations-fix.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Lint test files with a sensible override

Remove `'**/*.test.ts'` from the top-level `ignores`. Add a flat-config override
block scoped to `**/*.test.ts` that relaxes rules that don't fit tests (e.g.
allow non-null assertions or `any` where the existing tests rely on them) — but
keep correctness rules on. Run ESLint and triage what surfaces.

**Verify**: `trunk check` now reports on test files (no longer skipped) — confirm
by running it against a changed `*.test.ts`. Fix surfaced violations minimally, or
relax clearly test-inappropriate rules in the override. Target:
`trunk fmt && trunk check` → exit 0.

### Step 2: Enable type-aware linting for the promise rules

Switch from `ts.configs.recommended` to including
`ts.configs.recommendedTypeChecked` (typescript-eslint flat presets) and set
`parserOptions.projectService: true` (or `project: ['./tsconfig.json']`) so type
info is available. Then ensure `@typescript-eslint/no-floating-promises` and
`@typescript-eslint/no-misused-promises` are enabled (they come on with the
type-checked preset).

Typed linting is slower and will surface violations — expect some in
`SvelteMarkdown.svelte` (the `.then().catch()` async parse), `scheduleAppendFlush`,
and tests. Fix each **minimally and correctly**: prefer adding `await` or
`void`-marking a genuinely fire-and-forget promise (with a brief comment on why),
not blanket-disabling the rule. Where a Svelte `$effect` legitimately can't await,
use `void promise` with a one-line rationale.

If enabling `projectService`/`project` makes ESLint fail to resolve `.svelte`
files or explodes the lint time unacceptably, **STOP and report** with the error
— typed linting across Svelte + TS can need extra parser config
(`svelte-eslint-parser` `parserOptions.parser`), which may exceed this plan's
risk budget.

**Verify**: `trunk fmt && trunk check` → exit 0 with the new rules active.

### Step 3: Prove a floating promise is now caught (guard)

Temporarily introduce an obvious floating promise in a scratch spot (e.g. a
`Promise.resolve()` statement with no `await`/`void` in a `.ts` file under
`src/lib`), run `trunk check <scratch-path>`, and confirm it reports
`no-floating-promises`. Do this in **three** scratch files — a plain `.ts`, a
`.test.ts`, and a `.svelte` — since each reaches type info by a different parser
path and any one of them can be silently inactive. Then delete the scratch files.
This proves the rule is actually wired to type info. Document the result in your
report (do not commit the scratch files).

**Verify**: Trunk flags the floating promise in all three scratch files; after
deleting them, `trunk fmt && trunk check` → exit 0 and `git status` is clean.

### Step 4: Full suite

**Verify**: `pnpm check` → 0; `pnpm test:only` → all pass; `trunk fmt && trunk check` → 0.

## Test plan

- No new unit tests (this is tooling). The guard is Step 3 (rule provably active)
  plus a green `pnpm test:only` after any violation fixes.
- Verification: `trunk fmt && trunk check` → exit 0; `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `'**/*.test.ts'` is no longer in the top-level `ignores` of
      `eslint.config.mjs`.
- [ ] `no-floating-promises` is active and provably catches a floating promise
      (Step 3), then reverted.
- [ ] `trunk fmt && trunk check` exits 0, and `trunk check --all` exits 0 (all
      surfaced violations fixed or justified via Trunk inline ignore — never
      `eslint-disable`, and never by switching a rule `'off'` in
      `eslint.config.mjs` to force green).
- [ ] Any rule from `recommendedTypeChecked` set to `'off'` in the config is
      listed in your report with a one-line rationale and its violation count.
- [ ] `pnpm check` exits 0; `pnpm test:only` exits 0.
- [ ] No `eslint-disable` comments introduced (`grep -rn "eslint-disable" src`
      shows none added by this change).
- [ ] The batch `README.md` status row for 009 is updated.

## STOP conditions

- `eslint.config.mjs` no longer matches the excerpt (drift).
- Typed linting cannot resolve `.svelte` files without parser rework beyond a
  small config addition, or lint time becomes unacceptable — report the error and
  the partial progress (Step 1's test-file linting may still be shippable alone).
- The surfaced violations reveal a **real** floating-promise bug in
  `src/lib/**` (not just tests) — fix it if trivial, but flag it prominently in
  your report as a correctness find, not just a lint cleanup.

## Maintenance notes

- Once typed linting is on, keep `parserOptions` pointed at a tsconfig that
  includes new source dirs, or new files silently lose type-aware coverage.
- Reviewer should check that fire-and-forget promises marked `void` are genuinely
  safe to not await (each should have a one-line rationale), and that no rule was
  blanket-disabled to force green.
- If this plan stalls at Step 2, shipping Step 1 alone (linting test files with
  the untyped preset) is still a net win.
