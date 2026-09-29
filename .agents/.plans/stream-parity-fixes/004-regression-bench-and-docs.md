# Plan 004: Prove the parity fixes did not cost speed, and align the docs

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits.
>
> **Drift check (run first)**:
> `git diff --stat <Planned-at SHA>..HEAD -- src/lib docs/src README.md`
> No change is expected; anything else: STOP.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW
- **Depends on**: 001, 002, 003, 005, 006, 007, 008
- **Category**: perf (measurement) / docs
- **Planned at**: commit `<filled by reviewer at dispatch>`, 2026-09-29

## Why this matters

Plans 001–003 change the hottest decisions in the streaming parser: when the
tail window may be used, where it starts, and how definitions are detected.
The public comparison numbers and the 2.0 upgrade guide were measured before
them. This plan measures the same build before and after on the scenarios
most likely to move, confirms parity is still zero, adds the new failure
shapes to the benchmark's parity coverage, and updates the docs wording so
it states exactly what is now true.

## Current state

- Harness: `src/routes/test/stream-compare/+page.svelte`,
  `scripts/stream-compare-bench.mjs` (paired mode; same-build A/B with
  `STREAM_COMPARE_URL_A` / `STREAM_COMPARE_URL_B`),
  `scripts/stream-compare-attribute.mjs`. A/B recipe and load discipline:
  `.agents/.plans-closed/stream-vs-streamdown/evidence/007/README.md`.
- Final numbers the docs currently cite:
  `.agents/.plans-closed/stream-vs-streamdown/evidence/014/README.md`.
- Docs that describe streaming correctness:
  `docs/src/routes/docs/migration/v2/+page.svx` (section "Streaming output
  now matches a one-shot parse"), `docs/src/routes/docs/advanced/llm-streaming/+page.svx`,
  `docs/src/routes/docs/advanced/streaming-benchmarks/+page.svx`, `README.md`
  ("Upgrading to 2.0" and "LLM Streaming").
- The pre-fix tip for side A is commit `119cc58` (red tests only, no fixes).

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose    | Command                                                                                                                                                                                                                                    | Expected            |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------- |
| Side A     | `git worktree add /tmp/svm-ab-a-parity 119cc58` then in it `pnpm install --frozen-lockfile && pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                                                        | preview up          |
| Side B     | in this checkout `pnpm build && pnpm preview --host 127.0.0.1 --port 4183 --strictPort`                                                                                                                                                    | preview up          |
| Paired A/B | `STREAM_COMPARE_URL_A=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_URL_B=http://127.0.0.1:4183/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=<id> pnpm perf:stream-compare` | parity 0 both sides |
| Gate       | `pnpm check`; `trunk fmt && trunk check --fix`; `pnpm test`                                                                                                                                                                                | green               |

## Scope

**In scope**: `src/routes/test/stream-compare/+page.svelte` (new scenarios
only); `.agents/.plans/stream-parity-fixes/evidence/004/` (create);
`docs/src/routes/docs/migration/v2/+page.svx`,
`docs/src/routes/docs/advanced/llm-streaming/+page.svx`,
`docs/src/routes/docs/advanced/streaming-benchmarks/+page.svx`, `README.md`
(wording only, as specified in Step 4).

**Out of scope**: anything under `src/lib/`; `docs/src/lib/compare-data.ts`
except the one row named in Step 4 (if Step 3 shows a ratio in it is no
longer true, STOP and report).

## Steps

### Step 1: Add the new shapes to the benchmark

Add two scenarios to the bench page, same 32 characters per frame, ~24 KB:
`loose-ordered-list` (a numbered list with a blank line between items) and
`html-blocks` (repeated `<div>` / `<details>` blocks with blank lines around
markdown content, separated by paragraphs). Both exercise paths the fixes
changed and both must report `parityMismatches === 0`.

**Verify**: one iteration of each on side B: exit 0, parity 0, no page errors.

### Step 2: A/A control

With both previews serving the SAME build (side B twice, second on 4174),
run `prose-mixed` and `long-list` with 2 pairs. The paired delta must be
within ±10% of zero; if not, wait for load to drop and repeat.

### Step 3: Paired A/B

A = `119cc58`, B = this checkout. Check `uptime` before each run and wait if
the 1-minute load is above ~4. Run, twice each: `prose-mixed`, `long-list`,
`long-table`, `long-code-fence`, `citations`, `prefix-384kb`. Record total
work, p95, frames over budget, library flush, parity, and the paired delta.
Then run ours vs Streamdown (single URL, paired mode) for `citations`,
`prose-mixed`, and the two new scenarios.

**Verify**: parity 0 everywhere. No scenario is worse on B by more than 3%
in both repeats. Archive logs, JSON and a README under `evidence/004/`.

### Step 4: Align the docs

- `docs/.../migration/v2/+page.svx`, section "Streaming output now matches a
  one-shot parse": extend the bullet list with the shapes fixed in this
  batch (CRLF sources; numbered lists with blank lines; HTML blocks that
  contain blank lines; definitions inside blockquotes or lists, or with the
  URL or title on the next line; duplicate definitions). State that parity
  is enforced by a seeded fuzz suite over random chunk boundaries.
- `docs/.../llm-streaming/+page.svx` and `README.md`: where they say output
  is checked against a one-shot parse, mention the fuzz suite in one clause.
- `docs/.../streaming-benchmarks/+page.svx`: add the two new scenarios to
  the results table with the Step 3 numbers, and one caveat line: documents
  with CRLF line endings or an unclosed HTML tag are fully re-lexed on every
  update, trading speed for correctness.
- `docs/src/lib/compare-data.ts`, Streamdown entry, row `Incomplete Markdown`
  (decided by the maintainer, 2026-09-29): the row currently says both sides
  are equal; that overstates ours. Set `us: 'Shown as typed until it closes'`,
  `them: 'Repaired while streaming'`, and the note to: "Streamdown closes
  unfinished bold, code and links on the fly. We render exactly what has
  arrived, so markers show briefly until the closing one lands. Open code
  blocks render as code right away." Change no other row.
- `docs/.../streaming-benchmarks/+page.svx`, same caveat list: for every `red(`
  anchor still present in `src/lib/utils/incremental-parser.parity.test.ts`
  after plan 008, add one known-gap line in plain language (none present:
  add nothing). Example for the cut tag: add one known
  gap: an HTML tag cut before its closing bracket (`<div` with no `>`)
  followed by a blank line can differ from a one-shot parse until the
  bracket arrives.
- If any number in the docs changed by more than the ranges already printed,
  update it from Step 3; otherwise leave the published numbers alone.

**Verify**: `trunk check --fix` clean on the touched files; `cd docs && pnpm check`
reports 0 errors.

### Step 5: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`. Remove the A
worktree and stop the previews you started.

## Test plan

- No runtime library change; no red-first test. Verification is parity 0 in
  every run, the A/A control, and the paired deltas.

## Done criteria

- [ ] `evidence/004/README.md` with A/A control, paired A/B tables, ours-vs-Streamdown for four scenarios, load readings
- [ ] Parity 0 on every run; no scenario worse by more than 3% in both repeats
- [ ] Two new bench scenarios exist and run
- [ ] Docs wording updated as Step 4 specifies; docs check 0 errors
- [ ] `Incomplete Markdown` compare row corrected; no other compare row changed
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean
- [ ] No files under `src/lib/` modified

## STOP conditions

- Parity mismatch in any run (report scenario and `firstParityMismatch`).
- Any scenario worse on B by more than 3% in both repeats (report the
  numbers and the attribution for that scenario; do not edit docs).
- A ratio printed in `docs/src/lib/compare-data.ts` is no longer true.
- A/A control cannot be brought within ±10%.

## Maintenance notes

- The two new scenarios stay in the bench so later parser changes are
  measured on the shapes that were once wrong.
