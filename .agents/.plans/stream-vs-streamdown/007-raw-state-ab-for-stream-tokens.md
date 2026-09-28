# Plan 007: One-variable A/B — hold `streamTokens` in `$state.raw`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 6318f73..HEAD -- src/lib/SvelteMarkdown.svelte scripts/stream-compare-bench.mjs`
> If the file changed since this plan was written, compare the "Current
> state" excerpt against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

> **Revision 2026-09-28 (guard pre-flight):** Plan 006 landed (`be3b3d7`):
> the runner already has paired mode, parity, DOM projection and the new
> scenarios, but NOT two-URL A/B support — Step 1 applies. `main` does not
> contain the harness, so "A = main" is wrong: A is the batch branch tip
> WITHOUT this plan's change, served from a separate git worktree
> (`git worktree add /tmp/svm-ab-a <HEAD SHA>`, `pnpm install --frozen-lockfile`,
> `pnpm build`, `pnpm preview --host 127.0.0.1 --port 4173 --strictPort`);
> B is this checkout with the change on port 4183. Compare against the
> clamped Plan 006 baseline in the batch README, not the pre-clamp numbers
> quoted below. Baseline re-stamped to `6318f73`.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 006 (paired protocol + attribution)
- **Category**: perf
- **Planned at**: commit `6318f73`, 2026-09-28 (amended; original `7dea763`)

## Why this matters

`streamTokens` is declared as a deep `$state` proxy, yet the component's own
invariant (#291) says it is only ever replaced wholesale. Deep proxies make
every read of a previous token during the flush — `reuseStableTokenArray`
deep-compares hundreds of nodes — go through proxy traps, and the render
reads every token through them again. In Node, the same parse + reuse +
metadata work costs 0.66 ms per frame on 24 KB prose and 1.95 ms on the long
list; the browser's flush measure reports ~1.8 ms and ~6 ms. The proxy is the
leading hypothesis for the gap, but it is a hypothesis: this plan tests it
with a single-variable A/B under the paired protocol from Plan 006 and keeps
the change only if it wins and every reset/replace path stays correct.

Expected if the hypothesis holds: `libraryFlushMsMedian` on `prose-mixed`
1,254–1,428 → ≤ 800 and on `long-list` 4,504–4,582 → ≤ 2,500, with total work
down by roughly the same amount. If it does not move, the plan is REJECTED
with numbers and the attribution from 006 decides the next target.

## Current state

`src/lib/SvelteMarkdown.svelte:135-141`:

```ts
// Invariant (#291): only ever reassign this array wholesale — never
// push/splice/index-write/shrink it in place. See the rationale comment
// in applyStreamingSource before touching any write site.
let streamTokens = $state<Token[]>([])
```

Write sites (all wholesale assignments): line ~190
(`streamTokens = canReuse ? reuseStableTokenArray(...) : newTokens`), ~274 and
~316 and ~478 (`streamTokens = []`), ~287 (`streamTokens = [...nextSource]`).
Read sites: ~190 (previous array passed to reuse) and ~546 (`rawTokens` derived).

`asyncTokens` (line ~503) is also deep `$state`; it is OUT of scope here (one
variable per A/B; the async path is not benchmarked).

Precedent: `src/lib/renderers/Image.svelte:41-42` uses `$state.raw`.
Svelte 5.57 installed.

Correctness paths that must be exercised after the change (all covered by
existing tests — run them explicitly): `resetStream()` / `streamId` change
(`src/lib/SvelteMarkdown.test.ts`, `src/lib/utils/streaming*.test.ts`,
`src/lib/test/streaming/StreamIdRaceHarness.svelte`), offset-mode replacement
writes (`writeChunk({ value, offset })` tests), options/extension change mid
stream (`hasStreamingParserConfigChanged` path), HTML collapse on `</details>`
(#291 tests in `src/lib/SvelteMarkdown.issue-291*.test.ts` or
`streaming-reuse-repro.test.ts` — locate with `grep -rln "291" src/lib/*.test.ts`),
and array-source streaming (`streamTokens = [...nextSource]`).

Conventions and commands: see Plan 006.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                                                                       | Expected                 |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Typecheck     | `pnpm check`                                                                                                                                                                                                  | 0 errors                 |
| Full tests    | `pnpm test`                                                                                                                                                                                                   | all pass, coverage ≥ 90% |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                                                              | `✔ No issues`            |
| Build A       | on `main`: `pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                                                                                                             | preview up               |
| Build B       | on the branch: same, port `4174`                                                                                                                                                                              | preview up               |
| Paired bench  | `STREAM_COMPARE_URL_A=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_URL_B=http://127.0.0.1:4174/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare` | see Step 1               |

## Scope

**In scope**:

- `src/lib/SvelteMarkdown.svelte` (the declaration and its invariant comment only)
- `scripts/stream-compare-bench.mjs` (Step 1: A/B URL support, if 006 did not add it)
- `.agents/.plans/stream-vs-streamdown/evidence/007/` (create)
- `.agents/.plans/stream-vs-streamdown/README.md` (status row)

**Out of scope**: `asyncTokens`; any other change in `SvelteMarkdown.svelte`;
`Parser.svelte`; the parser and reuse utilities.

## Git workflow

- Work on `perf/stream-bench-flush-timing` (batch branch); the reviewer commits.
- Commit: `perf(streaming): hold stream tokens in $state.raw`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Same-build A/B support in the runner (if missing)

If Plan 006's runner does not already accept two URLs, add
`STREAM_COMPARE_URL_A`/`STREAM_COMPARE_URL_B`: when both are set, the runner
opens two pages (one per URL) in ONE browser and treats them as the two
"renderers" (`svelte-markdown@A`, `svelte-markdown@B`) with the paired
alternating order. Reuse the existing summary/parity code.

**Verify**: with two previews up (both `main`), `STREAM_COMPARE_ITERATIONS=2 STREAM_COMPARE_SCENARIO=prose-mixed`
→ paired delta within ±10% of zero (no change → no difference).

### Step 2: Pin the wholesale-replacement invariant (green guard)

Add to `src/lib/SvelteMarkdown.issue-328.test.ts` a test that streams three
paragraphs, captures the `<p>` nodes, appends a fourth, and asserts the first
three are the same DOM nodes and a fourth exists. It passes today and must
still pass after Step 3. (There is no red-first test for a pure perf change;
the guard plus the full suite is the correctness net.)

**Verify**: `pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts` → pass.

### Step 3: The one-line change

`let streamTokens = $state.raw<Token[]>([])`, and extend the invariant
comment: "`$state.raw` enforces this — in-place mutation is not reactive, so
every write site MUST reassign." Confirm no in-place mutation:
`grep -n "streamTokens\.\(push\|splice\|pop\|shift\|unshift\|sort\|reverse\|length\)" src/lib/SvelteMarkdown.svelte` → no output.

**Verify**: `pnpm check` 0 errors; `pnpm test` all pass, including the
reset/offset/options/HTML-collapse suites listed in Current state.

### Step 4: Paired A/B measurement

Preview A = pre-change branch tip (separate worktree) on 4173, preview B = this checkout with the change on 4183. Run the paired A/B
for `prose-mixed`, `long-list`, `citations`, `prefix-384kb` with 5 iterations,
1 warmup, twice. Record `totalWorkMsMedian`, `libraryFlushMsMedian`,
`p95WorkMsMedian`, `parityMismatches`, and the paired delta. Then run the
attribution script from 006 on B for `prose-mixed` and `long-list` and
compare bucket shares with the 006 baseline.

**Verify**: parity mismatches 0 on both A and B; results archived under
`evidence/007/` with a README (environment, commands, tables).

### Step 5: Decide

- Keep if B's `totalWorkMsMedian` is lower than A's in both repeats on
  `prose-mixed` and `long-list` by at least 5%, with no scenario worse by more
  than 3%. Record the deltas in the README status row.
- Otherwise revert Step 3, mark the plan REJECTED with the numbers, and record
  which attribution bucket dominates (input for Plans 010/011).

Final gate either way: `pnpm check`, `trunk fmt && trunk check --fix`,
`pnpm test`.

## Test plan

- No red-first behavioral test (pure perf change with an explicit invariant).
- Step 2 DOM-identity guard.
- Full suite, explicitly including reset/offset/options-change/HTML-collapse
  and array-source streaming tests.

## Done criteria

- [ ] Decision recorded in README status row with paired deltas (kept or REJECTED)
- [ ] If kept: `grep -n "\$state.raw<Token\[\]>" src/lib/SvelteMarkdown.svelte` matches; `grep -n "\$state<Token\[\]>" src/lib/SvelteMarkdown.svelte` does not
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0
- [ ] `evidence/007/README.md` archived with parity = 0
- [ ] No files outside scope modified

## STOP conditions

- Any existing test fails after Step 3 — something relies on deep reactivity;
  report which and revert.
- Parity mismatches > 0 on B.
- The A/A control in Step 1 shows a paired delta beyond ±10% — the machine is
  too noisy; report and do not draw conclusions.

## Maintenance notes

- If kept, future in-place mutation of `streamTokens` silently stops
  rendering; the Step 2 guard and the comment are the tripwires.
- `asyncTokens` can get the same treatment in its own A/B if the async path
  is ever benchmarked.
