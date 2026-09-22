# Streamdown 4.2.0 production comparison evidence

Captured on 2026-09-22. Source snapshot: `a01c72b`. The only uncommitted tracked
change at capture was the preserved nightly `.competitive-intel/state.json` diff
(34 additions/34 deletions), which does not affect this workload. Benchmark script
and route are unchanged from original baseline `1767041`.

## Environment and method

- Package: @humanspeak/svelte-markdown 1.9.1; svelte-streamdown exactly 4.2.0.
- Svelte 5.56.8, Vite 8.2.1, Playwright 1.62.1.
- Node v26.8.2, pnpm 11.9.0 (host versions; CI Node 22/24 was not run locally).
- macOS 26.6.2 (25G83); Intel Core i9-10910 CPU at 3.60 GHz.
- Observed AC power; pmset sleep 0, no lowpowermode entry exposed.
- Headless production Chromium 151.0.7922.34, 1280 × 900 viewport.
  Browser UA is retained in each JSON metadata block.
- Suite 1 finished 2026-09-22T10:52:08.984Z; suite 2 finished 2026-09-22T10:53:59.688Z.
- Sequential suites on the same workstation; no guard builds/tests concurrently
  with timing. Normal workstation activity is not a controlled laboratory.
- Each suite: four scenarios, each renderer has 1 warmup + 5 measured iterations:
  40 measured runs per suite, 80 total. Renderer order is ours then Streamdown.
- Append-only cumulative **prop** comparison. Animation, controls and syntax
  highlighting are off; no optional Code component is supplied. This measures
  complete reactive updates/settling, not pure parsing or imperative ingestion.
- Targets are minimum corpus sizes. Actual ASCII source lengths are shown below;
  both renderers receive identical source per scenario.

Commands (from root; evidence path is shown at capture before batch retirement):

```sh
pnpm build
pnpm preview --host 127.0.0.1 --port 4173 --strictPort
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > .agents/.plans/competitive-comparison-refresh/evidence/run-1.log 2>&1
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > .agents/.plans/competitive-comparison-refresh/evidence/run-2.log 2>&1
```

Both commands exited 0. Each JSON was extracted by splitting its complete raw log
on `=== JSON ===` and parsing the remainder. Raw per-iteration data is retained.
The logs and JSON are the evidence; numbers were not selected from extra reruns.

## Results

All time columns are milliseconds; update rate is chunks per second. Each numeric
summary other than DOM count is the median of five runs. DOM is descendant
**elements**, taken from the last run, not all DOM nodes or memory use.

| Suite | Scenario            | Source bytes | Total ours / theirs | p95 ours / theirs | Updates/s ours / theirs | Elements ours / theirs | Time ratio |
| ----- | ------------------- | ------------ | ------------------- | ----------------- | ----------------------- | ---------------------- | ---------- |
| 1     | 10kb-tiny-chunks    | 10059        | 66.7 / 335.8        | 0.1 / 0.9         | 9430.285 / 1873.139     | 571 / 705              | 5.03448    |
| 1     | 50kb-small-chunks   | 50153        | 304.6 / 1459        | 0.1 / 4.1         | 2573.867 / 537.354      | 2821 / 3480            | 4.78989    |
| 1     | 200kb-medium-chunks | 200237       | 1043.4 / 9485.4     | 0.1 / 20.5        | 750.431 / 82.548        | 11071 / 13655          | 9.09086    |
| 1     | 50kb-frame-paced    | 50153        | 1624.8 / 1621.5     | 17.6 / 17.6       | 60.315 / 60.438         | 2821 / 3480            | 0.99797    |
| 2     | 10kb-tiny-chunks    | 10059        | 72.7 / 324.8        | 0.1 / 0.8         | 8651.994 / 1936.576     | 571 / 705              | 4.46768    |
| 2     | 50kb-small-chunks   | 50153        | 323.3 / 1826.2      | 0.1 / 5.1         | 2424.992 / 429.307      | 2821 / 3480            | 5.64862    |
| 2     | 200kb-medium-chunks | 200237       | 1198.5 / 8546.7     | 0.1 / 19.5        | 653.317 / 91.614        | 11071 / 13655          | 7.13116    |
| 2     | 50kb-frame-paced    | 50153        | 1625.9 / 1616.4     | 17.4 / 17.5       | 60.274 / 60.629         | 2821 / 3480            | 0.99416    |

Time ratio = theirs.totalMsMedian / ours.totalMsMedian; >1 favors ours.
Across the two suites, the burst ratios are 4.47–5.03 (10 KB target), 4.79–5.65
(50 KB target), and 7.13–9.09 (200 KB target), rounded to two decimals. Report these
per workload because timings vary materially between suites. Frame-paced ratios
are 0.9980 and 0.9942: a near tie with Streamdown slightly lower elapsed medians,
and approximately 60 updates/s for both (ours 60.274–60.315; theirs 60.438–60.629).

DOM reduction = 100 × (1 − 2821 / 3480) = 18.9367816092%, rounded to about 19%.
**The 2,821 / 3,480 counts and 19% reduction coincide with the historical numbers
but are independently remeasured against 4.2.0.** Counts are stable in all five
runs per renderer, in both 50 KB scenarios and both suites (20 runs per renderer).
The actual 50 KB corpus is 50,153 bytes.

## Validation and semantic inspection

Independent parsing confirmed the exact four scenario IDs, both renderer IDs,
five measured runs per result, one warmup, positive finite total/p95/throughput,
positive source/output lengths and element counts, and equal source sizes. Both
logs contain zero page errors and no output-length mismatches; normalized text
length ratios are within the unchanged 5% guard. Per-run DOM counts are stable.

A separate production-browser spot-check ran the unchanged 50 KB small-chunks
scenario once per renderer, excluded from timing claims. Full captured values
and first markup samples are in [semantic-output.json](semantic-output.json).
Both renderers have 1 h1, 94 h2, 188 paragraphs, 94 links, 94 nested lists, 94
blockquotes, 94 fenced code blocks and 94 tables with thead/tbody. All link
destinations agree. Heading, paragraph, link, blockquote and code text arrays
agree after whitespace collapse. Nested-list and table text differ only in
inter-element whitespace; removing whitespace yields identical arrays for all
94 items, and inspected markup preserves the same list and table semantics.

Zero output buttons, zero highlight token/Shiki elements, and zero page errors
were observed. Streamdown's fallback code renderer adds a language label and
plain line wrappers (188 code spans); these are not syntax-highlight tokens.
These markup differences explain why whole-output hashes/text lengths need not
match. The check establishes the planned representative semantic parity, not
byte-identical DOM or a comprehensive renderer conformance test.
