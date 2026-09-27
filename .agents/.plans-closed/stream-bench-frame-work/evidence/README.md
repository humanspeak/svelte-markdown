# Streamdown 4.2.0 per-frame work comparison evidence

Captured on 2026-09-27 on branch `perf/stream-bench-flush-timing`, based on
`origin/main` at `9938fd6` (package version 1.9.5). The benchmark page and runner
were rewritten in this branch; the numbers here are NOT comparable with the
2026-09-22 evidence under `../../competitive-comparison-refresh/evidence/`.

## Why the previous numbers were retired

The 2026-09-22 suite recorded, per update, the duration of `content = slice;
await tick()`. Svelte Markdown defers stream parsing to the next animation frame,
so in the synchronous burst loops that figure was ~0.1 ms regardless of document
size while the entire parse and render landed in one final "settle" frame (300 ms
at 50 KB, 1150 ms at 200 KB). In the frame-paced scenario the same figure was the
60 Hz frame period for both renderers. Neither measured per-chunk cost, so the
"4.5–9× faster under burst" and "~60 updates/s" claims derived from them were
measurement artifacts, not a performance advantage.

## Method

Per animation frame, the page assigns the cumulative `content` prop one or more
times and records main-thread WORK:

- `syncMs` — time inside `content = ...; await tick()` (where a synchronous
  renderer parses and commits).
- `frameWorkMs` — time from the frame's `requestAnimationFrame` timestamp until
  the page's own rAF callback runs, plus a forced `getBoundingClientRect()` so
  style/layout is charged to the renderer that dirtied it. A renderer that
  defers to rAF does its parse and DOM commit inside this window.
- `workMs = syncMs + frameWorkMs`; `framesOverBudget` counts frames over 16.7 ms;
  `growthRatio` is mean work of the last fifth of frames over the first fifth.
- `libraryFlushMs` (Svelte Markdown only) sums the opt-in
  `svelte-markdown:stream-flush` User Timing measure — parse + diff + state
  write, excluding Svelte's DOM commit. Streamdown exposes no equivalent hook.

Corpora (all ≈24 KB, 32 characters per update ≈ 480 tokens/s at 60 fps):

| Scenario          | Shape                                                                      | Bytes  | Frames |
| ----------------- | -------------------------------------------------------------------------- | ------ | ------ |
| `prose-mixed`     | headings, paragraphs, lists, blockquote, code, table; 1 update/frame       | 24,477 | 765    |
| `prose-mixed-4x`  | same corpus; 4 updates/frame (fast transport, coalescing matters)          | 24,477 | 192    |
| `long-list`       | one bullet list of ~200 items, open until the closing paragraph            | 24,097 | 754    |
| `long-code-fence` | one fenced code block, open until the closing fence                        | 24,094 | 753    |
| `citations`       | prose with `[n]` markers and a trailing block of 40 `[n]: url` definitions | 24,068 | 753    |

Both renderers receive identical strings. Streamdown runs with
`animation={{ enabled: false }}` and `controls={{ code: false, mermaid: false,
table: false }}`; no optional Code component; no syntax highlighting on either
side. Normalized text-length ratios were within 0.984–1.025 on every scenario.

## Environment

- @humanspeak/svelte-markdown 1.9.5 (this branch); svelte-streamdown 4.2.0.
- Svelte 5.57.1, Vite 8.3.0, Playwright 1.63.0, Node v24.21.0, pnpm 11.9.0.
- Ubuntu 26.04.1 LTS; Intel Core i7-6700K @ 4.00 GHz, 8 threads.
- Headless production Chromium via Playwright, 1280 × 900 viewport; UA in JSON.
- Two sequential suites; each scenario: 1 warmup + 5 measured iterations per
  renderer, renderer order ours then Streamdown. Suite 1 finished
  2026-09-27T16:54:05Z; suite 2 finished 2026-09-27T17:05:26Z. Zero page errors.

Commands:

```sh
pnpm build
pnpm preview --host 127.0.0.1 --port 4173 --strictPort
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > run-1.log
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > run-2.log
```

`run-N.json` is the `=== JSON ===` tail of `run-N.log`.

## Results (median of 5 iterations; suite 1 / suite 2)

Total main-thread work over the whole stream, ms:

| Scenario          | Svelte Markdown | Streamdown      | Streamdown ÷ ours |
| ----------------- | --------------- | --------------- | ----------------- |
| `prose-mixed`     | 3,767 / 3,261   | 2,655 / 2,818   | 0.71 / 0.86       |
| `prose-mixed-4x`  | 1,211 / 1,135   | 1,490 / 1,363   | 1.23 / 1.20       |
| `long-list`       | 16,317 / 16,758 | 11,581 / 10,928 | 0.71 / 0.65       |
| `long-code-fence` | 2,668 / 2,916   | 1,378 / 1,407   | 0.52 / 0.48       |
| `citations`       | 4,750 / 5,323   | 1,716 / 1,769   | 0.36 / 0.33       |

Per-frame distribution, ms (p95 · peak · frames over 16.7 ms):

| Scenario          | Svelte Markdown                 | Streamdown                      |
| ----------------- | ------------------------------- | ------------------------------- |
| `prose-mixed`     | 8.6/6.6 · 16.9/13.6 · 1/0       | 5.9/6.1 · 14.2/14.2 · 0/0       |
| `prose-mixed-4x`  | 11.8/11.3 · 15.9/16.4 · 0/0     | 12.7/12.8 · 23.7/26.5 · 4/5     |
| `long-list`       | 41.9/42.7 · 50.1/53.9 · 407/418 | 34.0/32.6 · 47.8/42.1 · 269/246 |
| `long-code-fence` | 6.2/6.6 · 10.7/11.3 · 0/0       | 2.8/2.9 · 4.9/5.8 · 0/0         |
| `citations`       | 38.4/38.4 · 81.1/84.1 · 44/44   | 3.4/3.3 · 10.8/12.1 · 0/0       |

Growth ratio (last fifth ÷ first fifth of frames): prose-mixed 1.89/1.50 vs
1.71/1.67; prose-mixed-4x 1.23/1.32 vs 2.19/1.84; long-list 5.77/5.55 vs
5.75/5.61; long-code-fence 2.40/2.06 vs 1.39/1.53; citations 7.14/6.88 vs
1.24/1.26.

Descendant elements at end of stream (`querySelectorAll('*').length`, stable
across all runs): prose-mixed 1,384 vs 1,704; long-list 768 vs 769;
long-code-fence 4 vs 797; citations 776 vs 519.

Svelte Markdown `libraryFlushMs` (parse + diff + state write share of total
work): prose-mixed 1,428/1,254 of 3,767/3,261; long-list 4,504/4,582 of
16,317/16,758; long-code-fence 318/314 of 2,668/2,916; citations 1,059/1,164 of
4,750/5,323. The remainder is Svelte's DOM commit plus style/layout.

## What the numbers support

- Svelte Markdown does less work only when several updates land per frame
  (`prose-mixed-4x`): rAF coalescing parses once per frame and keeps every frame
  under budget, where Streamdown parses on each assignment.
- With one update per frame Streamdown does less work on every corpus tested.
  On mixed prose the gap is modest (1.16–1.42×) and neither renderer drops
  frames. On a single long open block both renderers are over budget on most
  frames; Streamdown by 1.4–1.5× less.
- Two Svelte Markdown hot spots are specific and fixable, not inherent:
    - `citations`: 44 of 753 frames exceed budget, one per `[n]: url` definition
      line. Each definition triggers a full re-lex and a full re-render with token
      reuse disabled (`referenceInvalidatesTail` in `incremental-parser.ts`).
    - `long-code-fence`: parsing is only ~12% of the work; the rest is committing
      and laying out one growing `<pre><code>` text node every frame (growth 2×
      vs 1.4×). Streamdown renders per-line elements and pays incremental layout.
- Element-count claims are corpus-dependent: 19% fewer on mixed prose, equal on
  lists, far fewer on code (no per-line wrappers), but 50% MORE on citation-heavy
  prose.
