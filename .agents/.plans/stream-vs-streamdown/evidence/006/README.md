# Plan 006 evidence: paired baseline, semantic parity, browser attribution

Captured 2026-09-28 on branch `perf/stream-bench-flush-timing` at `587cad7`
(working tree: this plan's harness changes on top of snapshot `e2f05da`, after
the library fixes from plans 008 and 013). Package version 1.9.5. These are the
first paired numbers; every later plan in the batch compares against them.

## Method

The per-frame work metric is unchanged from
`.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`
(`workMs = syncMs + frameWorkMs`, forced `getBoundingClientRect()` at the end of
each frame window). New in this plan:

- **Paired runs** (`STREAM_COMPARE_MODE=paired`, the default): per scenario, one
  warmup of each renderer, then each iteration runs both renderers back to back,
  alternating which goes first (`ours > theirs`, `theirs > ours`, ...).
  `pairedDeltaMsMedian` = median over iterations of (theirs − ours)
  `totalWorkMs`; positive means ours does less work.
- **Semantic parity** (ours only): every 25 frames and on the final frame, the
  streamed token tree (from the `parsed` callback) is compared key by key with
  a fresh `parseAndCacheTokens` parse of the same cumulative source. The check
  runs outside the measured windows. `parityMismatches` must be 0.
- **DOM projection** (both renderers, final frame): ordered headings
  `{tag,text}`, links `{href,text}`, images `{src,alt}`, table shapes
  `{rows,cols}`, and `<pre>` texts, compared across renderers.
- **New scenarios**: `prose-mixed-writechunk` (imperative `writeChunk()` input;
  ours only, the runner skips Streamdown and says so), `prefix-24kb` /
  `prefix-96kb` / `prefix-384kb` (a closed prefix of short headings and
  paragraphs mounted unmeasured, then the same ~2 KB mixed-prose tail streamed
  at 32 chars/frame), and `large-closed-block` (a 20 KB closed nested list as
  the prefix, same tail).
- **Attribution** (`scripts/stream-compare-attribute.mjs`): one traced
  `svelte-markdown` run per scenario (after one untraced warmup; parity off so
  the CPU profile is not polluted by the reference parse), CDP `Tracing` with
  `devtools.timeline,disabled-by-default-devtools.timeline,v8.execute,blink.user_timing`
  plus a `Profiler` CPU profile (250 µs sampling). The page emits
  `stream-bench:sync` / `stream-bench:frame-work` User Timing measures for
  exactly the windows it charges (`traceWindows: true`); main-thread self time
  inside those windows is bucketed (see the attribution section).

| Scenario                 | Shape                                                  | Prefix bytes | Source bytes | Frames |
| ------------------------ | ------------------------------------------------------ | ------------ | ------------ | ------ |
| `prose-mixed`            | headings, paragraphs, lists, blockquote, code, table   | 0            | 24,477       | 765    |
| `prose-mixed-4x`         | same, 4 updates/frame                                  | 0            | 24,477       | 192    |
| `long-list`              | one bullet list, open until the closing paragraph      | 0            | 24,097       | 754    |
| `long-code-fence`        | one fenced code block, open until the closing fence    | 0            | 24,094       | 753    |
| `citations`              | prose with `[n]` markers + trailing `[n]: url` block   | 0            | 24,068       | 753    |
| `prose-mixed-writechunk` | `prose-mixed` via `writeChunk(delta)` (ours only)      | 0            | 24,477       | 765    |
| `prefix-24kb`            | closed headings/paragraphs prefix, ~2 KB streamed tail | 24,006       | 26,122       | 67     |
| `prefix-96kb`            | same, larger prefix                                    | 96,078       | 98,194       | 67     |
| `prefix-384kb`           | same, larger prefix                                    | 384,030      | 386,146      | 67     |
| `large-closed-block`     | 20 KB closed nested list prefix, ~2 KB streamed tail   | 20,081       | 22,197       | 67     |

## Environment

- @humanspeak/svelte-markdown 1.9.5 (this branch); svelte-streamdown 4.2.0.
- Svelte 5.57.1, Vite 8.3.0, Playwright 1.63.0, Node v24.21.0.
- HeadlessChrome 153.0.8010.12 via Playwright, 1280 × 900 viewport.
- Ubuntu 26.04.1 LTS; Intel Core i7-6700K @ 4.00 GHz, 8 threads.
- Production preview on port 4183 (4173 was held by another process).
- Load average (1 min) before suite 1: 4.26; after suite 1: 5.36; before
  suite 2: 4.84; after suite 2: **8.81** (other sessions started Trunk/ESLint
  runs near the end of suite 2 — suite 2's last scenarios, the prefix ones,
  are visibly noisier; prefer suite 1 for those). Attribution runs were
  started only when the 1-minute load was below 2.3.
- Zero page errors in every run.

Commands:

```sh
export PATH=~/.local/share/pnpm/bin:$PATH
pnpm build
pnpm preview --host 127.0.0.1 --port 4183 --strictPort
# Step 2 re-verification (after plans 008 + 013)
node .agents/.plans/stream-vs-streamdown/evidence/006/stop-parity-repro.mjs       # > rerun-parity-repro.log
node .agents/.plans/stream-vs-streamdown/evidence/006/stop-list-split-repro.mjs   # > rerun-list-split-repro.log
for s in prose-mixed prose-mixed-4x long-list long-code-fence citations; do
  STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_ITERATIONS=1 \
  STREAM_COMPARE_WARMUPS=0 STREAM_COMPARE_SCENARIO=$s node scripts/stream-compare-bench.mjs > step2-parity-$s.log
done
# Step 3: same, for the five new scenarios > step3-<scenario>.log
# Step 5: paired suites (run twice)
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_ITERATIONS=5 \
  STREAM_COMPARE_WARMUPS=1 node scripts/stream-compare-bench.mjs   # > paired-run-N.log + paired-run-N.json
# Step 4/5: attribution
for s in prose-mixed long-list long-code-fence citations prefix-384kb; do
  STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_SCENARIO=$s \
  STREAM_ATTRIBUTE_OUT_DIR=.agents/.plans/stream-vs-streamdown/evidence/006/attribution \
  node scripts/stream-compare-attribute.mjs > attribution/$s.log
done
```

(`node scripts/stream-compare-bench.mjs` is what `pnpm perf:stream-compare`
runs.) `paired-run-N.json` is the `=== JSON ===` tail of the run's output;
`paired-run-N.log` is everything before it. Suite 1 finished
2026-09-28T10:47:10Z, suite 2 2026-09-28T11:04:04Z. Raw traces and CPU
profiles were written to `/tmp/<scenario>.trace.json` / `.cpuprofile` and are
not archived (≈ 10–60 MB each); the per-scenario summaries are in
`attribution/<scenario>.attribution.json`.

## Correctness

### Parity (ours vs a fresh parse) — 0 mismatches everywhere

The first pass of this plan stopped here (see `stop-*.log`): a stale link
`href` while a definition URL streamed (`citations`), and a nested list item
split into its own top-level list at a chunk boundary (`prose-mixed`). Both
were fixed by plans 008 and 013. Re-verification against a fresh `pnpm build`:

- `rerun-parity-repro.log`: `prose-mixed: 0/31 mismatched`,
  `citations: 0/31 mismatched` (was 31/31 and 2/31).
- `rerun-list-split-repro.log`: no divergence at any 32-byte step (was a
  divergence at 384 bytes). The two repro scripts now take `REPRO_ROOT`
  (default: this checkout) instead of the deleted worktree path.
- Browser, one iteration each (`step2-parity-*.log`, `step3-*.log`) and both
  paired suites (5 iterations): `parityMismatches === 0` on every scenario,
  every run. Checks per suite: 155 on the 24 KB scenarios, 40 on
  `prose-mixed-4x`, 15 on the prefix scenarios.

The parity comparator was not changed or loosened. The Step 2 corruption
check (compare against a parse of `source + 'x'` → mismatches > 0) was done in
the first pass and not repeated here.

### DOM projection (ours vs Streamdown, final frame)

MATCH on every scenario except two, both documented rather than silenced:

- `long-code-fence` — `codeBlocks[0]` text differs only in line separators:
  Streamdown renders each code line in its own wrapper without newline text
  nodes, so the normalized `textContent` joins lines (`// step 0export ...`)
  where ours keeps a space (`// step 0 export ...`). Same code, different
  markup.
- `citations` — `links.length: ours 258 · theirs 0`. Streamdown renders none
  of the `[n]` reference-style citations as links (its text is ~2.5% longer,
  consistent with literal `[n]` markers). The most likely cause is that
  Streamdown parses each block independently, so the trailing definitions
  block does not resolve references in earlier paragraphs. **This makes the
  `citations` comparison unequal**: Streamdown does not do the work of
  rendering 258 links. Not investigated further in this plan.

## Results — paired, median of 5 iterations (suite 1 / suite 2)

Total main-thread work over the whole stream, ms; paired delta = theirs − ours
(positive = ours does less work):

| Scenario                 | Ours total      | Theirs total    | Paired delta    | Ours avg/frame | Ours p95    | Ours frames > 16.7 ms | Theirs frames > 16.7 ms | Ours lib flush |
| ------------------------ | --------------- | --------------- | --------------- | -------------- | ----------- | --------------------- | ----------------------- | -------------- |
| `prose-mixed`            | 1,901 / 2,247   | 1,980 / 2,180   | −122 / −75      | 2.49 / 2.94    | 4.5 / 5.8   | 0 / 0 of 765          | 0 / 0                   | 311 / 380      |
| `prose-mixed-4x`         | 675 / 694       | 1,167 / 1,335   | +505 / +633     | 3.51 / 3.61    | 5.4 / 5.4   | 0 / 0 of 192          | 0 / 3                   | 78 / 89        |
| `long-list`              | 15,637 / 16,992 | 10,427 / 11,085 | −5,292 / −5,674 | 20.74 / 22.54  | 41.3 / 44.1 | 401 / 434 of 754      | 241 / 261               | 4,067 / 4,340  |
| `long-code-fence`        | 1,983 / 1,937   | 1,068 / 985     | −914 / −962     | 2.63 / 2.57    | 5.0 / 4.5   | 0 / 0 of 753          | 0 / 0                   | 161 / 150      |
| `citations`              | 3,835 / 4,457   | 1,115 / 1,125   | −2,701 / −3,180 | 5.09 / 5.92    | 45.2 / 51.6 | 46 / 46 of 753        | 0 / 0                   | 413 / 432      |
| `prose-mixed-writechunk` | 2,008 / 2,021   | — (skipped)     | —               | 2.62 / 2.64    | 4.6 / 4.8   | 0 / 0 of 765          | —                       | 342 / 359      |
| `prefix-24kb`            | 261 / 404       | 181 / 270       | −88 / −148      | 3.89 / 6.03    | 5.1 / 9.3   | 1 / 1 of 67           | 0 / 0                   | 47 / 61        |
| `prefix-96kb`            | 862 / 1,700     | 487 / 710       | −375 / −1,037   | 12.86 / 25.37  | 20.0 / 33.8 | 6 / 61 of 67          | 0 / 7                   | 133 / 174      |
| `prefix-384kb`           | 4,959 / 5,895   | 2,791 / 2,745   | −1,874 / −2,792 | 74.01 / 87.98  | 82.3 / 107  | 67 / 67 of 67         | 67 / 67                 | 617 / 669      |
| `large-closed-block`     | 119 / 213       | 203 / 301       | +88 / +115      | 1.77 / 3.18    | 2.2 / 7.0   | 1 / 2 of 67           | 1 / 2                   | 24 / 31        |

Per-pair deltas are in `paired-run-N.json` (`pairedDeltasMs`). The paired
delta sign agrees across both suites and all five pairs for every scenario
except `prose-mixed`, where individual pairs straddle zero (suite 1:
−122, +90, +557, −274, −213) — treat `prose-mixed` as parity-ish, not a win
for either side.

Observations against the batch acceptance contract:

- Ours wins only `prose-mixed-4x` and `large-closed-block`. Streamdown does
  less work on `long-list` (1.5×), `long-code-fence` (1.9×), `citations`
  (3.4×, but see the DOM projection caveat), and every prefix scenario.
- **Prefix work is O(N)**: ours `avgWorkMs` is 3.9 → 12.9 → 74.0 ms for a
  24 → 96 → 384 KB closed prefix (suite 1), a 19× growth for the same 2 KB
  tail; the contract requires `prefix-384kb` within 15% of `prefix-24kb`.
  Streamdown also grows (2.7 → 7.3 → 41.7 ms).
- Frames over budget remain on `long-list`, `citations`, and all prefix
  scenarios.

### Harness caveat: overlapping windows are counted twice

The attribution traces show that when a frame overruns, the next frame's rAF
timestamp (the start of its `frame-work` window) can precede the end of the
previous measured window, so `totalWorkMs` (a plain sum of window durations)
counts the overlap twice. Measured: `long-list` 3,250 ms of 17,411 ms
(18.7%), `citations` 371 ms (8.4%), `prefix-384kb` 101 ms (2.0%),
`prose-mixed` 3 ms, `long-code-fence` 0. It applies to both renderers
(Streamdown overruns less, so it inflates ours more on `long-list`). The page
metric was NOT changed in this plan, to keep the baseline definition fixed;
the attribution script reports the raw sum, the union, and the double-counted
amount. A reviewer decision is needed on whether to clamp the frame window
start to the previous window's end in a later plan (that would change every
baseline number above for overrunning scenarios).

## Attribution baseline (ours, one traced run each)

Buckets are main-thread self time inside the union of the page's measured
windows, in ms per frame (share of the union):

- **flush** — JS inside the `svelte-markdown:stream-flush` measure (parse +
  diff + state write).
- **JS outside flush** — all other JS in the windows: Svelte deriveds,
  `{#each}` reconciliation and the DOM commit, render-metadata preparation,
  plus the harness's own few lines.
- **style/layout** — `UpdateLayoutTree` + `Layout` (mostly the forced
  `getBoundingClientRect()`).
- **paint** — `Paint`/`PrePaint`/`Layerize`/`CompositeLayers`/`Commit` that
  fall inside a window.
- **GC** — `MinorGC`/`MajorGC`.
- **other** — remaining traced main-thread time (almost all `RunTask`
  scheduler overhead and `HitTest`).
- **untraced** — window time with no main-thread trace event (mostly the gap
  between the vsync timestamp and the frame task's start).

| Scenario          | Page avg ms/frame | Flush        | JS outside flush | Style/layout  | Paint       | GC          | Other       | Untraced     | Traced ÷ page total | Traced ÷ union | Paint after windows (not charged) |
| ----------------- | ----------------- | ------------ | ---------------- | ------------- | ----------- | ----------- | ----------- | ------------ | ------------------- | -------------- | --------------------------------- |
| `prose-mixed`     | 2.97              | 0.42 (14.3%) | 1.58 (53.3%)     | 0.51 (17.1%)  | 0.04 (1.4%) | 0.01 (0.2%) | 0.13 (4.3%) | 0.28 (9.5%)  | 90.4%               | 90.5%          | 1.03 ms/frame                     |
| `long-list`       | 23.09             | 5.79 (30.8%) | 11.52 (61.4%)    | 0.28 (1.5%)   | 0.69 (3.7%) | 0.17 (0.9%) | 0.23 (1.2%) | 0.10 (0.5%)  | 80.9%\*             | 99.5%          | 0.23 ms/frame                     |
| `long-code-fence` | 2.38              | 0.20 (8.5%)  | 0.45 (18.8%)     | 1.37 (57.6%)  | 0.01 (0.4%) | 0.00 (0.0%) | 0.11 (4.6%) | 0.24 (10.1%) | 89.9%               | 89.9%          | 0.99 ms/frame                     |
| `citations`       | 5.84              | 0.56 (10.5%) | 3.74 (69.9%)     | 0.33 (6.1%)   | 0.10 (1.9%) | 0.20 (3.8%) | 0.16 (2.9%) | 0.26 (4.8%)  | 87.1%\*             | 95.2%          | 0.76 ms/frame                     |
| `prefix-384kb`    | 75.05             | 8.36 (11.4%) | 41.37 (56.2%)    | 10.38 (14.1%) | 4.54 (6.2%) | 4.61 (6.3%) | 4.26 (5.8%) | 0.03 (0.0%)  | 98.0%               | 100.0%         | 1.93 ms/frame                     |

\* Below 90% of the page total only because of the double-counted overlap
described above; against the window union the buckets cover 99.5% / 95.2%.
All scenarios are above the plan's 70% STOP threshold. Including the
`untraced` bucket, the buckets sum to 100% of the union by construction.

Headline: **JS outside the flush measure is the largest bucket on every
scenario except `long-code-fence`** (53–70% of frame work), i.e. the Svelte
render side — deriveds, `{#each}` reconciliation, deep-state proxy traps,
render metadata, DOM commit — not parsing. The library flush (parse + diff +
state write) is 8–31%. `long-code-fence` is layout-bound (57.6%; the forced
layout of one ever-growing `<pre>`). On `long-list` the flush share is the
highest (30.8%), dominated by the token comparator. `prefix-384kb` confirms
O(N) render work: 41 ms/frame of JS outside the flush plus 10 ms of
style/layout for a 32-character append.

The JS-outside-flush bucket is split by window type in each log
(`of which ... in the sync window`); on overrunning scenarios that split is
unreliable because overlapping windows are assigned to the sync side.

## Top-15 self-time functions (CPU profile, samples inside the windows)

Production bundle without source maps (`vite.config.ts` has
`sourcemap: false`); minified names were identified by reading the bundle at
the reported position. `BCivH4Vn.js` is the Svelte client runtime chunk;
`DAV6IjOg.js` holds the library (marked + svelte-markdown). Chunk hashes are
specific to this build.

Legend for the recurring entries:

| Profile entry                                                                 | Identified as                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `get` `BCivH4Vn.js:1:17336`                                                   | Svelte deep `$state` proxy `get` trap                                                |
| `ownKeys` `:1:18468`, `has` `:1:17786`, `getOwnPropertyDescriptor` `:1:17563` | Svelte deep `$state` proxy traps                                                     |
| `Rn` `:1:16728`                                                               | Svelte `proxy()` (wrapping a new object in deep state)                               |
| `(anonymous)` `:2:4085`, `ta` `:2:4797`, `ea` `:2:4738`                       | Svelte `{#each}` block update / reconcile                                            |
| `#v` `:1:11736`                                                               | Svelte batch effect-tree traversal                                                   |
| `Z` `:1:25787`, `Ur` `:1:24273`, `Wr` `:1:24842`, `Gr` `:1:25131`             | Svelte signal read / reaction update / dependency bookkeeping                        |
| `get` `:3:10835`, `ownKeys` `:3:11387` / `:3:10697`                           | Svelte spread-props proxy (`{...rest}` props)                                        |
| `qs` `DAV6IjOg.js:67:82403`                                                   | `areRecordsSemanticallyEqual` (`src/lib/utils/streaming-token-reuse.ts`)             |
| `Qs` `:67:83192`                                                              | `reuseStableTokenArray` (`streaming-token-reuse.ts`)                                 |
| `u` `:67:6769`, `h` `:67:7608`                                                | `assignSequentialSourceKeys` / `assignSourceKeysToChildren` (`render-metadata.ts`)   |
| `g` `:67:7765`                                                                | `assignHeadingIds` (`render-metadata.ts`)                                            |
| `(anonymous)` `:67:10933`                                                     | `Parser.svelte` derived building link/image `href` via `sanitizeUrl`                 |
| `(anonymous)` `:67:18045`                                                     | `Parser.svelte` `{@const { text, raw, ...parserRest }}` destructuring for list items |
| `isAppendOnlyUpdate` `:71:73`                                                 | `IncrementalParser.isAppendOnlyUpdate` (`startsWith` over the whole previous source) |
| `getBoundingClientRect` (native)                                              | the page's forced style + layout read (= the style/layout bucket)                    |
| `measure` (native)                                                            | `performance.measure` (library flush profiling + harness windows)                    |

Per scenario (self ms, share of sampled window time):

**`prose-mixed`** — getBoundingClientRect 371.1 (16.2%) · proxy get 183.1
(8.0%) · each update 141.0 (6.2%) · isAppendOnlyUpdate 86.3 (3.8%) · each
reconcile `ta` 81.0 (3.5%) · `before` (native DOM insert) 63.5 (2.8%) ·
reuseStableTokenArray 60.4 (2.6%) · measure 54.1 (2.4%) · batch traversal 47.3
(2.1%) · signal get 39.0 (1.7%) · update_reaction 23.9 (1.0%) · proxy has 21.8
(1.0%) · spread-props get 20.4 (0.9%) · spread-props ownKeys 15.8 (0.7%) ·
deps bookkeeping `Wr` 14.2 (0.6%).

**`long-list`** — areRecordsSemanticallyEqual 2,063.9 (14.6%) · proxy get
1,747.8 (12.3%) · signal get 779.6 (5.5%) · assignHeadingIds 758.9 (5.4%) ·
spread-props ownKeys 654.2 (4.6%) · proxy ownKeys 528.6 (3.7%) · spread-props
get 511.7 (3.6%) · assignSequentialSourceKeys 393.0 (2.8%) · href derived
379.5 (2.7%) · assignSourceKeysToChildren 335.4 (2.4%) · proxy
getOwnPropertyDescriptor 313.9 (2.2%) · spread-props ownKeys (exclude) 287.9
(2.0%) · list-item rest destructuring 233.9 (1.6%) · marked `inlineTokens`
223.7 (1.6%) · remove reaction `Gr` 196.1 (1.4%).

**`long-code-fence`** — getBoundingClientRect 998.1 (54.1%) ·
isAppendOnlyUpdate 70.6 (3.8%) · measure 28.2 (1.5%) · marked `fences` 18.2
(1.0%) · everything else < 0.5% (Svelte runtime, `lex`, incremental parser
internals).

**`citations`** — proxy get 324.2 (8.0%) · getBoundingClientRect 204.1
(5.0%) · (garbage collector) 163.8 (4.0%) · signal get 162.1 (4.0%) · each
update 150.4 (3.7%) · isAppendOnlyUpdate 113.5 (2.8%) · assignHeadingIds 104.7
(2.6%) · spread-props get 100.8 (2.5%) · update_reaction 97.9 (2.4%) · `Wr`
85.8 (2.1%) · `Gr` 81.5 (2.0%) · batch traversal 81.1 (2.0%) · spread-props
ownKeys 70.1 (1.7%) · each reconcile 66.4 (1.6%) · assignSequentialSourceKeys
64.3 (1.6%).

**`prefix-384kb`** — proxy get 759.6 (15.4%) · getBoundingClientRect 701.8
(14.2%) · each update 612.1 (12.4%) · each reconcile 470.9 (9.5%) · (garbage
collector) 381.9 (7.7%) · batch traversal 339.1 (6.9%) · reuseStableTokenArray
202.0 (4.1%) · isAppendOnlyUpdate 157.3 (3.2%) · `proxy()` 113.3 (2.3%) ·
signal get 80.7 (1.6%) · each next-effect `ea` 59.4 (1.2%) · proxy has 43.4
(0.9%) · `Gr` 39.4 (0.8%) · assignHeadingIds 35.0 (0.7%) · update_reaction
28.6 (0.6%).

Implications for the later plans (observations, not decisions):

- Deep `$state` proxy traps and `proxy()` creation are top-3 on `long-list`,
  `citations`, and `prefix-384kb` — directly relevant to 007 (`$state.raw`).
- `areRecordsSemanticallyEqual` is the single hottest function on
  `long-list` (14.6%), with render-metadata walks (`assignHeadingIds`,
  source keys) another ~10% — relevant to 010.
- On `prefix-384kb` the root `{#each}` update/reconcile over every top-level
  token (~22%) plus proxy reads (15%) and GC (8%) dominate — relevant to 011.
- `long-code-fence` is layout-bound (the forced layout of one growing
  `<pre>`), which is 012's territory; parse/flush is only 8.5%.
- `isAppendOnlyUpdate` (a `startsWith` over the whole previous source) is
  2.8–3.8% everywhere and grows with document length.

## Files

- `paired-run-1.{log,json}`, `paired-run-2.{log,json}` — paired suites.
- `step2-parity-<scenario>.log`, `step3-<scenario>.log` — single-iteration
  verification runs.
- `attribution/<scenario>.log`, `attribution/<scenario>.attribution.json` —
  bucket tables, top-15 profiles, raw numbers.
- `rerun-parity-repro.log`, `rerun-list-split-repro.log` — Node repros re-run
  against the fixed `dist/`.
- `stop-*.mjs`, `stop-*.log`, `step1-paired-prose-mixed.log` — first pass
  (STOP evidence, before plans 008 + 013).
