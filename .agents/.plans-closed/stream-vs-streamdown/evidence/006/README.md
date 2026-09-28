# Plan 006 evidence: paired baseline, semantic parity, browser attribution

Captured 2026-09-28 on branch `perf/stream-bench-flush-timing` at `aaf85ab`
(snapshot `770f983` plus the Step 2b frame-window clamp in the working tree;
library unchanged since the fixes from plans 008 and 013). Package version
1.9.5. These are the paired baseline numbers every later plan in the batch
compares against. The first-pass (pre-clamp) numbers are kept in
`pre-clamp/` for the record; do not compare against them.

## Method

The per-frame work metric is the one from
`.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`
(`workMs = syncMs + frameWorkMs`, forced `getBoundingClientRect()` at the end of
each frame window), with one correction (Step 2b):

- **Metric change — frame windows no longer overlap.** Previously
  `frameWorkMs = now − rAF timestamp`. After a frame overruns its budget, the
  next rAF timestamp can be EARLIER than the end of the previous measured
  window, so that stretch was charged twice (pre-clamp traces: 3,250 ms of
  17,411 ms on `long-list`, 371 ms on `citations`, 101 ms on
  `prefix-384kb`). The frame window now starts at
  `max(rAF timestamp, end of the previous measured window)` (sync or frame
  window, tracked per run), and the clipped time is reported per run as
  `overlapClampedMs`. The `stream-bench:frame-work` User Timing measure uses
  the same clamped start, so the attribution windows match the page exactly
  (every attribution run: raw window sum = window union = `totalWorkMs`,
  0 ms counted twice). Sync windows were already sequential and are
  unchanged. On scenarios with no overruns the clamp is a no-op by
  construction (`overlapClampedMs` ≈ 0; see "Step 2b check" below).

New in this plan:

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
- Load average (1 / 5 / 15 min) before suite 1: 1.55 / 2.92 / 3.66; after
  suite 1 = before suite 2: 1.66 / 1.53 / 2.16; after suite 2: 2.97 / 2.12 /
  1.92. Attribution runs each started with the 1-minute load below 1.5
  (0.92–1.40; recorded on the first line of each `attribution/<scenario>.log`).
- **Machine speed shifted between the pre-clamp capture and this one**: on
  scenarios with no overruns (where the clamp changes nothing) both renderers
  measure ~40–70% more work than in `pre-clamp/` (e.g. `prose-mixed` ours
  1,901 → 3,231 ms, theirs 1,980 → 2,817 ms; ours library flush 311 → 511 ms,
  a quantity independent of the frame windows). A control run of the
  unmodified pre-clamp page and runner (`git show HEAD:…`, rebuilt, same
  session) reproduced today's numbers — `prose-mixed` ours 3,154 / theirs
  2,867 ms, `long-code-fence` ours 2,785 / theirs 1,510 ms (median of 3
  pairs; `control-preclamp-page-*.log`) — so the shift is environmental, not
  the clamp. Absolute numbers are only comparable within one capture; use
  paired deltas and ratios across captures.
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
# Step 2b/5: paired suites with the clamped metric (run twice)
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
`paired-run-N.log` is everything before it. Suite 1 ran
2026-09-28T11:24:54Z–11:40:30Z, suite 2 11:40:30Z–11:56:06Z. The Step 2
parity-repro and single-iteration Step 2/3 logs were not re-run for 2b (they
predate the clamp; see `pre-clamp/`); both 2b suites re-check parity. Raw traces and CPU
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
- Browser, one iteration each (`pre-clamp/step2-parity-*.log`,
  `pre-clamp/step3-*.log`), both pre-clamp paired suites, and both clamped
  paired suites (5 iterations): `parityMismatches === 0` on every scenario,
  every run. Checks per suite: 155 on the 24 KB scenarios, 40 on
  `prose-mixed-4x`, 15 on the prefix scenarios.

The parity comparator was not changed or loosened. The Step 2 corruption
check (compare against a parse of `source + 'x'` → mismatches > 0) was done in
the first pass and not repeated here.

### DOM projection (ours vs Streamdown, final frame)

Unchanged by the clamp. MATCH on every scenario except two, both documented rather than silenced:

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

Clamped metric (Step 2b). Total main-thread work over the whole stream, ms;
paired delta = theirs − ours (positive = ours does less work);
`overlapClampedMs` = time clipped from overlapping frame windows (median per
run, ours / theirs, suite 1 · suite 2):

| Scenario                 | Ours total      | Theirs total  | Paired delta    | Ours avg/frame | Ours p95    | Ours frames > 16.7 ms | Theirs frames > 16.7 ms | Ours lib flush | Overlap clamped ours / theirs |
| ------------------------ | --------------- | ------------- | --------------- | -------------- | ----------- | --------------------- | ----------------------- | -------------- | ----------------------------- |
| `prose-mixed`            | 3,231 / 3,115   | 2,817 / 2,902 | −414 / −261     | 4.22 / 4.07    | 7.1 / 7.2   | 0 / 0 of 765          | 0 / 0                   | 511 / 497      | 0 / 0.9 · 3.1 / 0             |
| `prose-mixed-4x`         | 913 / 1,069     | 1,230 / 1,433 | +324 / +343     | 4.76 / 5.57    | 8.4 / 8.6   | 0 / 1 of 192          | 0 / 3                   | 107 / 133      | 0 / 0 · 2.7 / 8.5             |
| `long-list`              | 12,841 / 13,059 | 9,153 / 9,152 | −3,625 / −3,907 | 17.03 / 17.32  | 31.0 / 31.1 | 365 / 378 of 754      | 201 / 203               | 4,079 / 4,142  | 2,576 / 1,421 · 2,714 / 1,526 |
| `long-code-fence`        | 2,840 / 2,935   | 1,568 / 1,563 | −1,341 / −1,390 | 3.77 / 3.90    | 6.6 / 7.2   | 0 / 0 of 753          | 0 / 0                   | 252 / 237      | 0 / 0 · 0 / 0                 |
| `citations`              | 4,545 / 4,555   | 1,893 / 1,874 | −2,663 / −2,634 | 6.04 / 6.05    | 37.2 / 38.0 | 46 / 46 of 753        | 0 / 0                   | 635 / 633      | 315 / 0 · 341 / 0             |
| `prose-mixed-writechunk` | 3,145 / 3,234   | — (skipped)   | —               | 4.11 / 4.23    | 7.1 / 7.1   | 0 / 0 of 765          | —                       | 529 / 535      | 0.9 / — · 0 / —               |
| `prefix-24kb`            | 400 / 387       | 265 / 263     | −117 / −130     | 5.98 / 5.77    | 11.0 / 11.7 | 1 / 1 of 67           | 0 / 0                   | 70 / 68        | 0 / 0 · 0 / 0                 |
| `prefix-96kb`            | 817 / 796       | 566 / 576     | −262 / −265     | 12.20 / 11.88  | 15.8 / 14.6 | 3 / 3 of 67           | 0 / 0                   | 134 / 135      | 29 / 0 · 22 / 0               |
| `prefix-384kb`           | 4,129 / 4,211   | 2,746 / 2,736 | −1,422 / −1,395 | 61.63 / 62.84  | 71.8 / 67.8 | 67 / 67 of 67         | 67 / 67                 | 598 / 629      | 266 / 27 · 273 / 23           |
| `large-closed-block`     | 212 / 210       | 261 / 267     | +49 / +52       | 3.17 / 3.14    | 5.6 / 5.2   | 0 / 0 of 67           | 1 / 1                   | 35 / 34        | 0 / 13 · 0 / 12               |

Per-pair deltas are in `paired-run-N.json` (`pairedDeltasMs`); per-run
`overlapClampedMs` is on every run there and in the `.log` lines. The two
suites agree closely (load stayed below 3), and the paired delta sign agrees
across both suites and all ten pairs for every scenario — including
`prose-mixed`, which pre-clamp straddled zero and now is consistently
negative (−130 to −478 per pair; ours ~1.1× more work).

### Step 2b check

- **No overruns → no change.** `overlapClampedMs` is 0–3 ms on
  `prose-mixed`, `prose-mixed-4x`, `long-code-fence`, `prose-mixed-writechunk`,
  `prefix-24kb`, `large-closed-block` (≤ 13 ms for theirs). The totals there
  differ from `pre-clamp/` only by the machine shift described under
  Environment; the same-session control of the pre-clamp page matches them
  (`prose-mixed` 3,154 vs 3,231 / 3,115; `long-code-fence` 2,785 vs 2,840 /
  2,935 for ours).
- **Overruns → the double count is removed for both renderers.** `long-list`:
  ours clamps 2,576 / 2,714 ms (pre-clamp trace estimate: 3,250 ms), theirs
  1,421 / 1,526 ms; totals fall from 15,637 / 16,992 to 12,841 / 13,059 (ours)
  and 10,427 / 11,085 to 9,153 / 9,152 (theirs), despite the slower machine.
  `citations`: ours 315 / 341 ms clamped (trace estimate 371), theirs 0 (it
  never overruns). `prefix-384kb`: ours 266 / 273, theirs 27 / 23.
- Parity 0 everywhere; zero page errors in both suites.

Observations against the batch acceptance contract (clamped metric):

- Ours wins only `prose-mixed-4x` (1.35×) and `large-closed-block` (1.23×).
  Streamdown does less work on `prose-mixed` (1.1×), `long-list` (1.40×),
  `long-code-fence` (1.81×), `citations` (2.40×, but see the DOM projection
  caveat), and every prefix scenario (1.4–1.5×).
- **Prefix work is O(N)**: ours `avgWorkMs` is 5.98 → 12.20 → 61.63 ms for a
  24 → 96 → 384 KB closed prefix (suite 1), a 10.3× growth for the same 2 KB
  tail; the contract requires `prefix-384kb` within 15% of `prefix-24kb`.
  Streamdown also grows (3.95 → 8.44 → 40.98 ms).
- Frames over budget remain on `long-list` (365–378 of 754 vs Streamdown's
  ~200), `citations` (46, Streamdown 0), and all prefix scenarios
  (`prefix-384kb`: every frame, both renderers).

## Attribution baseline (ours, one traced run each)

Buckets are main-thread self time inside the page's measured windows (with
the clamp the windows no longer overlap, so their raw sum, their union, and the
page's `totalWorkMs` are equal), in ms per frame (share of the total):

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

| Scenario          | Page avg ms/frame | Flush        | JS outside flush | Style/layout  | Paint       | GC          | Other       | Untraced    | Traced ÷ page total | Paint after windows (not charged) |
| ----------------- | ----------------- | ------------ | ---------------- | ------------- | ----------- | ----------- | ----------- | ----------- | ------------------- | --------------------------------- |
| `prose-mixed`     | 3.81              | 0.54 (14.1%) | 2.13 (55.8%)     | 0.63 (16.6%)  | 0.01 (0.3%) | 0.02 (0.6%) | 0.14 (3.7%) | 0.34 (8.9%) | 91.1%               | 1.40 ms/frame                     |
| `long-list`       | 17.70             | 5.56 (31.4%) | 10.79 (61.0%)    | 0.27 (1.6%)   | 0.61 (3.5%) | 0.14 (0.8%) | 0.21 (1.2%) | 0.11 (0.6%) | 99.4%               | 0.27 ms/frame                     |
| `long-code-fence` | 3.20              | 0.29 (9.0%)  | 0.61 (19.1%)     | 1.88 (58.8%)  | 0.01 (0.5%) | 0.00 (0.0%) | 0.15 (4.6%) | 0.26 (8.0%) | 92.0%               | 1.33 ms/frame                     |
| `citations`       | 6.08              | 0.73 (12.0%) | 4.10 (67.4%)     | 0.45 (7.4%)   | 0.09 (1.5%) | 0.19 (3.1%) | 0.19 (3.1%) | 0.33 (5.5%) | 94.5%               | 1.11 ms/frame                     |
| `prefix-384kb`    | 65.18             | 8.34 (12.8%) | 37.96 (58.2%)    | 10.14 (15.6%) | 4.03 (6.2%) | 0.97 (1.5%) | 3.69 (5.7%) | 0.04 (0.1%) | 99.9%               | 1.59 ms/frame                     |

All scenarios are well above the plan's 70% STOP threshold (91–100% traced);
including the `untraced` bucket the buckets sum to 100% of the page total by
construction. Page totals of the traced runs: `prose-mixed` 2,914 ms,
`long-list` 13,342, `long-code-fence` 2,409, `citations` 4,577,
`prefix-384kb` 4,367 — consistent with the paired suites.

Headline (unchanged by the clamp): **JS outside the flush measure is the
largest bucket on every scenario except `long-code-fence`** (56–67% of frame
work), i.e. the Svelte render side — deriveds, `{#each}` reconciliation,
deep-state proxy traps, render metadata, DOM commit — not parsing. The library
flush (parse + diff + state write) is 9–31%. `long-code-fence` is
layout-bound (58.8%; the forced layout of one ever-growing `<pre>`). On
`long-list` the flush share is the highest (31.4%), dominated by the token
comparator. `prefix-384kb` confirms O(N) render work: 38 ms/frame of JS
outside the flush plus 10 ms of style/layout for a 32-character append.

The JS-outside-flush bucket is split by window type in each log
(`of which ... in the sync window`); with non-overlapping windows that split
is now reliable: sync-window JS is 162 ms (`prose-mixed`), 1,726
(`long-list`), 95 (`long-code-fence`), 354 (`citations`), 303
(`prefix-384kb`) — the rest runs in the frame window.

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

The library and runtime chunk hashes (`BCivH4Vn.js`, `DAV6IjOg.js`) are
identical to the pre-clamp build, so the legend above applies unchanged.

Per scenario (self ms, share of sampled window time):

**`prose-mixed`** — getBoundingClientRect 459.4 (15.5%) · proxy get 230.9
(7.8%) · each update 177.1 (6.0%) · isAppendOnlyUpdate 129.0 (4.4%) · each
reconcile `ta` 112.5 (3.8%) · `before` (native DOM insert) 96.9 (3.3%) ·
reuseStableTokenArray 81.8 (2.8%) · measure 69.9 (2.4%) · batch traversal 62.9
(2.1%) · signal get 42.7 (1.4%) · update_reaction 39.4 (1.3%) · proxy has 28.2
(1.0%) · deps bookkeeping `Wr` 27.5 (0.9%) · (garbage collector) 25.6 (0.9%) ·
spread-props get 25.1 (0.8%).

**`long-list`** — areRecordsSemanticallyEqual 1,989.7 (14.9%) · proxy get
1,609.1 (12.0%) · signal get 714.0 (5.3%) · assignHeadingIds 695.2 (5.2%) ·
spread-props ownKeys 623.8 (4.7%) · proxy ownKeys 534.6 (4.0%) · spread-props
get 478.5 (3.6%) · assignSequentialSourceKeys 397.7 (3.0%) · href derived
394.5 (3.0%) · assignSourceKeysToChildren 291.8 (2.2%) · proxy
getOwnPropertyDescriptor 286.7 (2.1%) · spread-props ownKeys (exclude) 274.0
(2.0%) · list-item rest destructuring 237.5 (1.8%) · remove reaction `Gr`
231.4 (1.7%) · marked `inlineTokens` 208.3 (1.6%).

**`long-code-fence`** — getBoundingClientRect 1,398.2 (57.1%) ·
isAppendOnlyUpdate 112.3 (4.6%) · measure 39.6 (1.6%) · marked `fences` 22.5
(0.9%) · everything else ≤ 0.5% (Svelte runtime, `lex`, incremental parser
internals).

**`citations`** — proxy get 374.7 (8.1%) · getBoundingClientRect 328.1
(7.1%) · isAppendOnlyUpdate 201.3 (4.4%) · each update 187.0 (4.0%) · signal
get 165.3 (3.6%) · (garbage collector) 158.2 (3.4%) · batch traversal 143.0
(3.1%) · spread-props get 107.7 (2.3%) · update_reaction 103.1 (2.2%) · marked
`inlineTokens` 98.8 (2.1%) · assignHeadingIds 95.9 (2.1%) · `Wr` 95.6 (2.1%) ·
each reconcile 84.7 (1.8%) · spread-props ownKeys 71.5 (1.5%) · `Gr` 71.2
(1.5%).

**`prefix-384kb`** — proxy get 681.3 (15.6%) · getBoundingClientRect 678.4
(15.5%) · each update 549.6 (12.6%) · each reconcile 374.4 (8.6%) · batch
traversal 318.1 (7.3%) · reuseStableTokenArray 215.0 (4.9%) · (garbage
collector) 175.9 (4.0%) · isAppendOnlyUpdate 155.1 (3.5%) · `proxy()` 128.1
(2.9%) · each next-effect `ea` 59.0 (1.3%) · signal get 54.5 (1.2%) ·
assignHeadingIds 46.5 (1.1%) · `Gr` 41.6 (1.0%) · proxy has 39.6 (0.9%) ·
update_reaction 25.4 (0.6%).

Implications for the later plans (observations, not decisions):

- Deep `$state` proxy traps and `proxy()` creation are top-3 on `long-list`,
  `citations`, and `prefix-384kb` — directly relevant to 007 (`$state.raw`).
- `areRecordsSemanticallyEqual` is the single hottest function on
  `long-list` (14.9%), with render-metadata walks (`assignHeadingIds`,
  source keys) another ~10% — relevant to 010.
- On `prefix-384kb` the root `{#each}` update/reconcile over every top-level
  token (~21%) plus proxy reads (16%) and GC (4%) dominate — relevant to 011.
- `long-code-fence` is layout-bound (the forced layout of one growing
  `<pre>`), which is 012's territory; parse/flush is only 9.0%.
- `isAppendOnlyUpdate` (a `startsWith` over the whole previous source) is
  3.5–4.6% on four of the five scenarios (below the top 15 on `long-list`) and grows with document length.

## Files

- `paired-run-1.{log,json}`, `paired-run-2.{log,json}` — paired suites,
  clamped metric (Step 2b).
- `attribution/<scenario>.log`, `attribution/<scenario>.attribution.json` —
  bucket tables, top-15 profiles, raw numbers (clamped metric; each log starts
  with the load average at launch).
- `control-preclamp-page-{prose-mixed,long-code-fence}.log` — same-session
  control: the unmodified pre-clamp page + runner, 3 pairs each.
- `rerun-parity-repro.log`, `rerun-list-split-repro.log` — Node repros re-run
  against the fixed `dist/`.
- `stop-*.mjs`, `stop-*.log` — first pass (STOP evidence, before plans 008 +
  013).
- `pre-clamp/` — the superseded first capture (unclamped metric): its paired
  suites, attribution, `step1-paired-prose-mixed.log`,
  `step2-parity-<scenario>.log`, `step3-<scenario>.log`.
