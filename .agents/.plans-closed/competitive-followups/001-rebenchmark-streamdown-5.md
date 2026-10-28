# Plan 001: Re-measure the streaming benchmark against svelte-streamdown 5.0.0 and update the pages

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `.agents/.plans/competitive-followups/README.md`, unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7b36d0e..HEAD -- package.json src/routes/test/stream-compare/ scripts/stream-compare-bench.mjs docs/src/lib/compare-data.ts docs/src/routes/docs/advanced/streaming-benchmarks/+page.svx .competitive-intel/config.json`
> If any of those files changed since this plan was written, compare the
> "Current state" excerpts below with the live files. Treat any mismatch as a
> STOP condition.
>
> **Revision 2026-10-28**: Git workflow re-pointed to the shared digest branch `chore/competitive-intel-2026-10-28` (operator's standing rule: digest follow-ups ship as one PR). The reviewer owns git. No change to scope or steps.
>
> **Revision 2026-10-28 (2)**: pre-flight after plans 002–005 landed on the batch branch. `Planned at` was re-stamped to `7b36d0e`. Since `bdebe69`, `package.json` gained `pele` (plan 004), which moved the `svelte-streamdown` line from 184 to 189. `compare-data.ts` changed only in the vs-tiptap, vs-marked and vs-svelte-exmarkdown entries (plan 002). The `vs-svelte-streamdown` entry (lines 36–222, `Streaming Speed` note at line 94) is unchanged. Environment: work in the main checkout `/Users/jasonkummerl/Github/svelte-markdown`. Playwright browsers are installed. Make sure nothing listens on port 4173 before `pnpm preview`, and stop your preview server when you finish.
>
> **Revision 2026-10-28 (3), operator decision after the first run stopped at Case C.** The benchmark has already been run and committed. Do NOT re-run any suite. The evidence is in `.agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-28-streamdown-5.0.0/` (`control-streamdown-4.2.1.log`, `suite1-streamdown-5.0.0.log`, `suite2-streamdown-5.0.0.log`, `README.md`), and `package.json` already pins `svelte-streamdown` 5.0.0 (commit `82af5a1`). Guard verified that every scenario keeps its winner and parity is 0 everywhere. The STOP fired only because the "About 30% of frames run long" figure depends on the machine: a frame runs long past a fixed 16.7 ms, and the original capture used a slower i7. **The operator chose to replace the published numbers with this machine's 5.0.0 capture.** Skip Steps 1–4 and 5A. Do **Step 5B**, then Steps 6 and 7, with these specifics:
>
> - Results table: one row per scenario, built from the two 5.0.0 suite logs only. For each column, use the min–max across the two suites' medians (one value if equal). "Ours over budget" and "Theirs over budget" are the min–max of the per-run over-budget counts in the two suites, written as the existing table writes them (for example `0 of 754`, `12–22 of 67`). Every number must come from the logs. Do not round beyond what the existing table does (integers for ms, two decimals for ratios).
> - Settings table: `Competitor` = `svelte-streamdown 5.0.0 with animation, controls, and highlighting off`. `Date and machine` = `2026-10-28, Intel Core i9-10910, macOS 26.7.1`. `Runs` unchanged. Replace the `Re-checked` row with `| Control | Same machine and day against svelte-streamdown 4.2.1: every scenario had the same winner |`.
> - Page-weight table: unchanged. Guard verified that the logs' JSON `domNodes` values are identical (prose 1,381 vs 1,704; list 768 vs 769; code fence 4 vs 797; citations 776 vs 519). Do not edit it.
> - Replace the `### Re-check against 4.2.1` section with `### Earlier captures`. One short paragraph: the table was first captured on 2026-09-28 against 4.2.0 on an Intel Core i7-6700K (Ubuntu 26.04) and re-checked against 4.2.1 on 2026-10-16. Both are archived under `.agents/.plans-closed/stream-vs-streamdown/evidence/`. Frame-over-budget counts depend on the machine, because the 16.7 ms budget is absolute, so the faster machine shows fewer long frames for both renderers.
> - Leave "Where the time goes" and the Caveats bullets unchanged, except: if the citations caveat's "258" or "rendered none" conflicts with the 5.0.0 logs, STOP and report rather than editing it.
> - `compare-data.ts` (`vs-svelte-streamdown` entry only), numbers and versions only:
>     - `Streaming Speed` → `us`: `'About 1.5–3.1x less work on prose, lists, tables, and long documents'`. `note`: `'Measured 2026-10-28 against svelte-streamdown 5.0.0 with both renderers run back to back on the same content, alongside a same-machine control run against 4.2.1. Results vary by machine and content. Method and full numbers: Streaming Benchmarks in the docs.'`
>     - `Smoothness on Long Lists & Tables` → `them`: `'About 16–42% of frames run long'`. Add `note`: `'Measured on an Intel Core i9-10910. Slower machines see more long frames for both renderers.'`
>     - `consThem` item `'About 30% of frames run long on long lists and tables'` → `'About 16–42% of frames run long on long lists and tables'`
>     - Everything else in that entry stays as it is.
> - Source figures (guard-verified from the logs): ratios where we win range from 1.45 (prefix-24kb) to 3.14 (loose-ordered-list). Streamdown frames over budget are long-list 103–335/754, long-table 21–115/314, loose-ordered-list 251–355/753, with run medians 19–42%.

## Status

- **Priority**: P1
- **Effort**: M (most of it is wall-clock benchmark time, about 30–60 minutes per suite)
- **Risk**: LOW for code. MED for claims, because the numbers decide public copy.
- **Depends on**: none
- **Wave**: 1
- **Category**: docs
- **Planned at**: commit `7b36d0e`, 2026-10-28 (re-stamped; originally `bdebe69`)
- **Ticket**: HUM-2 (`vs-streamdown-perf-baseline`)

## Why this matters

The `/compare/vs-svelte-streamdown` page and the Streaming Benchmarks docs page
publish speed claims ("about 1.2–2.7x less work…") measured against
svelte-streamdown **4.2.0** and re-checked against 4.2.1. Streamdown has since
shipped **5.0.0** (2026-10-19). It is a major version that changes the theme
hot path (clsx + tailwind-merge replaced by `cn`) and replaces mermaid.js with
`pele`. The repo's own benchmark contract says the numbers hold only for the
pinned devDependency version, so today the page makes claims about a release
nobody installs any more. This plan re-runs the existing harness against 5.0.0
and updates the copy so every claim names the version it was measured against.

## Current state

- `package.json:189`: the competitor is pinned exactly as a devDependency:
  `"svelte-streamdown": "4.2.1",`
- `src/routes/test/stream-compare/+page.svelte` is the benchmark harness page.
  It imports `import { Streamdown } from 'svelte-streamdown'` (line 10) and
  renders it at lines 874–879:
    ```svelte
    {:else if activeRenderer === 'svelte-streamdown'}
        <Streamdown
            {content}
            animation={{ enabled: false }}
            controls={{ code: false, mermaid: false, table: false }}
        />
    ```
    The advisor confirmed that the 5.0.0 typings (`dist/context.svelte.d.ts`)
    still accept `animation?: {…}` and
    `controls?: boolean | { code?, table?, mermaid? }`, so no harness change
    should be needed.
- `scripts/stream-compare-bench.mjs` is the Playwright runner (`pnpm perf:stream-compare`).
  Its header documents the env vars: `STREAM_COMPARE_URL`,
  `STREAM_COMPARE_ITERATIONS` (default 5), `STREAM_COMPARE_WARMUPS` (default 1),
  `STREAM_COMPARE_SCENARIO`, and `STREAM_COMPARE_MODE` (default `paired`).
- `docs/src/routes/docs/advanced/streaming-benchmarks/+page.svx` is the technical page:
    - lines 38–46, the settings table, which includes:
        ```text
        | Competitor | `svelte-streamdown` 4.2.0 with animation, controls, and highlighting off |
        | Date and machine | 2026-09-28 (the numbered list and HTML block rows: 2026-09-29), Intel Core i7-6700K, Ubuntu 26.04 |
        | Re-checked | 2026-10-16 against `svelte-streamdown` 4.2.1 (see below) |
        ```
    - lines 53–70, the results table (12 scenarios, "Ours (ms) | Streamdown (ms) | Ratio | …").
    - lines 72–81, the page-weight table.
    - lines 83–85, the `### Re-check against 4.2.1` section. **This is the
      precedent to follow.** The original table was kept, the re-check was run
      on a second machine with a same-machine control run of the old version,
      and one paragraph records the outcome.
- `docs/src/lib/compare-data.ts`, entry `slug: 'vs-svelte-streamdown'` (lines 36–222). The
  only version-bearing text is the `note` of the `Streaming Speed` feature (line 94):
    ```ts
    note: 'Measured 2026-09-28 against svelte-streamdown 4.2.0 with both renderers run back to back on the same content, and re-checked 2026-10-16 against 4.2.1 with no change in its results. Results vary by machine and content. Method and full numbers: Streaming Benchmarks in the docs.'
    ```
    Other rows quote derived claims: `Smoothness on Long Lists & Tables` →
    "About 30% of frames run long", `Bursts of Updates`, `Page Weight` → "About
    19% fewer elements", plus `consThem` "About 30% of frames run long…" and
    "About twice the work when chunks arrive in bursts".
- `.competitive-intel/config.json` → `benchmarks[0].measured_against["svelte-streamdown"]` is `"4.2.0"`.
- Prior evidence lives in
  `.agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-16-streamdown-4.2.1/`
  (`README.md` plus `suite1-…log`, `suite2-…log`, `control-streamdown-4.2.0.log`).
  Mirror that layout and its README style.

Repo conventions: commits use Conventional Commits, for example
`docs(compare): correct streaming animation claims and re-check streamdown 4.2.1 (#410)`.
Docs prose is plain English with short sentences. Match the tone of the existing
"Re-check against 4.2.1" paragraph.

## Commands you will need

| Purpose                | Command                                                                                                        | Expected on success                   |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Install                | `pnpm install`                                                                                                 | exit 0                                |
| Typecheck              | `pnpm check`                                                                                                   | exit 0, 0 errors                      |
| Build library + app    | `pnpm build`                                                                                                   | exit 0                                |
| Serve production build | `pnpm preview --host 127.0.0.1 --port 4173 --strictPort` (leave running)                                       | serves on 127.0.0.1:4173              |
| Run one suite          | `STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare pnpm perf:stream-compare 2>&1 \| tee <log path>` | exit 0, one result block per scenario |
| Docs typecheck         | `pnpm -C docs check`                                                                                           | exit 0                                |
| Lint / format          | `trunk fmt && trunk check`                                                                                     | no new issues                         |

Do not use `pnpm lint` or `npx prettier`. Trunk (`.trunk/trunk.yaml`) is the lint authority.

## Scope

**In scope**:

- `package.json` (only the `svelte-streamdown` devDependency line) and `pnpm-lock.yaml`
- `docs/src/routes/docs/advanced/streaming-benchmarks/+page.svx`
- `docs/src/lib/compare-data.ts`, **only inside the `vs-svelte-streamdown` entry (lines 36–222)**
- `.competitive-intel/config.json` (`benchmarks[0].measured_against` only)
- `.agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-28-streamdown-5.0.0/` (create)

**Out of scope**:

- `src/routes/test/stream-compare/+page.svelte` and `scripts/stream-compare-bench.mjs`.
  Changing the harness invalidates comparability with the published numbers.
  If 5.0.0 fails to compile against the harness, STOP.
- Any other competitor entry in `compare-data.ts`. Plan 002 edits the
  `vs-tiptap`, `vs-marked` and `vs-svelte-exmarkdown` entries in parallel.
- Any feature claims that are not about performance (Mermaid, citations, and so
  on). Those were validated separately on 2026-10-28 as unchanged.
- `.competitive-intel/state.json`. The nightly digest owns it.

## Git workflow

- All work from this batch integrates onto the existing branch
  `chore/competitive-intel-2026-10-28` (the 2026-10-28 digest's state.json
  branch). Digest follow-ups ship as one PR, per the operator's standing rule.
- The dispatching reviewer (guard) owns git. Do NOT create branches, commit,
  push, or open PRs yourself.
- For reference, commit messages use Conventional Commits, e.g. `docs(compare): …` / `feat(mermaid): …`.

## Steps

### Step 1: Capture a same-machine control suite on 4.2.1

Before bumping anything, record what Streamdown 4.2.1 does **on this machine**.
That separates a version effect from a hardware effect, as the 4.2.1 re-check did.

```bash
mkdir -p .agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-28-streamdown-5.0.0
pnpm install && pnpm build
pnpm preview --host 127.0.0.1 --port 4173 --strictPort   # shell A, leave running
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare pnpm perf:stream-compare 2>&1 \
  | tee .agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-28-streamdown-5.0.0/control-streamdown-4.2.1.log
```

Close the preview server afterwards. Avoid running other heavy work on the
machine while a suite runs.

**Verify**: `grep -c "svelte-streamdown" <log>` is > 0, the run exits 0, and
every scenario reports `parityMismatches` 0 for svelte-markdown. If any parity
mismatch is non-zero, STOP.

### Step 2: Bump the devDependency to 5.0.0

```bash
pnpm add -D svelte-streamdown@5.0.0
```

Keep the pin exact, matching the current style (`"5.0.0"`, no caret). If
pnpm's `minimumReleaseAge` policy in `pnpm-workspace.yaml` refuses it, STOP
and report. 5.0.0 was published 2026-10-19, so it should pass.

**Verify**: `grep -n '"svelte-streamdown"' package.json` → `"svelte-streamdown": "5.0.0",`
and `pnpm check` → exit 0 with 0 errors. A type error in
`src/routes/test/stream-compare/+page.svelte` is a STOP condition.

### Step 3: Run two full suites against 5.0.0

```bash
pnpm build
pnpm preview --host 127.0.0.1 --port 4173 --strictPort   # shell A
# shell B, run twice, one after the other:
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare pnpm perf:stream-compare 2>&1 \
  | tee .agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-28-streamdown-5.0.0/suite1-streamdown-5.0.0.log
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare pnpm perf:stream-compare 2>&1 \
  | tee .agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-28-streamdown-5.0.0/suite2-streamdown-5.0.0.log
```

**Verify**: both logs exist, both runs exit 0, and svelte-markdown parity
mismatches are 0 in every scenario. The `html-blocks` output-length warning is
expected because Streamdown shows raw HTML as text by default. It is not a failure.

### Step 4: Classify the outcome

Build a table of Streamdown's median total work per scenario across
4.2.1-control, 5.0.0 suite 1, and 5.0.0 suite 2. Also record the ours/theirs
ratio per scenario for each suite. Then decide which case applies:

- **Case A, no version effect.** In every scenario the 4.2.1 control falls
  inside the spread of the two 5.0.0 suites, or within ±10% of it, AND every
  scenario keeps the winner shown in the published table (ratio > 1 stays > 1,
  and < 1 stays < 1). Go to Step 5A.
- **Case B, version effect but same winners.** Streamdown's work moved by more
  than 10% in at least one scenario, but every scenario keeps its winner. Go
  to Step 5B.
- **Case C, any winner flips**, or a derived claim on the compare page is no
  longer true on this machine ("About 30% of frames run long" on long
  lists/tables, "about twice the work when chunks arrive in bursts", the
  "19% fewer elements" page-weight claim). **STOP and report** the full
  tables. Rewording public competitive claims needs a human decision.

Write the evidence `README.md` now, modeled exactly on
`.agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-16-streamdown-4.2.1/README.md`:
purpose, machine (CPU and OS), runs, the result paragraph, and the median table.

**Verify**: `test -s .agents/.plans-closed/stream-vs-streamdown/evidence/2026-10-28-streamdown-5.0.0/README.md && echo ok` → `ok`

### Step 5A: Case A, record a re-check (same pattern as 4.2.1)

1. In `streaming-benchmarks/+page.svx`, change the `Re-checked` row to name
   both re-checks, for example:
   `| Re-checked | 2026-10-16 against 4.2.1 and 2026-10-28 against 5.0.0 (see below) |`
2. Rename the `### Re-check against 4.2.1` heading to `### Re-checks against newer releases`.
   Keep the existing 4.2.1 paragraph and add one paragraph for 5.0.0 in the
   same style. It must state the date, the machine, that a same-machine 4.2.1
   control was run, that every scenario kept its winner, and the evidence
   folder path.
3. In `compare-data.ts` (`vs-svelte-streamdown` → `Streaming Speed` → `note`),
   change the version sentence so it names 5.0.0 as the latest re-check, for example:
   `'Measured 2026-09-28 against svelte-streamdown 4.2.0 with both renderers run back to back on the same content, and re-checked against 4.2.1 (2026-10-16) and 5.0.0 (2026-10-28) with every scenario keeping its winner. Results vary by machine and content. Method and full numbers: Streaming Benchmarks in the docs.'`

### Step 5B: Case B, replace the published table with the 5.0.0 capture

1. Replace the results table (lines 57–70) with the 5.0.0 numbers. Use the
   min–max of the two 5.0.0 suites as ranges, the way the existing table
   presents ranges. Fill both "over budget" columns from the logs.
2. Update the settings table. `Competitor` → `svelte-streamdown 5.0.0 with
animation, controls, and highlighting off`. `Date and machine` → today's
   date and this machine. `Runs` stays the same (two full suites).
   `Re-checked` → remove the row, or point it at the 4.2.1 control.
3. Update the page-weight table from the 5.0.0 logs.
4. Replace the `### Re-check against 4.2.1` section with a short
   `### Earlier versions` paragraph. It should say the previous table was
   captured against 4.2.0 on 2026-09-28 (Intel Core i7-6700K, Ubuntu 26.04)
   and is archived in git history.
5. Update the intro paragraph (line 22) and `compare-data.ts` only where a
   **number** changed: the `Streaming Speed` `us` range ("About 1.2–2.7x…")
   and its `note` (now "Measured YYYY-MM-DD against svelte-streamdown 5.0.0…").
   Do not change any wording other than numbers and versions.
6. Leave the "Where the time goes" table alone. It measures Svelte Markdown
   only and is unaffected by the competitor version.

### Step 6: Update the benchmark contract

In `.competitive-intel/config.json`, set
`benchmarks[0].measured_against["svelte-streamdown"]` to `"5.0.0"`.

**Verify**: `node -e "console.log(require('./.competitive-intel/config.json').benchmarks[0].measured_against['svelte-streamdown'])"` → `5.0.0`

### Step 7: Full gate

```bash
pnpm check
pnpm -C docs check
trunk fmt && trunk check
grep -rn "4\.2\.0\|4\.2\.1" docs/src/lib/compare-data.ts docs/src/routes/docs/advanced/streaming-benchmarks/+page.svx
```

**Verify**: both checks exit 0. Trunk reports no new issues. The grep output
contains only historical mentions (the original capture or the control run)
and no sentence presenting 4.2.x as the current comparison target.

## Test plan

No red-first test applies. This plan changes no runtime behavior; it measures
and edits documentation. The evidence logs are the verification artifact, and
parity checks inside the harness (`parityMismatches` = 0) are the correctness gate.

## Done criteria

- [ ] `package.json` pins `"svelte-streamdown": "5.0.0"`, and `pnpm check` exits 0
- [ ] `evidence/2026-10-28-streamdown-5.0.0/` contains `control-streamdown-4.2.1.log`, `suite1-streamdown-5.0.0.log`, `suite2-streamdown-5.0.0.log`, and `README.md`
- [ ] Every log shows svelte-markdown `parityMismatches` 0
- [ ] `grep -n "5.0.0" docs/src/routes/docs/advanced/streaming-benchmarks/+page.svx docs/src/lib/compare-data.ts` matches in both files
- [ ] `.competitive-intel/config.json` `measured_against["svelte-streamdown"]` is `"5.0.0"`
- [ ] `pnpm -C docs check` exits 0, and `trunk check` reports no new issues
- [ ] `git status` shows changes only to in-scope files
- [ ] `README.md` status row updated

## STOP conditions

- `pnpm add -D svelte-streamdown@5.0.0` is refused, or `pnpm check` fails on the harness page.
- Any svelte-markdown parity mismatch is non-zero in any run. That is a
  correctness bug in our renderer, not a benchmark result.
- Case C in Step 4 (a winner flips, or a derived claim no longer holds).
- The 4.2.1 control differs from the published 4.2.0 numbers by more than
  about 2x in either direction. That suggests the machine or harness is
  misbehaving, not a version effect.

## Maintenance notes

- Every future streamdown release re-triggers this. The nightly digest flags it
  via `config.benchmarks[0].measured_against`. Keep running a same-machine
  control of the previous version so hardware and version effects stay separable.
- Plan 002 edits other entries of `compare-data.ts` at the same time. The
  hunks are far apart (lines 36–222 vs 336–608 and 689–772), so git merges them cleanly.
  If you rebase onto 002, re-run `pnpm -C docs check`.
- Plan 004 adds `pele` as a devDependency, so `pnpm-lock.yaml` will conflict
  with that branch. Resolve by re-running `pnpm install` after merging, never
  by hand-editing the lockfile.
