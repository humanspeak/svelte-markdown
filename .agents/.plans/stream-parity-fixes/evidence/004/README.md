# Plan 004 evidence: the parity fixes did not cost speed

Captured 2026-09-29 on `perf/stream-bench-flush-timing`, working tree at
`5516170` plus this plan's two new bench scenarios (no change under
`src/lib/`). Drift check `git diff --stat f3d8d75..HEAD -- src/lib docs/src README.md`
was empty.

- **A** = `119cc58` (red parity tests only, no fixes), built in a separate
  worktree (`git worktree add /tmp/svm-ab-a-parity 119cc58`,
  `pnpm install --frozen-lockfile`, `pnpm build`), preview on **port 4173**.
  The worktree was removed after the runs.
- **B** = this checkout (plans 001–003 and 005–010 landed), preview on
  **port 4183**.

**Verdict: PASS.** Parity 0 on every run on both sides (A/A, A/B and ours vs
Streamdown), output hash and DOM projection MATCH A vs B on every A/B run,
zero page errors. No scenario is worse on B by more than 3% in both repeats:
the four scenarios with one repeat beyond −3% (`long-list`, `long-table`,
`long-code-fence`, `prefix-384kb`) flip sign or stay within −1.4% in the
other repeat, and their per-pair deltas are mixed in sign. The largest
same-sign pattern is `long-code-fence` (−6.32% / −1.41%, 7 of 10 pairs
negative), about 20–120 ms on ~1,870 ms.

## Method

Plan 006's paired protocol and clamped per-frame work metric, unchanged
(`.agents/.plans-closed/stream-vs-streamdown/evidence/006/README.md`), and
Plan 007's two-URL A/B mode
(`.agents/.plans-closed/stream-vs-streamdown/evidence/007/README.md`): one
Chromium, one page per URL, one warmup of each side, then 5 iterations in
alternating order. Paired delta = **A − B** per pair (positive = B does less
work), reported as the median of the pairs and as a percentage of A's median
total. Parity: every 25 frames and the final frame, streamed tokens vs a
fresh one-shot parse of the same cumulative source, on both sides.

Ours vs Streamdown: single-URL paired mode against B, same protocol,
ratio = theirs ÷ ours (> 1 means ours does less work).

## Environment

- @humanspeak/svelte-markdown 1.9.5 (this branch); svelte-streamdown 4.2.0.
- Node v24.21.0; HeadlessChrome 153.0.8010.12 via Playwright, 1280 × 900;
  production builds served by `vite preview`.
- Ubuntu 26.04.1 LTS; Intel Core i7-6700K @ 4.00 GHz, 8 threads (same
  machine as evidence 007 and 014).
- A driver script waited until the 1-minute load was ≤ 4 before each run (it
  never had to wait) and wrote `uptime` as the first line and the last line of
  each log. 1-minute load at the start of each run: A/A 1.27 / 1.03; A/B
  repeat 1 1.07–1.49, repeat 2 1.37–2.52; ours vs Streamdown 1.03–2.11. The
  load before the session was 4.26 (06:35 local) and had fallen to 2.87 before
  the first bench run. Every run exited 0.
- Runs executed one at a time, 10:38Z–11:28Z.

## Commands

```sh
export PATH=~/.local/share/pnpm/bin:$PATH
# A
git worktree add /tmp/svm-ab-a-parity 119cc58
(cd /tmp/svm-ab-a-parity && pnpm install --frozen-lockfile && pnpm build \
  && pnpm preview --host 127.0.0.1 --port 4173 --strictPort)
# B (and, for the A/A control only, a second preview of B on 4174)
pnpm build && pnpm preview --host 127.0.0.1 --port 4183 --strictPort
# Step 1: new scenarios, one iteration each on B (vs Streamdown)
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_ITERATIONS=1 \
  STREAM_COMPARE_WARMUPS=0 STREAM_COMPARE_SCENARIO=$S node scripts/stream-compare-bench.mjs
# Step 2: A/A (4174 and 4183 both serve B), 2 pairs + 1 warmup
STREAM_COMPARE_URL_A=http://127.0.0.1:4174/test/stream-compare \
STREAM_COMPARE_URL_B=http://127.0.0.1:4183/test/stream-compare \
STREAM_COMPARE_ITERATIONS=2 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S pnpm perf:stream-compare
# Step 3: repeat N in {1,2}, S in the six scenarios below
STREAM_COMPARE_URL_A=http://127.0.0.1:4173/test/stream-compare \
STREAM_COMPARE_URL_B=http://127.0.0.1:4183/test/stream-compare \
STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S pnpm perf:stream-compare
# Step 3: ours vs Streamdown, repeat N in {1,2}
STREAM_COMPARE_URL=http://127.0.0.1:4183/test/stream-compare \
STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=$S pnpm perf:stream-compare
# tables
node .agents/.plans/stream-parity-fixes/evidence/004/summarize.mjs > summary.txt
```

## Step 1: new scenarios

Two scenarios added to `src/routes/test/stream-compare/+page.svelte`, 32
characters per frame, ~24 KB, both renderers:

- `loose-ordered-list` — one numbered list with a blank line between items
  (753 frames).
- `html-blocks` — alternating `<div class="note">` and `<details>` blocks
  with blank lines around markdown content, separated by paragraphs (751
  frames).

One iteration each on B: exit 0, parity 0 of 31 checks, zero page errors
(`step1-*.log`).

## Step 2: A/A control (B on both sides)

| Scenario      | A total | B total | Paired delta (median of 2) | Per pair       | Parity A / B | Hash / DOM    |
| ------------- | ------- | ------- | -------------------------- | -------------- | ------------ | ------------- |
| `prose-mixed` | 2,231   | 2,244   | −13.5 ms (−0.61%)          | −140.3, +113.3 | 0 / 0        | MATCH / MATCH |
| `long-list`   | 4,551   | 4,565   | −14.0 ms (−0.31%)          | +142.8, −170.8 | 0 / 0        | MATCH / MATCH |

Within ±10%.

## Step 3: paired A/B, median of 5 pairs (repeat 1 / repeat 2)

Total work, library flush and p95 in ms; delta = A − B (negative = B does
more work); over-budget = median frames over 16.7 ms.

| Scenario          | A total       | B total       | Paired delta (% of A)         | A lib flush   | B lib flush   | A p95       | B p95       | A over-budget | B over-budget | Parity A / B (checks per side) |
| ----------------- | ------------- | ------------- | ----------------------------- | ------------- | ------------- | ----------- | ----------- | ------------- | ------------- | ------------------------------ |
| `prose-mixed`     | 2,232 / 2,297 | 2,256 / 2,362 | +24 (+1.09%) / +33 (+1.43%)   | 175 / 178     | 184 / 188     | 4.7 / 5.0   | 5.0 / 5.1   | 0 / 0         | 0 / 0         | 0 / 0 (155)                    |
| `long-list`       | 4,166 / 4,382 | 4,334 / 4,199 | −199 (−4.77%) / +220 (+5.03%) | 2,083 / 2,176 | 2,122 / 2,074 | 7.8 / 8.7   | 8.8 / 8.1   | 0 / 0         | 0 / 0         | 0 / 0 (155)                    |
| `long-table`      | 1,862 / 1,811 | 1,894 / 1,897 | +37 (+1.99%) / −108 (−5.95%)  | 485 / 453     | 485 / 490     | 12.0 / 8.9  | 9.5 / 9.9   | 3 / 0         | 1 / 2         | 0 / 0 (65)                     |
| `long-code-fence` | 1,883 / 1,848 | 1,953 / 1,868 | −119 (−6.32%) / −26 (−1.41%)  | 114 / 117     | 125 / 119     | 4.1 / 3.7   | 4.1 / 3.9   | 0 / 0         | 0 / 0         | 0 / 0 (155)                    |
| `citations`       | 2,024 / 2,075 | 1,997 / 1,994 | +20 (+0.97%) / +101 (+4.87%)  | 259 / 259     | 249 / 253     | 4.5 / 4.7   | 4.6 / 4.7   | 1 / 1         | 0 / 0         | 0 / 0 (155)                    |
| `prefix-384kb`    | 950 / 944     | 877 / 1,011   | +98 (+10.34%) / −94 (−9.96%)  | 12 / 12       | 12 / 13       | 20.8 / 21.5 | 18.8 / 22.1 | 18 / 17       | 12 / 18       | 0 / 0 (15)                     |

Output hash MATCH and DOM projection MATCH A vs B on every scenario, both
repeats. Zero page errors.

Per-pair deltas (A − B, ms):

- `prose-mixed`: 476.7, −62.2, −23.8, 24.4, 52.2 / 216.9, 32.9, −142.1, −26.7, 113.2
- `long-list`: 258.3, −216.5, −314.4, −198.5, −49.4 / 197.4, 239.1, 362.5, 130.6, 220.2
- `long-table`: 37.0, 164.3, 76.6, 21.8, −51.4 / −107.7, −309.8, 189.1, −291.6, 113.5
- `long-code-fence`: −119.0, −123.4, 40.9, −70.2, −144.2 / −153.9, −44.5, 32.7, −26.1, 94.1
- `citations`: −129.3, −69.7, 19.6, 46.8, 28.5 / −118.2, 101.0, 107.7, 163.9, −67.0
- `prefix-384kb`: −57.4, 109.0, 98.2, −159.8, 139.5 / −106.8, 48.5, −94.0, −183.8, 116.3

Reading: the per-pair spread (±150–300 ms) is larger than any median delta,
and the A/A control shows the same spread with the same build on both sides.
The fixes add work only on documents that fall back to a full parse (CRLF,
an open HTML construct), and none of these six scenarios has that shape;
B's lib-flush medians differ from A's by at most 37 ms outside `long-list`
(+39 / −102 ms there, opposite directions). No attribution run was made because the "worse by more
than 3% in both repeats" STOP did not fire.

Against evidence 014 (cross-capture, drift expected): B totals are higher
than 014's "ours" on `prose-mixed` (2,256–2,362 vs 1,797–1,932),
`long-list` (4,199–4,334 vs 3,501–3,625), `long-table` and
`long-code-fence`, but A — the pre-fix build — is equally higher in the same
session, and the Streamdown side below is also higher than in 014
(`prose-mixed` 2,728 vs 2,266–2,333). The paired comparisons are the
comparable quantity.

## Ours vs Streamdown (B, repeat 1 / repeat 2)

| Scenario             | Ours total    | Theirs total    | Paired delta (theirs − ours) | Ratio theirs ÷ ours | Ours p95    | Theirs p95  | Ours over-budget | Theirs over-budget | Ours lib flush | Parity (checks) | Output comparable (length ratio) | DOM projection                      |
| -------------------- | ------------- | --------------- | ---------------------------- | ------------------- | ----------- | ----------- | ---------------- | ------------------ | -------------- | --------------- | -------------------------------- | ----------------------------------- |
| `citations`          | 1,967 / 2,046 | 1,845 / 1,757   | −74 / −289                   | 0.94 / 0.86         | 4.4 / 4.7   | 3.4 / 3.5   | 1 / 1 of 753     | 0 / 0              | 250 / 276      | 0 / 0 (155)     | yes (1.025)                      | `links.length: ours 258 · theirs 0` |
| `prose-mixed`        | 2,248 / 2,227 | 2,728 / 2,728   | +481 / +434                  | 1.21 / 1.23         | 5.0 / 4.9   | 5.4 / 5.8   | 0 / 0 of 765     | 0 / 0              | 189 / 183      | 0 / 0 (155)     | yes (1.019)                      | MATCH                               |
| `loose-ordered-list` | 4,334 / 4,425 | 10,896 / 10,770 | +6,600 / +6,345              | 2.51 / 2.43         | 10.8 / 9.6  | 26.2 / 26.1 | 4 / 1 of 753     | 306 / 293          | 2,193 / 2,164  | 0 / 0 (155)     | yes (1.013)                      | MATCH                               |
| `html-blocks`        | 3,686 / 4,007 | 2,352 / 2,401   | −1,317 / −1,622              | 0.64 / 0.60         | 12.6 / 13.2 | 5.0 / 5.1   | 6 / 9 of 751     | 0 / 0              | 1,970 / 2,020  | 0 / 0 (155)     | **NO (1.268)**                   | MATCH                               |

Per-pair deltas and per-run over-budget counts are in `summary.txt`.

- `citations` and `prose-mixed` ratios are in the ranges evidence 014
  published (0.85–0.97 and 1.21–1.26); the compare page's "about 1.2–2.7x
  less work on prose" still holds.
- `loose-ordered-list` behaves like `long-list` (one open list re-lexed per
  frame): 2.43–2.51x less work, 1–4 frames over budget vs 293–306.
- `html-blocks` is **not like-for-like**. svelte-streamdown without its
  `renderHtml` option (the bench does not set it) renders every `html` token
  as escaped text (`&lt;div class="note"&gt;`, checked in the final DOM), so
  it builds no `<div>` / `<details>` elements; the runner flags the output
  length mismatch. On our side, a document that ends inside an open
  `<div>` / `<details>` stays on the full-parse path until the closing tag
  arrives (`hasHtmlSpanMismatch` in `incremental-parser.ts`), which is why
  its library flush (~2,000 ms) is ~10x `prose-mixed`'s. DOM node counts at
  the end: ours 856, theirs 686.

## Files

- `step1-{loose-ordered-list,html-blocks}.log` — Step 1 single-iteration
  runs (full output including JSON).
- `aa-control-{prose-mixed,long-list}.{log,json}` — Step 2.
- `ab-run-{1,2}-<scenario>.{log,json}` — Step 3 paired A/B.
- `vs-streamdown-{1,2}-<scenario>.{log,json}` — Step 3 ours vs Streamdown.
- Each `.log` starts with `uptime` and the UTC start time, runs up to and
  including `=== JSON ===`, then the exit code and `uptime` at the end; the
  `.json` is the JSON tail.
- `summarize.mjs`, `summary.txt` — the tables above.
