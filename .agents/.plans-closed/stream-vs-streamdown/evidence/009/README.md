# Plan 009 evidence: reference definitions — semantic tree reuse (Part A) + targeted seeded re-lex (Part B)

Captured 2026-09-28 on `perf/stream-bench-flush-timing` (uncommitted working
tree on top of `b242f2b`).

**Result: PARTIAL.** Parity 0 everywhere; the definition spikes are gone
(over-budget frames on `citations` 46 → 1–2, p95 ≈ 20 → 5–6.5 ms, peak
≈ 42–46 → 17–23 ms); total work on `citations` fell 24–30% vs the pre-change
tip in all four paired A/B repeats. Ours is still **above** Streamdown on
`citations` (2,005–2,076 vs 1,544–1,688 ms) and over-budget frames are 1–2,
not 0. Dominant bucket: JS outside the flush (46%); top self-time function
in our code is `isAppendOnlyUpdate` (8.8%, full-length `startsWith` per
update — not in this plan's scope).

## Builds and method

- **A** = pre-change tip `b242f2b`, `git worktree add --detach /tmp/svm-ab-a-009 b242f2b`,
  `pnpm install --frozen-lockfile && pnpm build`, preview on **4173**.
- **B** = this checkout, preview on **4183**; rebuilt between Part A and Part B
  (library chunk `RQRQE382.js` in A → `DOU8feEr.js` Part A → `ayH7RpC4.js` Part B;
  runtime chunk `BCivH4Vn.js` identical).
- Runner and metric unchanged from Plans 006/007: A/B = `STREAM_COMPARE_URL_A/_B`,
  5 iterations + 1 warmup, delta = A − B (positive = B less work); vs Streamdown =
  `STREAM_COMPARE_URL` on B, delta = theirs − ours. Every run waited for a
  1-minute load ≤ 4 (first/last line of each `.log`).
- Attribution: `scripts/stream-compare-attribute.mjs` on A (`attribution-A/`),
  Part A B (`attribution-partA/`) and Part B B (`attribution-partB/`).

## Paired A/B (A = `b242f2b`), median of 5 pairs

| Build  | Scenario      | Repeat | Load | A total | B total | Delta (% of A) | Per-pair deltas             | A / B peak  | A / B p95  | A / B over-budget | A / B lib flush | Parity A/B | DOM/hash |
| ------ | ------------- | ------ | ---- | ------- | ------- | -------------- | --------------------------- | ----------- | ---------- | ----------------- | --------------- | ---------- | -------- |
| Part A | `citations`   | 1      | 2.00 | 2,705   | 1,855   | +823 (30.4%)   | 776, 823, 863, 738, 934     | 42.1 / 19.7 | 19.6 / 6.5 | 45 / 1            | 433 / 476       | 0 / 0      | match    |
| Part A | `citations`   | 2      | 1.45 | 2,805   | 2,077   | +681 (24.3%)   | 809, 681, 602, 679, 805     | 45.2 / 22.6 | 19.8 / 6.3 | 46 / 2            | 464 / 512       | 0 / 0      | match    |
| Part A | `prose-mixed` | 1      | 1.58 | 2,209   | 2,129   | +80 (3.6%)     | 409, 91, −33, 43, 80        | 9.7 / 12.5  | 5.1 / 4.8  | 0 / 0             | 306 / 337       | 0 / 0      | match    |
| Part A | `prose-mixed` | 2      | 1.65 | 2,107   | 2,220   | −67 (−3.2%)    | 72, −67, 17, −140, −101     | 10.8 / 11.6 | 5.0 / 5.3  | 0 / 0             | 295 / 343       | 0 / 0      | match    |
| Part B | `citations`   | 1      | 2.80 | 2,885   | 1,972   | +828 (28.7%)   | 1,085, 787, 1,054, 828, 739 | 41.4 / 18.9 | 19.8 / 5.3 | 46 / 1            | 454 / 404       | 0 / 0      | match    |
| Part B | `citations`   | 2      | 1.07 | 2,733   | 2,066   | +706 (25.8%)   | 897, 654, 762, 706, 623     | 46.4 / 17.2 | 19.5 / 5.4 | 46 / 2            | 455 / 416       | 0 / 0      | match    |
| Part B | `prose-mixed` | 1      | 1.42 | 2,164   | 2,120   | +64 (3.0%)     | 241, −34, 64, −155, 140     | 11.5 / 11.9 | 5.0 / 5.0  | 0 / 0             | 309 / 344       | 0 / 0      | match    |
| Part B | `prose-mixed` | 2      | 1.19 | 2,197   | 2,132   | +88 (4.0%)     | 189, −77, 88, −55, 243      | 9.7 / 9.3   | 5.1 / 5.1  | 0 / 0             | 318 / 333       | 0 / 0      | match    |

155 parity checks per side per run, 0 mismatches; final DOM projection and
output hash match A vs B in every run. `prose-mixed` total-work deltas are
mixed-sign per pair (noise band, cf. 007's A/A control); its lib-flush median
is 5–16% higher on B in all four runs — small absolute (+15–48 ms over 765
frames), not investigated further (the `prefix` path gained only a
`reuseMode` ternary and a `findDivergence` extraction returning an object).

## Ours (B) vs Streamdown, `citations`, median of 5 pairs

| Build  | Repeat | Load | Ours total | Theirs total | Delta (theirs − ours) | Ours peak | Ours p95 | Ours over-budget | Theirs over-budget | Ours lib flush | Parity |
| ------ | ------ | ---- | ---------- | ------------ | --------------------- | --------- | -------- | ---------------- | ------------------ | -------------- | ------ |
| Part A | 1      | 1.27 | 2,057      | 1,609        | −505                  | 22.3      | 6.1      | 2                | 0                  | 527            | 0      |
| Part A | 2      | 0.95 | 2,041      | 1,532        | −468                  | 21.2      | 6.2      | 2                | 0                  | 514            | 0      |
| Part B | 1      | 1.66 | 2,076      | 1,688        | −428                  | 19.3      | 5.3      | 2                | 0                  | 427            | 0      |
| Part B | 2      | 1.09 | 2,005      | 1,544        | −444                  | 17.5      | 5.0      | 1                | 0                  | 436            | 0      |

Before this plan (007 B / 006 clamped): ours 2,727–2,878 vs ~1,880, 46 over budget, p95 ≈ 20.5.

## Attribution, `citations` (one traced run each)

| Capture     | Page avg ms/frame | p95  | Flush         | JS outside flush | Style/layout  | Paint | GC    | Other | Untraced |
| ----------- | ----------------- | ---- | ------------- | ---------------- | ------------- | ----- | ----- | ----- | -------- |
| A (b242f2b) | 3.876             | 20.6 | 0.564 (14.6%) | 2.165 (55.9%)    | 0.435 (11.2%) | 0.086 | 0.096 | 0.191 | 0.339    |
| Part A B    | 3.014             | 6.9  | 0.617 (20.5%) | 1.337 (44.4%)    | 0.452 (15.0%) | 0.025 | 0.035 | 0.177 | 0.369    |
| Part B B    | 2.999             | 5.6  | 0.565 (18.9%) | 1.388 (46.3%)    | 0.452 (15.1%) | 0.022 | 0.030 | 0.179 | 0.363    |

Part A removed ~0.83 ms/frame of JS outside the flush (whole-tree re-render
after each definition) at +0.05 ms/frame flush (whole-tree semantic compare).
Part B took the flush back down (targeted re-lex instead of full re-lex) but
total work is flat vs Part A within noise. Top self time on Part B B:
`getBoundingClientRect` 13.6% (bench-charged forced layout), `isAppendOnlyUpdate`
8.8% (`ayH7RpC4.js:71:73`), Svelte runtime 3.1%, `qs` (= `areRecordsSemanticallyEqual`) 1.7%.

## Files

- `ab-A-run-{1,2}-{citations,prose-mixed}.{log,json}` — Part A paired A/B.
- `vs-A-run-{1,2}-citations.{log,json}` — Part A ours vs Streamdown.
- `ab-B-run-{1,2}-{citations,prose-mixed}.{log,json}` — Part B paired A/B.
- `vs-B-run-{1,2}-citations.{log,json}` — Part B ours vs Streamdown.
- `attribution-{A,partA,partB}/citations.{log,attribution.json}`. Raw traces
  went to `/tmp` and were not archived.
