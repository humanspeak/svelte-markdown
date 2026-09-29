# Plan 010 evidence: list/table render work — H1–H4 attribution and fixes

Captured 2026-09-28 on `perf/stream-bench-flush-timing`, working tree on top of
`37e42f2` (drift check `git diff --stat 8fd84a7..HEAD -- Parser.svelte
render-metadata.ts streaming-token-reuse.ts` was empty).

- **A** = `37e42f2` in a separate worktree (`git worktree add --detach
/tmp/svm-ab-a-010 37e42f2`, `pnpm install --frozen-lockfile`, `pnpm build`),
  with ONLY the bench page (`src/routes/test/stream-compare/+page.svelte`, the
  new `long-table` scenario) copied in so both sides can run it. Preview on
  **port 4173**. Library chunk `ayH7RpC4.js` — identical to the chunk profiled in
  `attribution-before/` (built from this checkout before any library change).
- **B** = this checkout with the changes below, preview on **port 4183**.
  Library chunk `CrvI8adm.js`. The Svelte runtime chunk `BCivH4Vn.js` is
  identical in A and B.
- Worktree removed after the runs.

## Environment

Same machine as 007: @humanspeak/svelte-markdown 1.9.5; Svelte 5.57.1; Vite 8.3.0;
Playwright 1.63.0; Node v24.21.0; HeadlessChrome 153.0.8010.12, 1280 × 900;
Ubuntu 26.04.1 LTS; Intel Core i7-6700K @ 4.00 GHz, 8 threads. 1-minute load at
the start of each measured run (first line of each log): 1.18–2.30, never above 4.
Zero page errors in every run.

## Verdicts

| Hyp.                                   | Verdict                                                                           | Observable                                                                                                                                                 | Numbers                                                                                                                                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| H1 list `parserRest` churn             | **CONFIRMED**, fixed                                                              | `window.__svmParserUpdateCount` after appending 8 chars to the last item of a 30-item open list, default renderers (`SvelteMarkdown.issue-328.test.ts`)    | 122 updates before (= 30 items × 4 Parsers + list + root) → 6 after (bound = 4 Parsers under the last item + 2)                                                                                                                                                                       |
| H2 table `cellRest` churn              | **CONFIRMED**, fixed                                                              | same counter, appending to the last cell of a 20-row open table                                                                                            | 62 before (= 20 rows × 3 inline Parsers + 2) → 2 after (bound 1 + 2)                                                                                                                                                                                                                  |
| H3 metadata re-walk of reused children | **CONFIRMED** (measurable), fixed                                                 | attribution top-15 on `long-list`; key writes (`WeakMap.prototype.set` with `src:` values) and `tokens` reads on reused items in `render-metadata.test.ts` | before: `assignSourceKeysToChildren` 1.6% + `assignHeadingIds` 1.6% (in top-15); after H1/H2 alone they grew to 2.7% + 2.4% + `assignSequentialSourceKeys` 1.9% (~0.4 ms/frame). Unit: 601 key writes → ≤ 4; 98 `tokens` reads on reused items → 0. After: none of them in the top-15 |
| H4 layout                              | **REFUTED** as the driver for `long-list`; not the dominant cost for `long-table` | attribution style/layout bucket                                                                                                                            | `long-list` 4.0% (0.32 ms/frame) before, 6.4% (0.34 ms/frame) after — unchanged in absolute terms. `long-table` 11.6% → 19.2% share but ~1 ms/frame in both; most of it is the bench's own forced `getBoundingClientRect` read. No DOM-shape change warranted in this plan.           |

The STOP condition "H1 and H2 refuted AND most time in style/layout" did not
fire.

## Changes

- `src/lib/Parser.svelte` (H1/H2): list and table-body branches now pass a
  per-instance `childRest` to `dispatch(...)` for CHILD tokens only. It is
  `sanitizedRest` without volatile parent fields (list: `items raw text tokens
type`; table: `align raw text header rows tokens type`), and a `$derived.by`
  that returns the previous object while its keys/values are shallow-equal, so
  a growing open list/table no longer notifies every item's/cell's child
  Parsers. `<ListItemComponent {...item}>`, `<renderers.tablecell {...cellRest}>`,
  `cellSnippet`/`listSnippet`/item-snippet arguments are untouched.
    - Deviation from the plan's sketch: the plan suggested memoizing by the
      `sanitizedRest` object in a `WeakMap`. For list/table Parsers
      `sanitizedRest` IS the component's rest-props proxy (`$.rest_props(...)`,
      created once per instance — verified in the compiled output), so an
      identity memo would freeze the first frame's values. Memoization is by
      value instead.
    - Behaviour note: child tokens that carry no `text` of their own (nested
      `list`, `hr`, `space`, `table`, `br`) no longer inherit the parent list's
      `text` via rest props (a leaked parent value; `raw` was always overridden by
      the child's own). Every existing custom-renderer/snippet test passes.
- `src/lib/utils/render-metadata.ts` (H3), source-backed passes only:
    - `assignSequentialSourceKeys` skips a node (no key write, no descent) when
      the same object was keyed at the same absolute offset and its stored key
      equals the computed key (both conditions, per the plan).
    - `assignHeadingIds` returns whether a heading was found; subtrees proven
      heading-free are recorded in a `WeakSet` and skipped on later passes, so
      rewinds still visit every subtree that holds a heading. Split into
      `assignHeadingIds` + `assignHeadingIdsBelow` for the complexity limit.
    - Both caches are gated on `source !== undefined`: caller-supplied token
      arrays may be mutated in place (e.g. `$state` proxies).
- `src/routes/test/stream-compare/+page.svelte`: `long-table` scenario — one
  GFM table, 4 columns (row number, bold, code span, link), 148 rows (10 KB),
  32 chars/frame, stays open until the trailing blank line; 314 frames.

## Tests (red → green)

- `src/lib/SvelteMarkdown.issue-328.test.ts` › "open list/table prop churn
  (plan 010, default renderers)": list test red (122 > 6) → green (6); table
  test red (62 > 3) → green (2). Both also assert DOM identity of the first
  item/cell and `innerHTML` equality with a fresh one-shot render.
- `src/lib/utils/render-metadata.test.ts` › "streaming re-walk of a diverged
  open list (plan 010, H3)": key-write test red (601 > 4) → green; heading-free
  descent test red (98 `tokens` reads) → green (0). Guard tests green before and
  after: re-keying when an earlier sibling grew (keys equal a fresh metadata
  instance) and heading ids nested in reused items after a rewind.
- Heading-id parity: `SvelteMarkdown.issue-328.test.ts` (all 33) and Playwright
  `tests/heading-metadata.test.ts` (chromium, 2/2) pass on the B build.

## Paired A/B, median of 5 pairs (repeat 1 / repeat 2)

Delta = A − B (positive = B does less work). ms.

| Scenario      | A total       | B total       | Paired delta (% of A)           | A lib flush   | B lib flush   | A p95       | B p95      | A over-budget (median; per-run) | B over-budget (median; per-run) | Parity A / B |
| ------------- | ------------- | ------------- | ------------------------------- | ------------- | ------------- | ----------- | ---------- | ------------------------------- | ------------------------------- | ------------ |
| `long-list`   | 5,751 / 5,653 | 4,037 / 3,778 | +1,704 (29.6%) / +1,633 (28.9%) | 1,567 / 1,507 | 2,119 / 2,027 | 14.2 / 11.3 | 10.2 / 8.6 | 24 / 4 of 754 (0–28)            | 4 / 1 (0–5)                     | 0 / 0        |
| `long-table`  | 2,373 / 2,310 | 1,665 / 1,619 | +671 (28.3%) / +701 (30.4%)     | 379 / 358     | 427 / 407     | 14.2 / 13.0 | 10.9 / 9.8 | 10 / 4 of 314 (3–12)            | 2 / 0 (0–8)                     | 0 / 0        |
| `prose-mixed` | 2,136 / 2,164 | 2,221 / 2,213 | −84 (−3.9%) / +10 (+0.5%)       | 339 / 336     | 334 / 342     | 4.9 / 4.9   | 5.3 / 5.2  | 0 / 0                           | 0 / 0                           | 0 / 0        |

Per-pair deltas: `long-list` 1,704 · 1,864 · 1,726 · 1,689 · 1,655 / 1,705 ·
1,573 · 1,556 · 2,084 · 1,633; `long-table` 936 · 676 · 662 · 671 · 657 / 1,031 ·
657 · 648 · 736 · 701 (every pair positive). Output hash MATCH and DOM
projection MATCH A vs B on all runs.

`prose-mixed` regression check: repeat 1's −3.9% (per-pair +59, −197, −135, −75,
−84) was not reproduced. Tiebreak with 9 pairs, twice
(`ab-run-{3,4}-prose-mixed-9pairs`): +14.5 ms (+0.6%) and +35.4 ms (+1.6%),
B does less work. Verdict: neutral. That fits the code paths: on prose the H3
walk only touches the small diverged tail block, and `childRest` is computed
only by list/table Parsers.

## Ours (B) vs Streamdown, median of 5 pairs (repeat 1 / repeat 2)

| Scenario     | Ours total    | Streamdown total | Paired delta (theirs − ours) | Ours p95  | Theirs p95  | Ours over-budget (per-run) | Theirs over-budget | Parity | DOM projection |
| ------------ | ------------- | ---------------- | ---------------------------- | --------- | ----------- | -------------------------- | ------------------ | ------ | -------------- |
| `long-list`  | 3,795 / 3,939 | 8,409 / 8,539    | +4,614 / +4,647 (2.2× less)  | 7.7 / 9.2 | 21.6 / 21.2 | 0 / 2 of 754 (0–2)         | 170 / 185          | 0      | MATCH          |
| `long-table` | 1,571 / 1,633 | 3,500 / 3,529    | +1,947 / +1,905 (2.2× less)  | 8.4 / 9.9 | 22.0 / 21.6 | 0 / 0 of 314 (0–3)         | 78 / 78            | 0      | MATCH          |

## Attribution (ours, one traced run each)

| Scenario     | Capture      | Page avg ms/frame | Flush        | JS outside flush | Style/layout | Paint       | GC          | Other       | Untraced    |
| ------------ | ------------ | ----------------- | ------------ | ---------------- | ------------ | ----------- | ----------- | ----------- | ----------- |
| `long-list`  | before (= A) | 8.00              | 2.05 (25.6%) | 5.15 (64.4%)     | 0.32 (4.0%)  | 0.07 (0.9%) | 0.02 (0.3%) | 0.12 (1.5%) | 0.26 (3.2%) |
| `long-list`  | H1/H2 only   | 5.94              | 2.47 (41.5%) | 2.65 (44.6%)     | 0.36 (6.1%)  | 0.02 (0.3%) | 0.01 (0.2%) | 0.12 (2.0%) | 0.31 (5.2%) |
| `long-list`  | after (= B)  | 5.32              | 2.65 (49.7%) | 1.91 (36.0%)     | 0.34 (6.4%)  | 0.01 (0.3%) | 0.02 (0.4%) | 0.12 (2.3%) | 0.27 (5.0%) |
| `long-table` | before (= A) | 8.50              | 1.26 (14.8%) | 5.66 (66.6%)     | 0.98 (11.6%) | 0.10 (1.2%) | 0.09 (1.1%) | 0.14 (1.7%) | 0.26 (3.0%) |
| `long-table` | H1/H2 only   | 6.14              | 1.40 (22.9%) | 3.17 (51.6%)     | 1.09 (17.8%) | 0.03 (0.5%) | 0.06 (1.0%) | 0.13 (2.2%) | 0.25 (4.1%) |
| `long-table` | after (= B)  | 5.77              | 1.42 (24.6%) | 2.79 (48.4%)     | 1.11 (19.2%) | 0.04 (0.7%) | 0.03 (0.4%) | 0.12 (2.1%) | 0.26 (4.5%) |

The "H1/H2 only" rows are an interim capture (B built with the Parser change
but before H3), kept in this README only; logs were not archived.

Identification (A bundle `ayH7RpC4.js`, B bundle `CrvI8adm.js`; runtime
`BCivH4Vn.js` shared): `:67:10926` = Parser `sanitizedRest` derived;
`:67:18041` = generic-branch `{ text, raw, ...parserRest }` destructure;
`:67:13200` = table body `cellRest` destructure; `h` = `assignSourceKeysToChildren`,
`g` = `assignHeadingIds`, `u` = `assignSequentialSourceKeys`, `s` = `setRenderKey`;
`Ks` (A) / `Ys` (B) = `areRecordsSemanticallyEqual`; `get`/`ownKeys`/
`getOwnPropertyDescriptor` at `BCivH4Vn.js:3:*` = Svelte spread-props proxy.

What moved on `long-list` (top-15 self time, before → after):

- Gone from the top-15: spread-props `get` (410 ms, 6.8%) and `ownKeys`
  (324 + 150 ms), the `sanitizedRest` derived (410 ms, 6.8%), the
  generic-branch rest destructure (245 ms, 4.1%), `getOwnPropertyDescriptor`
  (106 ms), and the metadata walkers `h`/`g` (98 + 96 ms).
- JS outside the flush fell from 3,884 ms to 1,443 ms (−63%).

On `long-table`, spread-props `ownKeys`/`get` (146 + 144 ms) and the `cellRest`
destructure (119 ms) left the top-15. JS outside the flush fell from 1,777 ms to
876 ms.

### Unexplained: the library flush measure rose on `long-list`/`long-table`

The flush measure (parse + diff + state write; no code in it changed) rose
~30% on `long-list` (A 1,507–1,567 → B 2,027–2,119) and ~13% on `long-table`, in
every paired run. It stayed flat on `prose-mixed`. It already appeared with the
H1/H2 change alone (interim 1,861 ms), so it is not H3.

A CPU-sample comparison restricted to flush windows
(`flush-window-compare.mjs` → `flush-window-compare.txt`; it reads `/tmp/{before,after}-long-list.{trace.json,cpuprofile}` from the
`*/long-list.rerun-for-flush-compare.log` runs) shows:

- marked's lexer functions ~20% slower (888 → 1,085 ms);
- the comparator's bundle line 363 → 479 ms;
- native `performance.measure` 10 → 207 ms.

It shows no new function in the flush. JIT inlining also differs between the
bundles (`inlineText` is a separate frame in B, folded into `inlineTokens` in A).

Unverified hypothesis: the flush is the first work in each frame. With ~2.6 ms
less work per frame, the CPU is colder (idle/C-state, caches) when it starts.
The net effect is still strongly positive (−29% total work). Not investigated
further; `incremental-parser.ts` and the reuse comparator are out of this
plan's scope.

## Gates

| Gate                                                            | Result                                                                                                                                                                                                                                                          |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Parity 0 (every run, both sides)                                | PASS — 0 mismatches in all 12 benchmark runs (6 A/B, 2 prose tiebreaks, 4 vs Streamdown)                                                                                                                                                                        |
| `long-list` total work below Streamdown's paired median         | PASS — 3,795 / 3,939 vs 8,409 / 8,539 ms                                                                                                                                                                                                                        |
| `long-list` over-budget frames at least halved vs A             | PASS — medians 24 → 4 and 4 → 1                                                                                                                                                                                                                                 |
| `long-list` ZERO over-budget frames (revision's batch contract) | **NOT MET** — B per-run 0–5 of 754 in the A/B runs, 0–2 in the Streamdown runs (medians 4, 1, 0, 2). Peak frames 17.6–20.4 ms. The remaining per-frame cost is dominated by the flush (parse of the whole open list + comparator), out of scope here → Plan 011 |
| `long-table` not behind Streamdown                              | PASS — 2.2× less work; over-budget 0–3 vs 74–82                                                                                                                                                                                                                 |
| `prose-mixed` no regression > 3%                                | PASS on the 9-pair tiebreak (+0.6% / +1.6%); repeat 1 (−3.9%) not reproduced                                                                                                                                                                                    |
| `pnpm check`                                                    | 0 errors (3 pre-existing warnings)                                                                                                                                                                                                                              |
| `pnpm test`                                                     | 160 files / 1,198 tests pass; coverage statements 97.35%, branches 92.91%, functions 98.21%, lines 98.6%                                                                                                                                                        |
| `trunk fmt && trunk check --fix`                                | ✔ No issues                                                                                                                                                                                                                                                     |

## Remaining per-frame budget on `long-list` (B, attribution-after, 5.32 ms/frame avg)

- **Flush, 2.65 ms/frame:** marked `inlineTokens`/`inlineText`/`emStrong`/`link`
  re-lexing the whole open list, `areRecordsSemanticallyEqual` (10.8% self),
  and `isAppendOnlyUpdate` (2.5%).
- **JS outside the flush, 1.91 ms/frame:** Svelte batch/each reconcile (`#g`,
  `#v`, `Ln` mark reactions, ~11%), the 200-item keyed each over a new
  `items` array, and the last item's Parser subtree.
- **Style/layout, 0.34 ms/frame:** includes the bench's forced read.

Over-budget frames are isolated spikes (peak ≤ 20.4 ms), not a steady state.

## Commands

```sh
export PATH=~/.local/share/pnpm/bin:$PATH
git worktree add --detach /tmp/svm-ab-a-010 37e42f2
cp src/routes/test/stream-compare/+page.svelte /tmp/svm-ab-a-010/src/routes/test/stream-compare/
(cd /tmp/svm-ab-a-010 && pnpm install --frozen-lockfile && pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort)
pnpm build && pnpm preview --host 127.0.0.1 --port 4183 --strictPort
# A/B, N in {1,2}, S in {long-list,long-table,prose-mixed}
STREAM_COMPARE_URL_A=http://127.0.0.1:4173/test/stream-compare \
STREAM_COMPARE_URL_B=http://127.0.0.1:4183/test/stream-compare \
STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S \
  node scripts/stream-compare-bench.mjs > ab-run-$N-$S.log
# prose tiebreak: same with STREAM_COMPARE_ITERATIONS=9 → ab-run-{3,4}-prose-mixed-9pairs
# B vs Streamdown, N in {1,2}, S in {long-list,long-table}
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_ITERATIONS=5 \
STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S node scripts/stream-compare-bench.mjs > vs-streamdown-$N-$S.log
# attribution (before: this checkout before library changes; after: B)
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_SCENARIO=$S \
STREAM_ATTRIBUTE_OUT_DIR=attribution-{before,after} node scripts/stream-compare-attribute.mjs > attribution-{before,after}/$S.log
```

Each `.json` is the `=== JSON ===` tail of its `.log`; each log starts and ends
with `uptime`. Raw traces/CPU profiles were written to `/tmp` and not archived.
