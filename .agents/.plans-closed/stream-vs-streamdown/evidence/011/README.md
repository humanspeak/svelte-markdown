# Plan 011 evidence: bounded prefix work

Captured 2026-09-28 on `perf/stream-bench-flush-timing`, working tree on top of
`1065756` (drift check `git diff --stat 31668b8..HEAD -- <5 in-scope files>` was
empty).

- **A** = `1065756` in a separate worktree (`git worktree add --detach
/tmp/svm-ab-a-011 1065756`, `pnpm install --frozen-lockfile`, `pnpm build`),
  preview on **port 4173**. Library chunk `CrvI8adm.js`.
- **B** = this checkout. Step-1 A/A: B built before any change (library chunk
  `CrvI8adm.js` — byte-identical to A; the only differing chunk is SvelteKit's
  build-timestamp chunk). Interim (Steps 2–4 only): `PObzzTCD.js`. Final:
  `Blkxhcok.js`. Preview on **port 4183**. Svelte runtime chunk `BCivH4Vn.js`
  identical everywhere.
- Worktree and previews removed after the runs.

Environment as in 007/010: Svelte 5.57.1, Vite 8.3.0, Playwright 1.63.0, Node
v24.21.0, HeadlessChrome 153.0.8010.12 (1280 × 900), Ubuntu 26.04.1, i7-6700K
(8 threads). 1-minute load at the start of every measured run is the first line
of its log: 0.87–3.32 (the runner waits while it is above 4). Zero page errors
in every run.

## Commands

```sh
export PATH=~/.local/share/pnpm/bin:$PATH
# paired A/B (A = 4173, B = 4183); vs Streamdown uses STREAM_COMPARE_URL=B only
STREAM_COMPARE_URL_A=http://127.0.0.1:4173/test/stream-compare \
STREAM_COMPARE_URL_B=http://127.0.0.1:4183/test/stream-compare \
STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S \
  node scripts/stream-compare-bench.mjs > ab-run-N-$S.log   # .json = the JSON tail
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_SCENARIO=$S \
STREAM_ATTRIBUTE_OUT_DIR=<dir> node scripts/stream-compare-attribute.mjs
# dev-only counters (vitest, jsdom; same corpora and 32-char prop updates as the page)
SVM_COUNTERS_LABEL=before|after pnpm vitest run \
  --config .agents/.plans/stream-vs-streamdown/evidence/011/vitest.counters.config.mjs
node .agents/.plans/stream-vs-streamdown/evidence/011/summarize.mjs <file.json>...
```

## Step 1: prefix-proportional costs (before)

Same-build A/A (both sides `1065756`), median of 5 pairs; attribution = one
traced run of B; counters = mean per update over the 67 streamed updates.

| Prefix | avgWorkMs A / B | lib flush ms A / B (per frame) | A/A paired delta | comparedRoots | copiedRoots | keyEvaluations¹ | Flush / JS outside / layout / paint / other / untraced share |
| ------ | --------------- | ------------------------------ | ---------------- | ------------- | ----------- | --------------- | ------------------------------------------------------------ |
| 24 KB  | 2.06 / 1.96     | 11.5 / 11.3 (0.17)             | +8.1 (+5.9%)²    | 857           | 1,716       | 5,162           | 7.3 / 49.8 / 29.9 / 0.7 / 3.7 / 8.3 %                        |
| 96 KB  | 5.43 / 5.34     | 16.7 / 17.1 (0.25)             | +13.7 (+3.8%)    | 3,321         | 6,644       | 19,946          | 4.2 / 49.2 / 40.2 / 0.2 / 1.5 / 4.3 %                        |
| 384 KB | 29.87 / 30.14   | 60.4 / 65.7 (0.90–0.98)        | −7.1 (−0.4%)     | 12,937        | 25,876      | 77,642          | 2.7 / 45.0 / 31.3 / 11.1 / 9.0 / 0.1 %                       |

¹ Every `getStableNodeKey` call in dev: ≈ 6 per root per update (Svelte's each
body, the reconcile pass, and dev-only key validation); production does ≈ 2.
² One outlier pair (+105.9); the other four are −0.3..+8.4 ms.

All three counters scale linearly with the prefix — the red state for Steps
2–4 (and 5). Parity 0 (15 checks per side), output hash and DOM projection
MATCH A vs B.

Per frame at 384 KB (attribution): flush 0.95 ms, JS outside the flush 16.15,
style/layout 11.24, paint 3.98, other `RunTask` 3.22. Inside "JS outside",
the root keyed `{#each}` over 12,940 roots is ≈ 14.3 ms/frame (breakdown in
`../../011-design.md`); `isAppendOnlyUpdate` (parser `startsWith`) 0.59 and
the component's `startsWith` in `syncStreamingSourceFromProp` 0.37.

**A/A flush check (010's unexplained flush rise).** `libraryFlushMs` is
symmetric between the two sides of a same-build run: 11.5 vs 11.3, 16.7 vs
17.1, 60.4 vs 65.7 ms (±2.5% at 24/96 KB, +8.8% at 384 KB where each pair's
flush is ~1 ms/frame and noisy). So the runner does not bias the flush
measure by side. The "flush rises when frames do less other work" effect 010
saw was **not reproduced**: in this plan's A/B the outside-flush work fell
89% on `prefix-384kb` and the flush fell with it, and on the scenarios whose
flush code path barely changed (`long-list`: the open-list re-lex dominates)
B's flush is 3–5% LOWER than A's (2,031/2,042 → 1,965/1,939 ms). The 010 rise
remains unexplained, but it is not a property of the measure or the runner.

## What changed, per step

| Step | Change                                                                                                                                                                                                                                                                                                                                                                                           | Measured cost before (384 KB)                                                       | Result                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1    | Dev-only `globalThis.__svmStreamStats` counters (`streaming-token-reuse.ts`: `countStreamStat`, guarded by `STREAM_STATS_ENABLED` = `typeof import.meta.env === 'object' && import.meta.env.DEV === true`; call sites in the divergence scan, the parser's prefix copy, both reuse paths, and `getStableNodeKey`). Absent from the production client bundle; plain Node import of `dist/` works. | —                                                                                   | counters table above                                            |
| 2    | `findDivergence` starts at `parseResult.reusedPrefixCount` (= `boundary.prefixCount` on the plain tail-window path, 0 on every other path including the targeted-definition path that replaces prefix roots).                                                                                                                                                                                    | 12,937 comparisons/update (`findDivergence` 0.16 ms/frame inclusive in the profile) | comparedRoots **1** per update at every size                    |
| 3(a) | Parser prefix copy is `slice().concat(tail)` (15.8 µs vs 122.6 µs for the spread at 12,940 roots, Node micro-bench); the component adopts the parser's fresh array and writes only `[identicalPrefix, divergeAt)` + the merged root into it (`reuseStableTokenArrayInPlace`), skipping the reused prefix while the rendered array is the one the parser returned last.                           | two O(N) copies ≈ 157 µs/update (micro-bench), 25,876 slots                         | copiedRoots 12,938 = **one** copy; ≈ 16 µs                      |
| 4    | `parsed` defaults to `undefined`; the effect reads `parsed` first, so with no callback it never subscribes to `tokens` (a supplied callback still gets the full array every pass). `IncrementalParser.update(source, appendsTo?)`: the component passes the string it already verified with `startsWith`, and the parser skips its own full-length scan when that string IS its previous source. | parser `startsWith` 0.59 ms/frame + component 0.37 ms/frame                         | parser scan gone from the profile; one correctness scan remains |
| 5    | Offset-bucket root segments under one owner (design + decision: `../../011-design.md`): `render-metadata.ts` `prepareRootSegments`/`getRootSegments`, Parser root branch `{#each segments (id)}{#each segment.tokens (key)}`, flat each kept for caller token arrays. `SvelteMarkdown` now keeps the metadata start index at the minimum across updates not yet rendered.                        | root keyed each ≈ 14.3 ms/frame; keyEvaluations 77,642/update (dev)                 | keyEvaluations **203**/update; each cost ≈ 0.2 ms/frame         |

Steps 2–4 alone (interim build, `attribution-steps2-4/`): flush at 384 KB
0.953 → 0.159 ms/frame (−83%); JS outside the flush unchanged at 16.18
ms/frame, of which the root each ≈ 14.3 — the input to the Step 5 decision.

## Counters, before → after (mean per update; max in `counters-*.json`)

| Scenario             | comparedRoots | copiedRoots     | keyEvaluations |
| -------------------- | ------------- | --------------- | -------------- |
| `prefix-24kb`        | 857 → 1       | 1,716 → 858     | 5,162 → 165    |
| `prefix-96kb`        | 3,321 → 1     | 6,644 → 3,322   | 19,946 → 284   |
| `prefix-384kb`       | 12,937 → 1    | 25,876 → 12,938 | 77,642 → 203   |
| `large-closed-block` | 27 → 1        | 56 → 28         | 182 → 74       |

`comparedRoots` and `keyEvaluations` are flat (key evaluations follow where
the prefix ends inside its 4 KB bucket, not the prefix size); `copiedRoots` is
the one remaining O(N) copy — a `slice` the parser needs to return a fresh
array (the component and `parsed` consume one array), ≈ 16 µs at 12,940 roots.

## Attribution, before → after (ms per frame, one traced run each)

| Prefix | Flush       | JS outside flush | Style/layout  | Paint       | Other       | Page avg      |
| ------ | ----------- | ---------------- | ------------- | ----------- | ----------- | ------------- |
| 24 KB  | 0.23 → 0.17 | 1.57 → 1.19      | 0.94 → 0.99   | 0.02 → 0.04 | 0.12 → 0.13 | 3.15 → 2.82   |
| 96 KB  | 0.28 → 0.08 | 3.23 → 1.13      | 2.64 → 2.82   | 0.02 → 0.01 | 0.10 → 0.10 | 6.57 → 4.43   |
| 384 KB | 0.95 → 0.16 | 16.15 → 1.76     | 11.24 → 11.28 | 3.98 → 3.69 | 3.22 → 3.12 | 35.89 → 20.17 |

Top self time at 384 KB after: `getBoundingClientRect` (the page's forced
layout) 56%; the component's `startsWith` 2.1% (0.42 ms/frame); the Svelte each
body 0.3% and batch traversal 0.5% (16.0% and 8.8% after Steps 2–4 alone). The root-each cost
is gone; what scales with the prefix now is browser layout/paint of a
19,489-element DOM (see "Not met" below).

## Paired A/B (median of 5 pairs; repeat 1 / repeat 2; delta = A − B, positive = B does less)

| Scenario             | A total       | B total       | Paired delta (% of A)                             | A lib flush   | B lib flush   | A p95       | B p95       | A over-budget | B over-budget | Parity A / B |
| -------------------- | ------------- | ------------- | ------------------------------------------------- | ------------- | ------------- | ----------- | ----------- | ------------- | ------------- | ------------ |
| `prefix-24kb`        | 138.3 / 142.5 | 109.1 / 112.2 | +33.1 (23.9%) / +30.4 (21.3%)                     | 11.6 / 11.6   | 8.6 / 8.5     | 2.9 / 3.1   | 2.3 / 2.4   | 0 / 0         | 0 / 0         | 0 / 0        |
| `prefix-96kb`        | 382.5 / 360.8 | 219.7 / 223.8 | +153.9 (40.2%) / +134.5 (37.3%)                   | 16.6 / 16.2   | 8.4 / 8.2     | 7.5 / 6.7   | 4.4 / 4.7   | 0 / 0         | 0 / 0         | 0 / 0        |
| `prefix-384kb`       | 2,051 / 2,023 | 953 / 910     | +1,078 (52.5%) / +1,081 (53.4%)                   | 63.9 / 59.8   | 13.9 / 11.8   | 35.5 / 35.4 | 22.8 / 19.4 | 67 / 67       | 17 / 16       | 0 / 0        |
| `prose-mixed`        | 2,206 / 2,239 | 1,947 / 1,901 | +223 (10.1%) / +376 (16.8%)                       | 337.5 / 344.0 | 148.4 / 150.8 | 5.2 / 5.3   | 4.7 / 4.5   | 0 / 0         | 0 / 0         | 0 / 0        |
| `large-closed-block` | 81.6 / 92.0   | 92.9 / 79.8   | −3.6 (−4.4%) / +12.2 (13.3%); 9-pair: +8.0 (9.3%) | 15.5 / 17.8   | 15.4 / 13.5   | 1.7 / 2.0   | 1.8 / 1.9   | 0 / 0         | 0 / 0         | 0 / 0        |
| `long-list`          | 3,984 / 3,948 | 3,805 / 3,778 | +137 (3.5%) / +232 (5.9%)                         | 2,031 / 2,042 | 1,965 / 1,939 | 10.1 / 9.6  | 9.1 / 9.0   | 5 / 4         | 4 / 1         | 0 / 0        |
| `citations`          | 1,965 / 1,946 | 1,706 / 1,748 | +201 (10.2%) / +165 (8.5%)                        | 417.7 / 418.6 | 222.6 / 211.4 | 4.9 / 4.6   | 4.3 / 4.5   | 0 / 0         | 0 / 0         | 0 / 0        |

Per-pair deltas are in each log/JSON (`summarize.mjs` prints them).
`prefix-384kb` pairs: 990, 1,078, 1,180, 1,098, 1,073 / 1,033, 1,073, 1,081,
1,132, 1,113 — all positive. `large-closed-block` (≈ 85 ms totals, 67 frames)
had mixed-sign pairs in repeat 1 (67.2, 7.9, −17.4, −3.6, −11.3); repeat 2
and a 9-pair tiebreak (50.3, 13.2, −5.2, 3.7, 5.4, 21.5, 8.0, 19.7, −3.6) both
favour B, so repeat 1 is judged noise. Output hash and DOM projection MATCH A
vs B in all 15 runs; parity 0 everywhere (15 checks per side on the 67-frame
scenarios, 155 on the 24 KB ones, 27 on the tiebreak). `long-list` and
`citations` are the regression check: both improve.

## Ours vs Streamdown (B, paired, median of 5; repeat 1 / repeat 2)

| Scenario             | Ours total    | Theirs total  | Paired delta (ours − theirs) | Ours over-budget | Theirs over-budget | Ours p95    | Theirs p95  |
| -------------------- | ------------- | ------------- | ---------------------------- | ---------------- | ------------------ | ----------- | ----------- |
| `prose-mixed`        | 1,925 / 1,994 | 2,549 / 2,429 | −579 / −544                  | 0 / 0 of 765     | 0 / 1              | 4.6 / 4.8   | 5.6 / 5.8   |
| `prefix-384kb`       | 929 / 909     | 2,459 / 2,442 | −1,538 / −1,536              | 17 / 10 of 67    | 67 / 67            | 19.3 / 18.9 | 42.5 / 44.5 |
| `prefix-24kb`        | 112 / 108     | 168 / 173     | −52 / −59                    | 0 / 0            | 0 / 0              | 2.5 / 2.3   | 3.2 / 3.2   |
| `large-closed-block` | 84 / 85       | 197 / 178     | −113 / −91                   | 0 / 0            | 1 / 1              | 1.8 / 1.7   | 3.2 / 2.9   |

Parity 0; DOM projection MATCH ours vs theirs on all eight runs.

## Not met: bounded work (`prefix-384kb` within 15% of `prefix-24kb`)

B: 14.22 / 13.58 ms vs 1.63 / 1.68 ms average work per frame — 8.1–8.7×
(A: 14.9×). What still grows with the prefix is not renderer work:

| ms/frame (attribution, after)       | 24 KB | 384 KB |
| ----------------------------------- | ----- | ------ |
| Flush + JS outside flush (renderer) | 1.36  | 1.92   |
| Style/layout (page's forced read)   | 0.99  | 11.28  |
| Paint + composite + other RunTask   | 0.17  | 6.81   |

The renderer's own per-frame work is now within ≈ 0.6 ms between 24 KB and
384 KB; the rest is Chromium laying out and painting a 19,489-element document
(the bench forces layout every frame). Streamdown pays the same (36.4–36.7
ms/frame at 384 KB). Bounding it needs DOM-level containment of closed blocks
(e.g. `content-visibility`), which changes consumers' markup/CSS and is out of
this plan's scope — recorded for the batch owner, not attempted.

## Tests (red → green)

| Test                                                                                                                                                                                                           | Red (fix reverted)                                     | Green |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----- |
| `incremental-parser.test.ts` › starts the divergence scan at the reused prefix boundary on a tail-window append (plan 011) — spy on `isSameStableNode`                                                         | 49 calls > bound 4                                     | ✓     |
| `SvelteMarkdown.bounded-prefix.test.ts` › the divergence scan compares only the re-lexed tail                                                                                                                  | 43 > 4 (`divergeAt = 0`)                               | ✓     |
| … › root tokens are copied at most once per update                                                                                                                                                             | 806 > 408 (component copy restored)                    | ✓     |
| … › keyed-each key evaluations per update do not grow with the prefix                                                                                                                                          | 4,829 > 588 (flat root each)                           | ✓     |
| … › an edit and an append applied before one render re-prepare from the edit                                                                                                                                   | renders `Closed paragraph 0` (start index overwritten) | ✓     |
| … › paragraph streamed open, closed, then 100 appends is mounted exactly once; duplicate headings across segment boundaries; resetStream + options change; two updates before one render                       | acceptance tests (pass before and after)               | ✓     |
| `render-metadata.test.ts` › root segments (plan 011), 6 tests; `streaming-token-reuse.test.ts` › reuseStableTokenArrayInPlace, 2 tests; parser › keeps comparing from index 0 when the tail window is bypassed | new unit coverage                                      | ✓     |

The `parsed` default change has no failing-first test (there is no default
function left to spy on); the new tests assert the contract (a supplied
callback still receives the full array each update; rendering without one
works).

## Gates

- `pnpm check`: 0 errors, 3 warnings (pre-existing, unrelated files).
- `trunk fmt` + `trunk check --fix`: ✔ No issues.
- `pnpm test`: 161 files, 1,218 tests pass; statements 97.35%, branches
  92.63%, functions 98.26%, lines 98.56%.
- `npx playwright test --project=chromium`: 120 passed (other browsers not run).

## Files

- `aa-prefix-{24,96,384}kb.{log,json}` — Step 1 same-build A/A.
- `ab-run-{1,2}-<scenario>.{log,json}`, `ab-run-3-9pairs-large-closed-block.*` — A/B.
- `vs-streamdown-{1,2}-<scenario>.{log,json}` — B vs Streamdown.
- `attribution-before/`, `attribution-steps2-4/`, `attribution-after/` — logs
  and `*.attribution.json` (raw traces/profiles stayed in `/tmp`).
- `counters-{before,after}.json`, `stream-stats.counters.test.js`,
  `vitest.counters.config.mjs` — dev counter harness.
- `summarize.mjs` — medians, paired deltas, per-pair lists from bench JSON.
