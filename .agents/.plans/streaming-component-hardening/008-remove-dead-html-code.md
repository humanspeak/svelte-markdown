# Plan 008: Remove production-dead legacy HTML-pairing code and the benchmark-only module from the published surface

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat 939f154..HEAD -- src/lib/utils/token-cleanup.ts src/lib/utils/stream-benchmark.ts src/lib/index.ts`
> On any change, compare "Current state" facts to live code; mismatch ⇒ STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `939f154`, 2026-07-07

## Why this matters

`token-cleanup.ts` (674 lines) ships ~190 lines of legacy HTML functions that
have **zero non-test importers** and are superseded by the live single-pass path
(`expandHtmlBlockNested` / `pairFlatHtmlTokens`). They still get packaged (all of
`src/lib` ships), still must be kept green by dedicated test files, and duplicate
the trickiest logic in the module (stack-based tag pairing) — a second copy that
can drift from the live one. Separately, `stream-benchmark.ts` is a benchmark
helper with no production importer that also ships in the package. Removing all
of this shrinks the published bundle, deletes a drift risk, and makes the module
read as one coherent HTML pipeline.

## Current state (verified at 939f154)

Grep results confirming the dead code (run these yourself to re-confirm):

```
grep -rn "parseHtmlBlock\|processHtmlTokens\|containsMultipleTags" src --include='*.ts' --include='*.svelte' -l
  → only: token-cleanup.ts (definitions) and *.test.ts files
grep -rn "stream-benchmark" src -l
  → stream-benchmark.test.ts AND src/routes/test/perf-bench/+page.svelte
grep -n "parseHtmlBlock\|processHtmlTokens\|containsMultipleTags\|stream-benchmark" src/lib/index.ts
  → (no output — none are public exports)
```

Targets in `src/lib/utils/token-cleanup.ts`:

- `parseHtmlBlock` (around line 188) — legacy flat tokenizer.
- `processHtmlTokens` (line 609) — legacy stack-based nester (duplicate of the
  live `pairFlatHtmlTokens` at ~455-520).
- `containsMultipleTags` (around line 280) — legacy multi-tag detector
  (duplicate of the live `hasMultipleTags` at 312-316, which IS used).

**Keep** (live path, do not touch): `shrinkHtmlTokens`, `expandHtmlToken`,
`expandHtmlBlockNested`, `pairFlatHtmlTokens`, `hasMultipleTags`,
`extractAttributes`, `serializeAttributes`, `SELF_CLOSING_TAGS`.

Dedicated test files to delete alongside the functions:

- `src/lib/utils/parse-html-block.test.ts`
- `src/lib/utils/process-html-tokens.test.ts`
- `src/lib/utils/contains-multiple-tags.test.ts`

And `token-cleanup.test.ts` may contain a few cases exercising the deleted
functions — remove only those cases, keep the rest.

`stream-benchmark.ts`: imported by `stream-benchmark.test.ts` (delete both) **and
by `src/routes/test/perf-bench/+page.svelte`** — a dev route, NOT part of the
published `src/lib`. See Step 3 for handling that importer.

## Commands you will need

| Purpose     | Command                    | Expected on success |
| ----------- | -------------------------- | ------------------- |
| Grep usage  | `grep -rn "<symbol>" src`  | (see steps)         |
| Typecheck   | `pnpm check`               | exit 0, 0 errors    |
| All unit    | `pnpm test:only`           | all pass            |
| Build (pkg) | `pnpm build`               | exit 0              |
| Lint        | `trunk fmt && trunk check` | exit 0              |

## Scope

**In scope**:

- `src/lib/utils/token-cleanup.ts` — delete the three legacy functions + any
  now-unused private helpers they alone used (verify with grep before deleting a
  helper).
- Delete: `src/lib/utils/parse-html-block.test.ts`,
  `src/lib/utils/process-html-tokens.test.ts`,
  `src/lib/utils/contains-multiple-tags.test.ts`,
  `src/lib/utils/stream-benchmark.test.ts`.
- `src/lib/utils/token-cleanup.test.ts` — remove only cases that reference the
  deleted functions.
- `src/lib/utils/stream-benchmark.ts` — delete (see Step 3 for the dev-route
  importer).
- `src/routes/test/perf-bench/+page.svelte` — the ONE allowed touch outside
  `src/lib`, only to drop the `stream-benchmark` import (Step 3).

**Out of scope**:

- The live HTML pipeline functions listed under "Keep".
- Any change to `src/lib/index.ts` public exports (none of the deleted symbols
  are exported; confirm and leave the file alone).

## Git workflow

- Branch: `advisor/008-remove-dead-html-code` (`--no-track origin/main`).
- Commit style: `refactor(cleanup): drop dead legacy HTML functions and bench module`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Re-confirm zero production usage

Run the three greps from "Current state" and confirm each legacy symbol is
referenced only by its own definition and test files, and that none appear in
`src/lib/index.ts`. If any legacy symbol has a non-test, non-definition importer
inside `src/lib`, **STOP and report** — it is not dead.

**Verify**: greps show no production importers.

### Step 2: Delete the legacy functions and their dedicated tests

Remove `parseHtmlBlock`, `processHtmlTokens`, `containsMultipleTags` from
`token-cleanup.ts`, plus any private helper used **only** by them (grep each
helper's name across `src/lib` first; keep anything the live path also uses).
Delete the three dedicated test files. Trim references in
`token-cleanup.test.ts`.

**Verify**:

- `grep -rn "parseHtmlBlock\|processHtmlTokens\|containsMultipleTags" src` →
  no matches at all.
- `pnpm check` → exit 0.
- `pnpm test:only src/lib/utils/token-cleanup.test.ts` → all pass.

### Step 3: Remove the benchmark module and fix its dev-route importer

`stream-benchmark.ts` is imported by `src/routes/test/perf-bench/+page.svelte`
(a dev/test route, not shipped in the package). Decide with the operator's
default: since this route is a dev harness, edit `+page.svelte` to drop the
`stream-benchmark` import and whatever UI depended on it (the minimal change that
keeps the route compiling), then delete `stream-benchmark.ts` and
`stream-benchmark.test.ts`. If removing the import requires non-trivial rework of
the route, **STOP and report** — do not gut the dev page; instead leave
`stream-benchmark.ts` in place and report that it cannot be removed without route
work (the packaging concern is secondary to not breaking the dev harness).

**Verify**:

- `grep -rn "stream-benchmark" src` → no matches (or, if you stopped, exactly the
  route + module remain and you reported it).
- `pnpm check` → exit 0.

### Step 4: Full build + suite + lint

**Verify**:

- `pnpm test:only` → all pass.
- `pnpm build` → exit 0 (confirms the package still builds without the deleted
  files).
- `trunk fmt && trunk check` → exit 0.

## Test plan

- This plan deletes code and tests; the guard is that the **remaining** suite and
  the build stay green, proving the live HTML path never depended on the deleted
  functions.
- Verification: `pnpm test:only` + `pnpm build` → both succeed.

## Done criteria

ALL must hold:

- [ ] `grep -rn "parseHtmlBlock\|processHtmlTokens\|containsMultipleTags" src`
      → no matches.
- [ ] `grep -rn "stream-benchmark" src` → no matches (or documented stop).
- [ ] `pnpm check` exits 0; `pnpm test:only` exits 0; `pnpm build` exits 0;
      `trunk fmt && trunk check` exits 0.
- [ ] Only in-scope files modified/deleted (`git status`) — at most one file
      outside `src/lib` (`src/routes/test/perf-bench/+page.svelte`).
- [ ] The batch `README.md` status row for 008 is updated.

## STOP conditions

- Any legacy symbol turns out to have a production importer (drift since 939f154).
- Removing the `stream-benchmark` import from the dev route requires meaningful
  route rework — leave the module and report.
- Deleting a private helper breaks the live path (a test fails) — you removed a
  shared helper; restore it and report.

## Maintenance notes

- After this, `token-cleanup.ts` has a single HTML-pairing implementation
  (`pairFlatHtmlTokens`) — future HTML-nesting fixes go there only.
- Reviewer should confirm no `src/lib/index.ts` export was removed (nothing
  deleted here was public) and that `pnpm build` output no longer contains the
  bench module.
