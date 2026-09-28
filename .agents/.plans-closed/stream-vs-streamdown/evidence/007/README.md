# Plan 007 evidence: `streamTokens` in `$state.raw` (one-variable A/B)

Captured 2026-09-28 on `perf/stream-bench-flush-timing`.

- **A** = branch tip `9808484` without this plan's change, built in a separate
  git worktree (`git worktree add /tmp/svm-ab-a 9808484`,
  `pnpm install --frozen-lockfile`, `pnpm build`), preview on **port 4174**.
- **B** = this checkout with the change (`let streamTokens = $state.raw<Token[]>([])`),
  preview on **port 4183**.

Port deviation: 4173 was held by a `vite preview` started ~19 h before this
run by another session (PID 836853, same checkout); it was left alone and A was
served on 4174 instead. Builds verified distinct: the library chunk changed
(`DAV6IjOg.js` in A → `RQRQE382.js` in B); the Svelte runtime chunk
`BCivH4Vn.js` is identical in both.

**Decision: KEPT.** B does 18–21% less total work on `prose-mixed` and 53–56% less on
`long-list` in both repeats; no scenario is worse (all four improve).
Parity 0 on A and B everywhere; final output hash and DOM projection match
A vs B on every scenario; zero page errors.

## Method

Plan 006's paired protocol and clamped per-frame work metric, unchanged,
with two-URL A/B support added to the runner (Step 1): when
`STREAM_COMPARE_URL_A` and `STREAM_COMPARE_URL_B` are both set, one Chromium
opens one page per URL and the two sides (`svelte-markdown@A`,
`svelte-markdown@B`) go through the same warmup + alternating-order pairs.
Paired delta = **A − B** per pair (positive = B does less work); parity is
checked on both sides; final DOM projection and output hash are compared
A vs B.

## Environment

- @humanspeak/svelte-markdown 1.9.5; Svelte 5.57.1; Vite 8.3.0; Playwright
  1.63.0; Node v24.21.0; HeadlessChrome 153.0.8010.12, 1280 × 900.
- Ubuntu 26.04.1 LTS; Intel Core i7-6700K @ 4.00 GHz, 8 threads.
- 1-minute load before each measured run (first line of each `ab-run-*.log`):
  A/A controls 1.88 (prose-mixed) / 0.98 (long-list); repeat 1 2.18 (prose-mixed), 1.45 (long-list),
  1.14 (citations), 2.53 (prefix-384kb); repeat 2 3.03, 1.81, 2.81, 2.93.
  Before repeat 2 `prefix-384kb` an unrelated spike (up to 7.5) occurred; the
  runner waited ~12 min until the 1-minute load was ≤ 4 before starting.
  Attribution runs launched at 1.29 / 1.47.

## Commands

```sh
export PATH=~/.local/share/pnpm/bin:$PATH
# A (worktree at 9808484)
git worktree add /tmp/svm-ab-a 9808484
(cd /tmp/svm-ab-a && pnpm install --frozen-lockfile && pnpm build && pnpm preview --host 127.0.0.1 --port 4174 --strictPort)
# B (this checkout)
pnpm build && pnpm preview --host 127.0.0.1 --port 4183 --strictPort
# Step 1 A/A control (B built WITHOUT the change), 2 pairs + 1 warmup
STREAM_COMPARE_URL_A=http://127.0.0.1:4174/test/stream-compare \
STREAM_COMPARE_URL_B=http://127.0.0.1:4183/test/stream-compare \
STREAM_COMPARE_ITERATIONS=2 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=prose-mixed \
  node scripts/stream-compare-bench.mjs     # also long-list
# Step 4, repeat N in {1,2}, scenario S in {prose-mixed,long-list,citations,prefix-384kb}
STREAM_COMPARE_URL_A=... STREAM_COMPARE_URL_B=... STREAM_COMPARE_ITERATIONS=5 \
STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S node scripts/stream-compare-bench.mjs
  # > ab-run-N-S.log (+ .json = the === JSON === tail)
# Attribution on B
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_SCENARIO=$S \
STREAM_ATTRIBUTE_OUT_DIR=.agents/.plans/stream-vs-streamdown/evidence/007/attribution \
  node scripts/stream-compare-attribute.mjs > attribution/$S.log
```

## Step 1: A/A control (both sides pre-change)

| Scenario      | A total | B total | Paired delta (median of 2) | Per pair      | Parity A / B |
| ------------- | ------- | ------- | -------------------------- | ------------- | ------------ |
| `prose-mixed` | 2,832   | 2,825   | +7.5 ms (+0.26%)           | −94.1, +109.0 | 0 / 0        |
| `long-list`   | 13,426  | 13,405  | +21.3 ms (+0.16%)          | −22.5, +65.0  | 0 / 0        |

Well within ±10%; output hash and DOM projection MATCH.

## Step 4: paired A/B, median of 5 pairs (repeat 1 / repeat 2)

Total work, library flush and p95 in ms; delta = A − B.

| Scenario       | A total         | B total       | Paired delta (% of A)           | A lib flush   | B lib flush   | A p95       | B p95       | A over-budget | B over-budget | Parity A / B |
| -------------- | --------------- | ------------- | ------------------------------- | ------------- | ------------- | ----------- | ----------- | ------------- | ------------- | ------------ |
| `prose-mixed`  | 2,832 / 2,910   | 2,310 / 2,325 | +594 (21.0%) / +515 (17.7%)     | 460 / 456     | 332 / 320     | 7.1 / 7.0   | 4.9 / 5.0   | 0 / 0         | 0 / 0         | 0 / 0        |
| `long-list`    | 12,697 / 13,781 | 5,854 / 6,046 | +6,769 (53.3%) / +7,728 (56.1%) | 4,041 / 4,363 | 1,559 / 1,620 | 30.5 / 32.1 | 11.9 / 14.5 | 367 / 398     | 3 / 19        | 0 / 0        |
| `citations`    | 4,332 / 4,338   | 2,727 / 2,878 | +1,627 (37.5%) / +1,301 (30.0%) | 563 / 547     | 464 / 469     | 40.5 / 38.4 | 20.8 / 20.5 | 46 / 46       | 46 / 46       | 0 / 0        |
| `prefix-384kb` | 4,615 / 4,483   | 2,130 / 2,012 | +2,351 (50.9%) / +2,304 (51.4%) | 611 / 614     | 189 / 202     | 87.5 / 77.7 | 39.9 / 44.0 | 67 / 67       | 67 / 67       | 0 / 0        |

Per-pair deltas (ms), every pair positive:

- `prose-mixed`: 469, 1,098, 594, 195, 882 / 515, 434, 422, 560, 610
- `long-list`: 7,275, 6,769, 6,541, 6,718, 6,884 / 6,998, 8,014, 7,894, 3,967, 7,728
- `citations`: 1,261, 1,304, 1,705, 1,685, 1,627 / 1,301, 1,245, 1,629, 1,847, 942
- `prefix-384kb`: 2,240, 2,592, 2,080, 2,363, 2,351 / 2,278, 2,746, 1,993, 2,629, 2,304

Parity checks per side per repeat: 155 on the 24 KB scenarios, 15 on
`prefix-384kb`; 0 mismatches. Output hash MATCH and DOM projection MATCH A vs
B on all scenarios, both repeats. Zero page errors.

Against the plan's expected numbers: library flush on `prose-mixed` fell
~28% (456–460 → 320–332; the plan's ≤ 800 target was set against the
pre-clamp 1,254–1,428 figure and is already met by A on this machine); on
`long-list` it fell ~62% (4,041–4,363 → 1,559–1,620, target ≤ 2,500 met).
Frames over budget on `long-list` dropped from ~370–400 to 3–19 of 754.

## Attribution (ours, one traced run each; 006 baseline → 007 B)

Absolute ms are from different captures (machine drift demonstrated in
006); compare shares and the A/B deltas above, not absolute ms.

| Scenario      | Capture | Page avg ms/frame | Flush        | JS outside flush | Style/layout | Paint       | GC          | Other       | Untraced     |
| ------------- | ------- | ----------------- | ------------ | ---------------- | ------------ | ----------- | ----------- | ----------- | ------------ |
| `prose-mixed` | 006     | 3.81              | 0.54 (14.1%) | 2.13 (55.8%)     | 0.63 (16.6%) | 0.01 (0.3%) | 0.02 (0.6%) | 0.14 (3.7%) | 0.34 (8.9%)  |
| `prose-mixed` | 007 B   | 2.78              | 0.33 (12.0%) | 1.33 (47.9%)     | 0.61 (21.8%) | 0.01 (0.5%) | 0.03 (0.9%) | 0.14 (5.1%) | 0.33 (11.7%) |
| `long-list`   | 006     | 17.70             | 5.56 (31.4%) | 10.79 (61.0%)    | 0.27 (1.6%)  | 0.61 (3.5%) | 0.14 (0.8%) | 0.21 (1.2%) | 0.11 (0.6%)  |
| `long-list`   | 007 B   | 8.16              | 2.08 (25.5%) | 5.33 (65.3%)     | 0.31 (3.7%)  | 0.06 (0.7%) | 0.02 (0.2%) | 0.12 (1.4%) | 0.25 (3.1%)  |

Traced coverage: 88.2% (`prose-mixed`), 96.9% (`long-list`). Page totals of
the traced runs: 2,124 ms and 6,150 ms (consistent with the B medians).

Top-5 self-time functions:

| Scenario      | 006 (before)                                                                                                                           | 007 B (after)                                                                                                                                    |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `prose-mixed` | getBoundingClientRect 15.5% · deep-state proxy `get` 7.8% · each update 6.0% · isAppendOnlyUpdate 4.4% · each reconcile 3.8%           | getBoundingClientRect 20.0% · isAppendOnlyUpdate 5.4% · each update 5.0% · `before` (native DOM insert) 4.2% · batch traversal `#v` 2.9%         |
| `long-list`   | areRecordsSemanticallyEqual 14.9% · deep-state proxy `get` 12.0% · signal get 5.3% · assignHeadingIds 5.2% · spread-props ownKeys 4.7% | marked `inlineTokens` 7.3% · Parser `href` derived 6.6% · spread-props `get` 6.3% · areRecordsSemanticallyEqual 5.9% · spread-props ownKeys 5.4% |

Identification in the B bundle (`RQRQE382.js` = library; `BCivH4Vn.js`
runtime unchanged, so 006's runtime legend applies): `Ks` `:67:82404` =
`areRecordsSemanticallyEqual` (006's `qs` `:67:82403`); `(anonymous)`
`:67:10921` = Parser.svelte `href`/`attributes` derived (006 `:67:10933`);
`(anonymous)` `:67:18035` = list-item `{ text, raw, ...parserRest }`
destructuring (006 `:67:18045`); `h` `:67:7602` = `assignSourceKeysToChildren`;
`c` `:67:6634` = render-metadata WeakMap lookup; `get`/`ownKeys`/
`getOwnPropertyDescriptor` at `BCivH4Vn.js:3:*` = Svelte spread-props proxy;
`#g` `:1:10688` = batch root collection; `Ln` `:1:16355` = mark reactions.

What moved: the deep `$state` proxy traps (`get` `BCivH4Vn.js:1:17336`,
`ownKeys` `:1:18468`, `has`, `getOwnPropertyDescriptor` `:1:17563`,
`proxy()` `:1:16728`) are gone from the top 15 of both scenarios (they were #2
at 7.8% and 12.0%). `areRecordsSemanticallyEqual` on `long-list` fell from
1,990 ms (14.9%) to 367 ms (5.9%) — the comparator's reads no longer go
through proxy traps. `assignHeadingIds` is no longer top-15 on `long-list`.

What dominates now (input for 010/011): **JS outside the flush** is still the
largest bucket — 47.9% on `prose-mixed`, 65.3% on `long-list`. On `long-list`
it is the Parser render side (href derived, list-item rest destructuring,
Svelte spread-props proxy `get`/`ownKeys`/`getOwnPropertyDescriptor` ≈ 14%
combined) plus marked's `inlineTokens` inside the flush. On `prose-mixed` the
forced layout (bench-charged style/layout, 21.8%) and `isAppendOnlyUpdate`
(5.4%) lead.

## Files

- `aa-control-{prose-mixed,long-list}.{log,json}` — Step 1 A/A controls.
- `ab-run-{1,2}-{prose-mixed,long-list,citations,prefix-384kb}.{log,json}` —
  paired A/B runs (log starts/ends with the load average).
- `attribution/{prose-mixed,long-list}.{log,attribution.json}` — B
  attribution. Raw traces/CPU profiles were written to `/tmp` and not archived.
