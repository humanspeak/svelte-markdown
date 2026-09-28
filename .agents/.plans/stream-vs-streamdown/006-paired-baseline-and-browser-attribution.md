# Plan 006: Establish a paired benchmark protocol, semantic-parity check, and browser cost attribution

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dea763..HEAD -- src/routes/test/stream-compare/+page.svelte scripts/stream-compare-bench.mjs src/lib/utils/stream-flush-profile.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf (measurement)
- **Planned at**: commit `7dea763`, 2026-09-28

## Why this matters

Every later plan in this batch must prove a speed-up against svelte-streamdown
4.2.0 with a fair, repeatable, semantically verified measurement. Today's
harness (`src/routes/test/stream-compare/+page.svelte`, runner
`scripts/stream-compare-bench.mjs`) measures per-frame main-thread work but
has four gaps the adversarial review (`ADVERSARIAL-REVIEW.md`) called out:

1. Before/after runs are separate suites, so machine noise is confounded with
   the change. Runs must be paired (alternating A/B in one browser session).
2. Output parity is a text-length check within 5%. A stale link `href` has
   the same text length. Parity must be semantic (text, hrefs, image srcs,
   heading ids, table shape, code text) and checked at intermediate states,
   not only at the end.
3. Only 24 KB corpora exist. Work that scales with prefix length (which is
   what we must eliminate) needs prefix-size scaling: same short tail, growing
   prefix.
4. The opt-in flush measure covers parse + diff + state write only. Metadata
   preparation runs in a `$derived`, Svelte's DOM commit in a microtask, and
   style/layout after; none are attributed. A browser trace is needed once so
   later plans optimize the right subsystem.

Deliverable: an upgraded harness, one archived attribution run, and a table
of where each frame's time goes per scenario. No library source changes.

## Current state

- `src/routes/test/stream-compare/+page.svelte` — bench page. `scenarios`
  array (lines ~100–135), corpora generators (~140–225), `measureFrame`
  (~275–297, records `syncMs` + `frameWorkMs` incl. forced
  `getBoundingClientRect`), `run` (~299–390) which computes `workMs` stats,
  `growthRatio` (last fifth ÷ first fifth), `libraryFlushMs` from
  `performance.getEntriesByName(STREAM_FLUSH_MEASURE)`, `outputHash`/`outputLength`
  from normalized `textContent`.
- `scripts/stream-compare-bench.mjs` — Playwright runner; for each scenario
  runs all warmups+iterations for renderer A, then renderer B; summary medians;
  `outputComparable` = text length ratio within 0.95–1.05; prints
  `=== JSON ===` tail.
- `src/lib/utils/stream-flush-profile.ts` — `STREAM_FLUSH_MEASURE =
'svelte-markdown:stream-flush'`, enabled by `globalThis.__svelteMarkdownProfile`.
- `src/lib/SvelteMarkdown.svelte` — the `parsed` prop (default `() => {}`) is
  called with the full token array after every render pass; the bench can use
  it to snapshot streamed tokens for parity.
- Evidence conventions: `.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`
  (environment, commands, results tables).

Runner loop today (`scripts/stream-compare-bench.mjs:~95–120`):

```js
for (const scenario of scenarios) {
    for (const renderer of renderers) {
        for (warmups) await runOnce(page, renderer, scenario.id)
        for (iterations) runs.push(await runOnce(page, renderer, scenario.id))
    }
}
```

Conventions: Svelte 5 runes; TypeScript strict; JSDoc on exported helpers;
Trunk for lint/format (`trunk fmt`, `trunk check --fix`); never
`eslint-disable`; conventional commits (`perf(bench): …`).

## Commands you will need

`pnpm` is not on PATH in non-interactive shells here: prefix with
`export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                | Expected                      |
| ------------- | ------------------------------------------------------------------------------------------------------ | ----------------------------- |
| Typecheck     | `pnpm check`                                                                                           | 0 errors                      |
| Lint + format | `trunk fmt && trunk check --fix`                                                                       | `✔ No issues`                 |
| Unit tests    | `pnpm test`                                                                                            | all pass, coverage ≥ 90%      |
| Build preview | `pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                 | serves `/test/stream-compare` |
| Bench         | `STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare pnpm perf:stream-compare > /tmp/006.log` | exit 0                        |

## Scope

**In scope**:

- `src/routes/test/stream-compare/+page.svelte`
- `scripts/stream-compare-bench.mjs`
- `scripts/stream-compare-attribute.mjs` (create — CDP trace collector)
- `.agents/.plans/stream-vs-streamdown/evidence/006/` (create — logs, JSON, README)
- `.agents/.plans/stream-vs-streamdown/README.md` (status row + attribution table)

**Out of scope**: anything under `src/lib/` (no library changes in this plan);
`docs/` claims (updated only at batch end).

## Git workflow

- Branch: `perf/stream-bench-paired-protocol` off `main`.
- Commits: `perf(bench): paired A/B runs, semantic parity, prefix-scaling scenarios`,
  `perf(bench): CDP attribution script`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Paired, alternating runs in the runner

Change the runner loop so that, per scenario, each iteration runs BOTH
renderers back to back, alternating which goes first
(`iteration % 2 === 0 ? [A, B] : [B, A]`), after one warmup of each. Add
`STREAM_COMPARE_MODE=paired|sequential` (default `paired`) so the old order
remains available. Record `order` on each run. Summaries unchanged; add
`pairedDeltaMsMedian` = median over iterations of (theirs − ours) `totalWorkMs`
and print it.

**Verify**: `STREAM_COMPARE_ITERATIONS=2 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=prose-mixed pnpm perf:stream-compare`
→ log shows runs alternating `svelte-markdown`/`svelte-streamdown` per
iteration and a `paired delta` line.

### Step 2: Semantic parity check against a fresh parse

In the page, for the `svelte-markdown` renderer only, pass a `parsed` callback
that stores the latest token array. Every `PARITY_EVERY = 25` frames and on
the final frame, compare the streamed tokens against a fresh
`new Lexer({...})`-style parse of the same cumulative source. Do the
comparison via the library's own public parse path to keep options identical:
import `parseAndCacheTokens` from `$lib/utils/parse-and-cache.js` (it is an
internal module but importable from the app route; do not export it publicly).

Comparison: a `tokensSemanticallyEqual(a, b)` helper in the page that treats
two nodes equal when every own key matches — primitives by value, arrays
element-wise (null elements allowed, e.g. table `align`), nested objects
recursively; functions never equal. Record `parityMismatches` (count) and the
first mismatch path (e.g. `[3].tokens[1].href`) on the result.

For the competitor, semantic parity against OUR fresh parse is not meaningful
(different token model); instead compare the rendered DOM at the end of the
stream between renderers on a normalized projection: ordered list of
`{ tag, text }` for headings, `{ href, text }` for links, `{ src, alt }` for
images, `{ rows, cols }` per table, code block texts. Record
`domProjectionMatches` and up to five differences. Intentional differences
(e.g. Streamdown's per-line code wrappers) are documented in the evidence
README, not silenced in code.

**Verify**: run `citations` once for ours → `parityMismatches === 0` at the
end; temporarily corrupt the check (e.g. compare against a parse of
`source + 'x'`) → mismatches > 0; revert the corruption.

### Step 3: Prefix-scaling and input-mode scenarios

Add scenarios that keep the appended tail identical while the closed prefix
grows: `prefix-24kb`, `prefix-96kb`, `prefix-384kb`. Each: mount with the
prefix already present as `source` (many short closed paragraphs and headings),
then stream a fixed 2 KB tail of mixed prose at 32 chars/frame. Report the
usual stats. Bounded prefix work shows as flat `avgWorkMs` across the three;
O(N) work shows as growth.

Add `inputMode: 'prop' | 'writeChunk'` to `Scenario`; for `writeChunk`, hold a
component ref (`bind:this`) and call `writeChunk(chunk)` with the delta instead
of assigning `content`. Only `svelte-markdown` supports it; the runner must
skip the competitor for those scenarios and say so in the summary. Add
`prose-mixed-writechunk` using it.

Add a `large-closed-block` scenario: a 20 KB closed nested list (blank line
after), then stream a 2 KB prose tail.

**Verify**: `STREAM_COMPARE_ITERATIONS=1 STREAM_COMPARE_WARMUPS=0 pnpm perf:stream-compare`
completes all scenarios, exit 0, no page errors, new scenarios present in JSON.

### Step 4: Browser attribution script

Create `scripts/stream-compare-attribute.mjs`: launches headless Chromium via
Playwright, opens the page, starts a CDP `Tracing.start` with categories
`devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,blink.user_timing`,
runs ONE `svelte-markdown` iteration of a given scenario
(`STREAM_COMPARE_SCENARIO`), stops tracing, and writes `/tmp/<scenario>.trace.json`.
Then post-process the trace: sum durations per frame for these buckets and
print a table (per scenario: ms per frame, share of total):

- `svelte-markdown:stream-flush` user-timing measure (parse + diff + state write)
- `FunctionCall`/`RunMicrotasks` outside the flush measure but before the
  frame's `UpdateLayoutTree` (Svelte derived + DOM commit; includes metadata)
- `UpdateLayoutTree` + `Layout` (style/layout)
- `Paint` + `CompositeLayers`
- `MinorGC`/`MajorGC`
- everything else in the frame

Also run `Profiler.start/stop` (CPU profile) for the same run and print the
top 15 functions by self time with their script URL. Save both outputs under
the evidence folder.

**Verify**: `STREAM_COMPARE_SCENARIO=prose-mixed node scripts/stream-compare-attribute.mjs`
prints the bucket table whose buckets sum to within 15% of the page's
`totalWorkMs` for that run, and a top-15 list.

### Step 5: Archive the baseline and attribution

With the preview up, run the paired suite (5 iterations, 1 warmup) twice and
the attribution script for `prose-mixed`, `long-list`, `long-code-fence`,
`citations`, `prefix-384kb`. Write
`.agents/.plans/stream-vs-streamdown/evidence/006/README.md` following the
structure of the closed evidence README: environment, exact commands, results
table (ours vs theirs, paired delta), parity results, attribution table, and
top-15 profile functions per scenario. Copy the attribution table into the
batch README under "Attribution baseline".

**Verify**: files present; `pnpm check`, `trunk fmt && trunk check --fix`,
`pnpm test` green.

## Test plan

- No red-first test: this plan changes only the benchmark harness and adds a
  script; there is no runtime library behavior to pin.
- Manual verification per step as listed; the Step 2 corruption check proves
  the parity detector detects.
- `pnpm test` stays green (route files are not unit-tested; svelte-check
  covers types).

## Done criteria

- [ ] Runner supports paired mode and prints `paired delta`
- [ ] Page reports `parityMismatches` (ours) and `domProjectionMatches` (cross-renderer)
- [ ] Scenarios `prefix-24kb`, `prefix-96kb`, `prefix-384kb`, `prose-mixed-writechunk`, `large-closed-block` exist and run
- [ ] `scripts/stream-compare-attribute.mjs` exists; attribution table archived for 5 scenarios
- [ ] `evidence/006/README.md` written; batch README has the attribution table
- [ ] `pnpm check` 0 errors; `trunk check` clean; `pnpm test` green
- [ ] No files under `src/lib/` modified

## STOP conditions

- CDP tracing is unavailable in the installed Playwright/Chromium (report the
  error; fall back to `Profiler` only and say so).
- Parity check reports mismatches on `main` for any scenario — that is a
  correctness bug in the library; report it with the mismatch path and do not
  loosen the comparator.
- The attribution buckets sum to less than 70% of measured frame work — the
  bucket mapping is wrong; report rather than guess.

## Maintenance notes

- Every later plan in this batch cites this protocol: paired mode, ≥ 5
  iterations, parity = 0 mismatches, attribution before/after for the
  scenario it targets.
- When svelte-streamdown bumps versions, `.competitive-intel/config.json`'s
  `measured_against` must be updated together with the docs claims; the
  paired runner makes re-measurement cheap.
