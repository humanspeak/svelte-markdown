# Plan 014 evidence: final paired measurement vs svelte-streamdown 4.2.0

Captured 2026-09-28 on `perf/stream-bench-flush-timing` at `a9a6ebf` (the
final build: plans 007–013 landed, 012 kept). Drift check
`git diff --stat 35bb92a..HEAD -- src/lib docs/src/lib/compare-data.ts .competitive-intel/config.json README.md`
was empty. Library chunk `CzerIEjR.js` (identical to Plan 012's B build),
Svelte runtime chunk `BCivH4Vn.js`. One build and one preview served every
run below.

## Method

Plan 006's paired protocol and clamped per-frame work metric, unchanged
(`evidence/006/README.md`): per scenario one warmup of each renderer, then 5
iterations, each running both renderers back to back in alternating order.
`workMs = syncMs + frameWorkMs` per frame, frame windows clamped so they never
overlap, forced `getBoundingClientRect()` at the end of each frame window
(both renderers pay it). Paired delta = theirs − ours (positive = ours does
less work). Parity: every 25 frames and the final frame, ours' streamed token
tree vs a fresh one-shot parse of the same cumulative source. DOM projection
(headings, links, images, table shapes, `<pre>` texts) compared across
renderers on the final frame. Attribution: `scripts/stream-compare-attribute.mjs`,
one traced run of ours per scenario after one untraced warmup (parity off),
buckets as defined in `evidence/006/README.md`.

Scenarios: the ten from Plan 006 plus `long-table` (Plan 010; 10 KB GFM table,
open until the end, 314 frames).

## Environment

- @humanspeak/svelte-markdown 1.9.5 (this branch); svelte-streamdown 4.2.0.
- Svelte 5.57.1, Vite 8.3.0, @playwright/test 1.63.0, Node v24.21.0.
- HeadlessChrome 153.0.8010.12 via Playwright, 1280 × 900; production build
  served by `vite preview` on 127.0.0.1:4183.
- Ubuntu 26.04.1 LTS; Intel Core i7-6700K @ 4.00 GHz, 8 threads.
- A driver script waited until the 1-minute load was ≤ 4 before each measured
  run (it never had to wait) and recorded `uptime` on the first line of each
  log. 1-minute load at start: suite 1 **2.45** (16:50:00Z), suite 2 **3.37**
  (17:05:47Z), attribution runs 1.34–1.95; after suite 2: 1.82.
- Suite 1 ran 16:50:00Z–17:05:47Z, suite 2 17:05:47Z–17:21:30Z, attribution
  17:21:30Z–17:23:35Z.
- Zero page errors (`metadata.pageErrors: []` in both JSON files).

## Commands

```sh
export PATH=~/.local/share/pnpm/bin:$PATH
pnpm build
pnpm preview --host 127.0.0.1 --port 4183 --strictPort
# suites N = 1, 2 (pnpm perf:stream-compare runs this script)
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_ITERATIONS=5 \
  STREAM_COMPARE_WARMUPS=1 node scripts/stream-compare-bench.mjs
  # stdout up to and including `=== JSON ===` -> final-run-N.log, the JSON tail -> final-run-N.json
# attribution, S in prose-mixed long-list long-code-fence citations prefix-384kb prefix-24kb
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_SCENARIO=$S \
  STREAM_ATTRIBUTE_OUT_DIR=.agents/.plans/stream-vs-streamdown/evidence/014/attribution \
  node scripts/stream-compare-attribute.mjs > attribution/$S.log
# tables below
node .agents/.plans/stream-vs-streamdown/evidence/014/summarize.mjs   # > summary.txt
```

`prefix-24kb` attribution was added to the plan's five so the bounded-work
row can compare renderer work at 24 KB and 384 KB from the same capture.

## Results — paired, median of 5 iterations (suite 1 / suite 2)

Total main-thread work over the whole stream, ms. Ratio = theirs ÷ ours
(> 1 means ours does less work). Over-budget = frames over 16.7 ms (median of
the 5 runs). Source: `final-run-{1,2}.json`, tabulated by `summarize.mjs`
(`summary.txt`).

| Scenario                 | Ours total    | Theirs total  | Paired delta    | Ratio theirs ÷ ours | Ours avg ms/frame | Ours p95    | Theirs p95  | Ours over-budget | Theirs over-budget | Ours lib flush | Parity mismatches (checks per suite) |
| ------------------------ | ------------- | ------------- | --------------- | ------------------- | ----------------- | ----------- | ----------- | ---------------- | ------------------ | -------------- | ------------------------------------ |
| `prose-mixed`            | 1,797 / 1,932 | 2,266 / 2,333 | +477 / +523     | 1.26 / 1.21         | 2.35 / 2.53       | 4.3 / 4.5   | 5.5 / 5.2   | 0 / 0 of 765     | 0 / 0              | 137 / 144      | 0 / 0 (155)                          |
| `prose-mixed-4x`         | 559 / 537     | 1,206 / 1,103 | +649 / +595     | 2.16 / 2.05         | 2.91 / 2.80       | 5.4 / 5.5   | 11.1 / 10.3 | 0 / 0 of 192     | 0 / 1              | 36 / 37        | 0 / 0 (40)                           |
| `long-list`              | 3,501 / 3,625 | 9,377 / 9,111 | +5,909 / +5,450 | 2.68 / 2.51         | 4.64 / 4.81       | 7.3 / 7.9   | 23.7 / 23.2 | 1 / 1 of 754     | 236 / 224          | 1,717 / 1,817  | 0 / 0 (155)                          |
| `long-table`             | 1,620 / 1,569 | 3,745 / 3,577 | +2,105 / +2,036 | 2.31 / 2.28         | 5.16 / 5.00       | 11.2 / 8.2  | 23.8 / 23.3 | 2 / 1 of 314     | 95 / 81            | 428 / 390      | 0 / 0 (65)                           |
| `long-code-fence`        | 1,542 / 1,570 | 1,162 / 1,178 | −379 / −465     | 0.75 / 0.75         | 2.05 / 2.09       | 3.3 / 3.4   | 2.8 / 2.5   | 0 / 0 of 753     | 0 / 0              | 87 / 96        | 0 / 0 (155)                          |
| `citations`              | 1,456 / 1,703 | 1,405 / 1,445 | −50 / −174      | 0.97 / 0.85         | 1.93 / 2.26       | 3.9 / 4.3   | 3.1 / 3.1   | 0 / 0 of 753     | 0 / 0              | 189 / 213      | 0 / 0 (155)                          |
| `prose-mixed-writechunk` | 1,764 / 1,796 | skipped       | —               | —                   | 2.31 / 2.35       | 4.2 / 4.3   | —           | 0 / 0 of 765     | —                  | 149 / 152      | 0 / 0 (155)                          |
| `prefix-24kb`            | 120 / 113     | 162 / 156     | +42 / +37       | 1.35 / 1.37         | 1.79 / 1.69       | 2.7 / 2.5   | 3.0 / 3.2   | 0 / 0 of 67      | 0 / 0              | 9 / 9          | 0 / 0 (15)                           |
| `prefix-96kb`            | 232 / 231     | 425 / 417     | +187 / +200     | 1.83 / 1.81         | 3.46 / 3.45       | 4.8 / 4.6   | 7.8 / 7.3   | 0 / 0 of 67      | 0 / 0              | 8 / 8          | 0 / 0 (15)                           |
| `prefix-384kb`           | 909 / 906     | 2,454 / 2,436 | +1,548 / +1,536 | 2.70 / 2.69         | 13.56 / 13.52     | 19.9 / 19.1 | 44.0 / 43.7 | 14 / 14 of 67    | 67 / 67            | 11 / 10        | 0 / 0 (15)                           |
| `large-closed-block`     | 85 / 84       | 186 / 187     | +102 / +104     | 2.18 / 2.22         | 1.27 / 1.26       | 2.0 / 1.9   | 2.7 / 3.0   | 0 / 0 of 67      | 1 / 1              | 14 / 13        | 0 / 0 (15)                           |

Per-pair deltas (theirs − ours, ms): `citations` −291.5, −49.7, −149.1,
+350.2, +101.5 / −354.9, −173.9, −230.1, −107.3, −51.0 (mixed sign in suite 1,
all negative in suite 2); `long-code-fence` all ten negative; `prefix-24kb`
one negative pair per suite (−39.1 / −23.5), the other eight positive; every
pair positive on all other paired scenarios. Full lists: `summary.txt`.

Over-budget frames on every individual run (ours): `long-list` [1,0,0,2,2] /
[5,0,0,3,1]; `long-table` [4,2,2,1,3] / [4,1,0,0,1]; `prefix-384kb`
[20,14,14,15,14] / [18,10,14,14,18]; `citations` [0,0,1,0,0] / [1,1,0,0,0];
`prose-mixed-writechunk` [0,0,0,0,0] / [1,0,0,0,0]; every other scenario 0 on
every run. Streamdown's per-run lists are in `summary.txt`.

### Parity and correctness

`parityMismatchesMax === 0` on every scenario in both suites (and on every
individual run: `parityMismatches` 0 in every `runs[]` entry). The parity
comparator is unchanged since Plan 006.

### DOM projection (ours vs Streamdown, final frame)

MATCH on every paired scenario except the two documented since Plan 006, in
both suites:

- `long-code-fence` — `codeBlocks[0]` text differs only in line separators:
  Streamdown wraps each code line in its own element without newline text
  nodes, so its normalized text joins lines (`// step 0export ...`) where ours
  keeps the separator. Same code, different markup.
- `citations` — `links.length: ours 258 · theirs 0`. Streamdown renders none
  of the reference-style `[n]` citations as links, so it does not do the work
  of rendering 258 links. **Not a like-for-like comparison.**

Descendant element counts at the end of the stream (`domNodes`, identical in
both suites), ours / theirs: `prose-mixed` 1,381 / 1,704; `long-list` 768 /
769; `long-table` 1,194 / 1,196; `long-code-fence` 4 / 797; `citations` 776 /
519; `prefix-24kb` 1,369 / 1,398; `prefix-96kb` 5,065 / 5,094;
`prefix-384kb` 19,489 / 19,518; `large-closed-block` 1,319 / 1,348.

### Against the Plan 006 clamped baseline (STOP check)

Ours total, this capture vs Plan 006 (suite 1 / suite 2): `prose-mixed`
−44.4% / −38.0%, `prose-mixed-4x` −38.8% / −49.7%, `long-list` −72.7% /
−72.2%, `long-code-fence` −45.7% / −46.5%, `citations` −68.0% / −62.6%,
`prose-mixed-writechunk` −43.9% / −44.5%, `prefix-24kb` −70.1% / −70.7%,
`prefix-96kb` −71.6% / −71.0%, `prefix-384kb` −78.0% / −78.5%,
`large-closed-block` −59.8% / −59.9% (`long-table` did not exist in 006). No
scenario is worse, so the "> 5% worse" STOP did not fire. Cross-capture
absolute numbers carry the machine drift documented in 006 (Streamdown,
unchanged, measures between +2% (`long-list`) and −39% (`prefix-24kb`)
relative to its own 006 totals); the paired ratios are the comparable
quantity.

## Acceptance-contract verdict

Contract: batch `README.md`, "Goal and acceptance contract". Cells read
suite 1 / suite 2; "met" only when both suites meet the condition.
"In contract list" marks the six scenarios the contract names for
"ours total < theirs". Over-budget is shown both as the median over the 5
runs (the reported summary statistic) and as the worst single run.

| Scenario                 | Parity 0    | Ours total < theirs                   | In contract list | Ours over-budget = 0 (median) | Ours over-budget = 0 (every run) | Ratio theirs ÷ ours |
| ------------------------ | ----------- | ------------------------------------- | ---------------- | ----------------------------- | -------------------------------- | ------------------- |
| `prose-mixed`            | 0 / 0 — met | 1,797 < 2,266 / 1,932 < 2,333 — met   | yes              | 0 / 0 — met                   | max 0 / 0 — met                  | 1.26 / 1.21         |
| `prose-mixed-4x`         | 0 / 0 — met | 559 < 1,206 / 537 < 1,103 — met       | no               | 0 / 0 — met                   | max 0 / 0 — met                  | 2.16 / 2.05         |
| `long-list`              | 0 / 0 — met | 3,501 < 9,377 / 3,625 < 9,111 — met   | yes              | 1 / 1 — unmet                 | max 2 / 5 — unmet                | 2.68 / 2.51         |
| `long-table`             | 0 / 0 — met | 1,620 < 3,745 / 1,569 < 3,577 — met   | no               | 2 / 1 — unmet                 | max 4 / 4 — unmet                | 2.31 / 2.28         |
| `long-code-fence`        | 0 / 0 — met | 1,542 > 1,162 / 1,570 > 1,178 — unmet | yes              | 0 / 0 — met                   | max 0 / 0 — met                  | 0.75 / 0.75         |
| `citations`              | 0 / 0 — met | 1,456 > 1,405 / 1,703 > 1,445 — unmet | yes              | 0 / 0 — met                   | max 1 / 1 — unmet                | 0.97 / 0.85         |
| `prose-mixed-writechunk` | 0 / 0 — met | n/a (Streamdown skipped)              | no               | 0 / 0 — met                   | max 0 / 1 — unmet                | —                   |
| `prefix-24kb`            | 0 / 0 — met | 120 < 162 / 113 < 156 — met           | no               | 0 / 0 — met                   | max 0 / 0 — met                  | 1.35 / 1.37         |
| `prefix-96kb`            | 0 / 0 — met | 232 < 425 / 231 < 417 — met           | no               | 0 / 0 — met                   | max 0 / 0 — met                  | 1.83 / 1.81         |
| `prefix-384kb`           | 0 / 0 — met | 909 < 2,454 / 906 < 2,436 — met       | yes              | 14 / 14 — unmet               | max 20 / 18 — unmet              | 2.70 / 2.69         |
| `large-closed-block`     | 0 / 0 — met | 85 < 186 / 84 < 187 — met             | yes              | 0 / 0 — met                   | max 0 / 0 — met                  | 2.18 / 2.22         |

p95 renderer-work target (≤ 8 ms, "a target, not a guarantee"): ours p95 ≤ 8
ms on every scenario except `long-table` (11.2 / 8.2) and `prefix-384kb`
(19.9 / 19.1).

Regression bound ("no scenario regressed by more than 3% relative to its Plan
006 baseline"): every scenario's ours total is 38–79% below its Plan 006
value in both suites (section above) — met on the ten scenarios that have a
006 baseline; `long-table` has none.

### Bounded work: `prefix-384kb` within 15% of `prefix-24kb`

| Quantity                                                                      | `prefix-24kb` | `prefix-384kb` | 384 ÷ 24      | Within 15%? | Source                                           |
| ----------------------------------------------------------------------------- | ------------- | -------------- | ------------- | ----------- | ------------------------------------------------ |
| Renderer work, ms/frame (flush + JS outside flush; one traced run each)       | 1.37          | 1.91           | 1.40×         | unmet       | `attribution/prefix-{24,384}kb.attribution.json` |
| Total avg work, ms/frame (paired suites, median; suite 1 / suite 2)           | 1.79 / 1.69   | 13.56 / 13.52  | 7.59× / 7.98× | unmet       | `final-run-{1,2}.json` `avgWorkMsMedian`         |
| Style/layout, ms/frame (the bench's forced whole-document layout; traced run) | 0.94          | 11.34          | 12.1×         | —           | attribution                                      |
| Paint + other `RunTask`, ms/frame (traced run)                                | 0.16          | 7.72           | —             | —           | attribution                                      |
| Streamdown total avg work, ms/frame (paired suites)                           | 2.41 / 2.32   | 36.62 / 36.36  | 15.2× / 15.6× | —           | `final-run-{1,2}.json`                           |

Which number the contract should read is the reviewer's decision. Renderer
work (flush + JS outside the flush) grows by 0.54 ms/frame from 24 KB to
384 KB; total work additionally includes the browser's style/layout and paint
of a 19,489-element document, which the bench forces every frame and which
Streamdown also pays (19,518 elements). The traced `prefix-384kb` run's page
average (21.23 ms/frame) is higher than the untraced suites' (13.5), i.e.
tracing inflates that scenario; the bucket ratios are from the traced run.

## Attribution (ours, one traced run each, ms per frame and share of page total)

| Scenario          | Page avg | Flush        | JS outside flush | Style/layout  | Paint        | GC          | Other        | Untraced     | Traced ÷ page total | Paint after windows (not charged) |
| ----------------- | -------- | ------------ | ---------------- | ------------- | ------------ | ----------- | ------------ | ------------ | ------------------- | --------------------------------- |
| `prose-mixed`     | 2.70     | 0.19 (7.0%)  | 1.32 (48.7%)     | 0.62 (22.8%)  | 0.03 (1.1%)  | 0.03 (1.0%) | 0.15 (5.7%)  | 0.37 (13.6%) | 86.4%               | 1.42                              |
| `long-list`       | 5.35     | 2.52 (47.0%) | 2.05 (38.3%)     | 0.37 (6.8%)   | 0.03 (0.5%)  | 0.00 (0.0%) | 0.13 (2.5%)  | 0.26 (4.9%)  | 95.1%               | 1.15                              |
| `long-code-fence` | 2.01     | 0.11 (5.5%)  | 0.73 (36.4%)     | 0.73 (36.3%)  | 0.01 (0.7%)  | 0.00 (0.0%) | 0.14 (6.9%)  | 0.29 (14.2%) | 85.8%               | 1.67                              |
| `citations`       | 2.49     | 0.28 (11.4%) | 1.20 (48.2%)     | 0.45 (18.3%)  | 0.02 (0.9%)  | 0.03 (1.1%) | 0.18 (7.2%)  | 0.32 (13.0%) | 87.0%               | 1.20                              |
| `prefix-384kb`    | 21.23    | 0.15 (0.7%)  | 1.76 (8.3%)      | 11.34 (53.4%) | 4.19 (19.7%) | 0.23 (1.1%) | 3.53 (16.6%) | 0.03 (0.1%)  | 99.9%               | 1.53                              |
| `prefix-24kb`     | 2.76     | 0.17 (6.2%)  | 1.20 (43.5%)     | 0.94 (34.1%)  | 0.04 (1.5%)  | 0.03 (1.1%) | 0.12 (4.3%)  | 0.26 (9.3%)  | 90.7%               | 0.90                              |

Plan 006 → now (page avg ms/frame, same buckets): `prose-mixed` 3.81 → 2.70,
`long-list` 17.70 → 5.35, `long-code-fence` 3.20 → 2.01, `citations` 6.08 →
2.49, `prefix-384kb` 65.18 → 21.23 (traced runs; cross-capture).

Summary:

- **JS outside the flush** is still the largest bucket on `prose-mixed`
  (48.7%), `citations` (48.2%) and `prefix-24kb` (43.5%), but in absolute
  terms it fell from 2.13 → 1.32 (`prose-mixed`) and 4.10 → 1.20
  (`citations`) ms/frame since 006.
- **`long-list` is now flush-bound** (47.0%): the open list is re-lexed on
  every append. Top self time: marked `inlineTokens` 16.3%, `isSemanticallyEqual`
  (`mo` `CzerIEjR.js:68:5964`, `streaming-token-reuse.ts`) 11.4%, Svelte batch
  traversal `#v` 5.3%, forced layout 5.2%, Svelte runtime `#g`
  (`BCivH4Vn.js:1:10688`, not identified further) 5.0%, marked `list` 4.4%.
- **`long-code-fence`** splits evenly between JS outside the flush and
  style/layout (36% each); forced layout (`getBoundingClientRect`) is 33.2% of
  sampled self time.
- **`prefix-384kb` is browser-bound**: style/layout 53.4% + paint 19.7% +
  other `RunTask` 16.6%; flush + JS outside the flush together are 9.0%.
  `getBoundingClientRect` is 53.3% of sampled self time; the next entry is the
  component's `syncStreamingSourceFromProp` (`_e` `CzerIEjR.js:72:9642`, its
  `startsWith` over the source) at 1.9%.
- `prose-mixed` / `citations` / `prefix-24kb`: forced layout is the top
  self-time entry (21.2% / 16.1% / 33.8%); no library function exceeds 2%.

Top-15 self-time lists per scenario are in `attribution/<scenario>.log`.
Raw traces and CPU profiles were written to `/tmp` and not archived.

## Files

- `final-run-{1,2}.log` — suite output up to and including `=== JSON ===`
  (first two lines: load at start and start time).
- `final-run-{1,2}.json` — the JSON tail of each suite.
- `attribution/<scenario>.log`, `attribution/<scenario>.attribution.json` —
  six attribution runs (first line of each log: load at start).
- `summarize.mjs`, `summary.txt` — the script that produced the tables and its
  output (includes per-pair deltas and per-run over-budget counts for both
  renderers).
