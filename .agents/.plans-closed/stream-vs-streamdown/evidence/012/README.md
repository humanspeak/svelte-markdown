# Plan 012 evidence: per-line text nodes in the `Code` renderer (spike)

Captured 2026-09-28 on `perf/stream-bench-flush-timing`, working tree on top of
`cb3c0e5`. Drift check `git diff --stat f6684cc..HEAD -- src/lib/renderers/Code.svelte src/lib/renderers/Code.test.ts`
was empty; `Code.svelte` matched the plan's excerpt.

- **A** = `cb3c0e5` in a separate worktree (`git worktree add --detach
/tmp/svm-ab-a-012 cb3c0e5`, `pnpm install --frozen-lockfile`, `pnpm build`),
  preview on **port 4173**. Library chunk `Blkxhcok.js`.
- **B** = this checkout, preview on **port 4183**. A/A control: B built before
  the change (library chunk `Blkxhcok.js`, identical to A). After Step 3:
  library chunk `CzerIEjR.js` (165,273 vs 165,131 bytes); the other renamed
  chunks are same-size hash cascades. Svelte runtime chunk `BCivH4Vn.js`
  identical on both sides.
- Worktree and both previews removed after the runs.

Environment as in 007/011: Svelte 5.57.1, Vite 8.3.0, Playwright 1.63.0,
Node v24.21.0, HeadlessChrome 153.0.8010.12 (1280 × 900), Ubuntu 26.04.1,
i7-6700K (8 threads). Every measured run waited until the 1-minute load was
≤ 4; the load at start is the first line of each log (0.96–2.51). Zero page
errors in every run.

**Decision: KEPT.** B does 29.2% / 25.4% less total work on
`long-code-fence` (every one of the 10 pairs positive), growth ratio and p95
drop in both repeats, parity 0 on both sides, output hash and DOM projection
MATCH. `prose-mixed` is −1.5% / −1.7% (inside the 3% bound). Against
Streamdown, `long-code-fence` narrows from 1.8× to 1.31× more work; ours is
still slower.

## Commands

```sh
export PATH=~/.local/share/pnpm/bin:$PATH
# A/B runner (load-gated copy of 011's): /tmp/svm-012-ab.sh <label> <scenario> [iterations] [ab|vs]
STREAM_COMPARE_URL_A=http://127.0.0.1:4173/test/stream-compare \
STREAM_COMPARE_URL_B=http://127.0.0.1:4183/test/stream-compare \
STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S \
  node scripts/stream-compare-bench.mjs > ab-run-N-$S.log     # .json = the JSON tail
# vs Streamdown: STREAM_COMPARE_URL=<B> only (paired ours vs theirs)
# attribution
STREAM_COMPARE_URL=<A or B> STREAM_COMPARE_SCENARIO=long-code-fence \
STREAM_ATTRIBUTE_OUT_DIR=attribution-{before,after} node scripts/stream-compare-attribute.mjs
```

## Step 1: attribution before (A)

One traced run of A, `long-code-fence`: page avg 3.06 ms/frame.
**UpdateLayoutTree + Layout = 1.89 ms/frame, 61.7%** of frame work (≥ 30%, so
the spike continued). Flush 0.12 (3.8%), JS outside the flush 0.58 (18.9%),
paint 0.02, other 0.15, untraced 0.31. Top self-time:
`getBoundingClientRect` (the bench's forced layout) 61%.

## A/A control (both sides `cb3c0e5`, 2 pairs + 1 warmup)

| Scenario          | A total | B total | Paired delta (median of 2) | Per pair     | Parity A / B |
| ----------------- | ------- | ------- | -------------------------- | ------------ | ------------ |
| `long-code-fence` | 2,389   | 2,189   | +200 ms (+8.4%)            | +402.9, −2.0 | 0 / 0        |
| `prose-mixed`     | 2,047   | 1,973   | +74 ms (+3.6%)             | +63.4, +85.1 | 0 / 0        |

Within ±10% (the `long-code-fence` median is pulled by one noisy pair; the
other is −2 ms). Output hash and DOM projection MATCH. A first attempt at the
`long-code-fence` A/A started at load 6.92 and was discarded and re-run under
the load gate (its result was +0.45%).

## Step 4: paired A/B, median of 5 pairs (repeat 1 / repeat 2)

Delta = A − B (positive = B does less work). ms unless noted.

| Scenario          | A total       | B total       | Paired delta (% of A)       | A avg ms/frame | B avg ms/frame | A growth    | B growth    | A p95     | B p95     | Over-budget A / B | A lib flush | B lib flush | Parity A / B |
| ----------------- | ------------- | ------------- | --------------------------- | -------------- | -------------- | ----------- | ----------- | --------- | --------- | ----------------- | ----------- | ----------- | ------------ |
| `long-code-fence` | 2,333 / 2,301 | 1,622 / 1,611 | +680 (29.2%) / +584 (25.4%) | 3.10 / 3.06    | 2.15 / 2.14    | 4.24 / 4.16 | 3.33 / 3.04 | 5.8 / 5.5 | 3.9 / 3.8 | 0 / 0             | 94 / 95     | 98 / 98     | 0 / 0 (155)  |
| `prose-mixed`     | 1,986 / 1,840 | 2,079 / 1,772 | −31 (−1.5%) / −31 (−1.7%)   | 2.60 / 2.41    | 2.72 / 2.32    | 2.09 / 1.87 | 2.49 / 2.08 | 4.8 / 4.4 | 5.0 / 4.5 | 0 / 0             | 143 / 139   | 155 / 138   | 0 / 0 (155)  |

Per-pair deltas (ms):

- `long-code-fence`: 843.6, 735.0, 680.1, 638.4, 655.0 / 782.4, 583.6, 572.7, 465.6, 821.8 — all positive.
- `prose-mixed`: 313.3, 5.5, −365.8, −30.7, −167.0 / −30.5, −69.4, 246.7, −172.9, −30.8 — mixed sign, noise-sized.

Growth ratio is the bench's per-run last/first-fifth ratio; it is noisy
(A/A spread 2.1–4.4 on `long-code-fence`), but its median fell in both
repeats (4.24 → 3.33, 4.16 → 3.04).

### Other fence-containing scenarios (one repeat, 5 pairs)

All prose-derived scenarios stream the `prose-mixed` corpus, whose sections
each contain one closed `ts` fence. `long-list`, `long-table`, and
`citations` render no code blocks, so `Code.svelte` does not run there.

| Scenario             | A total | B total | Paired delta (% of A) | Per pair                        | Over-budget median A / B | Parity A / B |
| -------------------- | ------- | ------- | --------------------- | ------------------------------- | ------------------------ | ------------ |
| `prose-mixed-4x`     | 552.5   | 550.2   | −9.5 (−1.7%)          | 133.2, −17.7, −9.5, −38.7, 12.2 | 0 / 0                    | 0 / 0        |
| `prefix-24kb`        | 118.8   | 134.1   | −0.3 (−0.3%)          | 39.9, −18.5, −0.3, 1.4, −15.3   | 0 / 0                    | 0 / 0        |
| `large-closed-block` | 93.1    | 90.6    | +14.3 (+15.4%)        | 14.3, 14.6, −10.3, 16.4, −13.1  | 0 / 0                    | 0 / 0        |

Paired medians are within the 3% bound (the 67-frame scenarios are
noise-dominated: ±15 ms per pair). One B run each of `prefix-24kb` and
`large-closed-block` had one frame over 16.7 ms (peaks 20.8 / 17.5 ms; the
medians are 0). Isolated single over-budget runs also occur on pre-change
builds: 011's captures of these two scenarios show them on A-side runs
(e.g. `large-closed-block` A runs 6 and 8 of the 9-pair run, `prefix-24kb`
A run 1), and this plan's A/A `prose-mixed` A run 2 had one. They are not
attributed to the change, but were not re-run to prove it.

## Ours vs Streamdown, `long-code-fence` (B only, 5 pairs, two repeats)

| Repeat | Ours total | Theirs total | Paired delta (theirs − ours) | Per pair                               | Ours p95 / theirs | Over-budget ours / theirs | Ours parity |
| ------ | ---------- | ------------ | ---------------------------- | -------------------------------------- | ----------------- | ------------------------- | ----------- |
| 1      | 1,584      | 1,209        | −378 (theirs 1.31× less)     | −759.8, −377.5, −352.0, −228.0, −485.4 | 3.7 / 2.8         | 0 / 0                     | 0 / 155     |
| 2      | 1,536      | 1,175        | −371 (theirs 1.31× less)     | −693.5, −371.3, −317.6, −242.7, −410.4 | 3.5 / 2.8         | 0 / 0                     | 0 / 155     |

Plan 006 baseline was 2,840–2,935 vs 1,563–1,568 (1.8×). The gap narrowed but
`long-code-fence` is still not below Streamdown.

## Attribution after (B, one traced run)

| Capture | Page avg ms/frame | Flush       | JS outside flush | Style/layout | Paint       | GC          | Other       | Untraced     | Paint+composite after windows (not charged) |
| ------- | ----------------- | ----------- | ---------------- | ------------ | ----------- | ----------- | ----------- | ------------ | ------------------------------------------- |
| A       | 3.06              | 0.12 (3.8%) | 0.58 (18.9%)     | 1.89 (61.7%) | 0.02 (0.6%) | 0.00        | 0.15 (4.7%) | 0.31 (10.1%) | 1.38                                        |
| B       | 2.03              | 0.09 (4.7%) | 0.73 (35.9%)     | 0.75 (37.0%) | 0.01 (0.6%) | 0.00 (0.1%) | 0.14 (7.0%) | 0.30 (14.7%) | 1.72                                        |

The hypothesis held: style/layout fell 1.89 → 0.75 ms/frame (−60%;
`getBoundingClientRect` self time 1,427.5 → 513.7 ms). JS outside the flush
rose 0.58 → 0.73 ms/frame (the per-line `{#each}`: Svelte runtime entries
`BCivH4Vn.js:2:4085`, `Ue :1:3310`, `#v` now in the top 6). Paint+composite
AFTER the measured windows — not charged by the bench — rose 1.38 → 1.72
ms/frame; it is reported here so the net main-thread effect is not overstated
(charged −1.03 ms/frame, uncharged +0.34 ms/frame).

## DOM / SSR contract (settled)

- Client DOM: `<pre class={lang}><code>` + one Text node per line; each line's
  node carries its own trailing `\n` (the last line has none; `''` renders one
  empty Text node). `<code>` has no element children; the controlled `{#each}`
  inside `<code>` adds no anchor node on a client mount. `code.textContent ===
text` exactly. `code.firstChild` is only the first line — `textContent` is
  the supported read (documented in the component doc comment).
- Server output: `<!--[--><pre class="ts"><code><!--[--><!---->a\n<!---->b<!--]--></code></pre><!--]-->`
  for `text: 'a\nb'`. Accepted difference from the plain shape: `<!--[-->` /
  `<!--]-->` around the lines and `<!---->` before each line, inside `<code>`;
  no whitespace added. Stripping comments yields exactly
  `<pre class="ts"><code>a\nb</code></pre>`. After hydration the marker
  comments remain in the DOM (not part of `textContent`).
- Hydration: the SSR `<pre>`/`<code>` nodes are adopted (identity asserted),
  no console warnings or errors, and a post-hydration `text` update renders.
- Bounded invalidation: the `{#each}` is keyed by index (compiled to Svelte's
  index-keyed each with per-item signals); a line's text effect reads only its
  own item, so an append updates the last Text node and adds one node per new
  line. Asserted by the red-anchor test (completed-line node keeps identity and
  data across an append).

## Tests (Code.test.ts)

- Red anchor (failed before Step 3, passes after): completed-line Text node
  identity and data unchanged across `'a\nb\nc'` → `'a\nb\ncd'`.
- textContent equality for `'a\nb\nc'`, `''`, `'x'`, `'a\n'`, `'\n\n'`,
  `'a\n\nb'`, and across a streamed append/shrink/reset sequence.
- Element shape: `pre.className === lang`, one `pre` child, no `code` element
  children.
- SSR: exact body (marker contract), comment-stripped body, escaping.
- Hydration for `'a\nb'`, `''`, `'a\n'`, `'x\n\ny'`: node adoption, no
  warnings/errors, reactive after hydration (via `createClassComponent({ hydrate: true })`).
- SSR is produced in the jsdom test by compiling `Code.svelte?raw` with
  `generate: 'server'` and evaluating it against the same
  `svelte/internal/server` instance `svelte/server` uses.

## Files

- `aa-control-{long-code-fence,prose-mixed}.{log,json}` — A/A controls.
- `ab-run-{1,2}-{long-code-fence,prose-mixed}.{log,json}` — Step 4 paired A/B.
- `ab-run-1-{prose-mixed-4x,prefix-24kb,large-closed-block}.{log,json}` — regression sweep.
- `vs-streamdown-{1,2}-long-code-fence.{log,json}` — ours (B) vs Streamdown.
- `attribution-{before,after}/long-code-fence.{log,attribution.json}` — A and B
  attribution. Raw traces/CPU profiles were written to `/tmp` and not archived.
