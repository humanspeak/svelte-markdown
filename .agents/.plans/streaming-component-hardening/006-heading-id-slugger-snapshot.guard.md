# Guard log — 006 heading-id-slugger-snapshot

## Checkpoint 1 — 2026-07-08 — ON TRACK (red-phase: failing tests verified)

Base `a926055` (merge-base with `main`, = branch HEAD before this snapshot) · branch `advisor/006-heading-id-slugger-snapshot` · scope of this checkpoint: **Step 1 equivalence guard + Step 3 scan-count guard tests only** (the red/TDD phase). No source change yet — expected; Step 2 (the `occurrences` snapshot/restore in `render-metadata.ts`) is not implemented. Snapshot committed via the `commit` skill as `c0f5fdc` (`test(render-metadata): add red tests for heading slugger snapshot (plan 006)`). First checkpoint.

Operator scope for this run: "we only created the red tests — make sure the tests hit what is required in the planning file." Judged the tests as a contract against plan 006, not the (not-yet-written) implementation.

**Reproduced in-tree** with `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → `3 failed | 19 passed (22)`. Only `src/lib/SvelteMarkdown.issue-328.test.ts` changed (the plan's designated test file — `render-metadata.test.ts` does not exist, so #328 is correct per Scope).

**The equivalence guard is GREEN — as the plan requires, not failing-first.**

- `matches static duplicate heading ids when duplicates stream across chunks` (`SvelteMarkdown.issue-328.test.ts:334`) passes. Asserts a chunked stream of duplicate `## Intro` headings — split across a paragraph, a blockquote (`> ## Intro`) and a nested level (`### Intro`) — yields ids `['intro','intro-1','intro-2','intro-3']`, byte-identical to `renderStaticHeadingIds(finalSource)`. This is exactly the plan's Step 1 equivalence guard, which explicitly must pass against today's replay code ("an equivalence guard, not a failing-first test"). It directly satisfies the Done criterion "heading ids for a chunked duplicate-heading stream are byte-identical to a single-shot parse." ✓

**The three scan-count guards fail on the batching assertion, not on setup/harness — genuine reds.**

Each spies `Slugger.prototype.slug` (the exact metric the plan's Step 3 names: "number of `slug()` calls per flush proportional to the tail"), renders with `streaming: true`, writes a heading-dense prefix, `mockClear()`s after the prefix flush, then appends and asserts tail-proportional slug counts:

- **`does not re-slug stable prefix headings when appending non-heading text`** (`:352`) — 12-heading prefix, append non-heading text → `expect(slug).toHaveBeenCalledTimes(0)`, **got 12** (`:373`). Encodes O(tail) with an empty tail ⇒ 0 slugs; today's replay re-slugs all 12 prefix headings.
- **`slugs only the newly appended heading after a stable heading prefix`** (`:377`) — 16-heading prefix, append `## Tail` → `expect(slug).toHaveBeenCalledTimes(1)` **got 17** (`:398`), plus `headingIds(container).at(-1)` === `'tail'`. Pins tail=1 **and** the correctness of the new id, so it cannot be gamed by merely suppressing slug calls.
- **`keeps slugger work proportional to newly appended headings across repeated flushes`** (`:402`) — 10-heading prefix, then 4 single-heading appends → `expect(slug).toHaveBeenCalledTimes(4)` **got 50** (`:425`). The `50` is the exact O(H·N) replay signature (11+12+13+14 as the prefix grows each flush), collapsing to `4` once snapshot/restore lands.

**Not false-reds.** Each test's setup phase runs to the assertion (real integer counts `12`/`17`/`50`, not `undefined`/throw), so the harness plumbing the tests depend on — `render` + `component.writeChunk`, `flushStreamingBatch`, the new `buildDuplicateHeadingSource`, and `vi.spyOn(Slugger.prototype, 'slug')` with `try/finally` `mockRestore()` — all resolve. The failures isolate the missing snapshot/restore optimization, nothing else. 19 pre-existing #328 tests unaffected.

**Coverage vs plan.** Maps onto the plan's Test plan: Step 1 equivalence (the core guard, green) + Step 3 scan-count scaling guard (three reds). Two notes in the executor's favor:

- Step 3 was **optional** in the plan; the executor implemented it, and did so with deterministic call-counting rather than the timing-based test the plan explicitly warned would be flaky — the right choice.
- The three reds make the Done criterion "the replay loop no longer re-slugs every prior heading on the fast path" — which the plan only asked to check by "grep/inspection" — **test-enforced**. A strengthening, not drift.

**Scope clean, plan untampered.** Only `src/lib/SvelteMarkdown.issue-328.test.ts` modified (in scope). No source (`render-metadata.ts` untouched — replay loop at `render-metadata.ts:314-322` still live, `occurrences` snapshot absent), no plan file, no README edit. Plan file untampered. README row 006 still `TODO` — correct: the README flip + `pnpm check`/`pnpm test:only`/lint green gates are green-phase Done criteria, not due at the red phase.

**Baseline note for the next (green) checkpoint — not a red-phase problem.** The plan's drift check (`git diff --stat 939f154..HEAD -- src/lib/utils/render-metadata.ts`) is non-empty (11 lines) — but that is plan 004's table-body-cell source keys (`render-metadata.ts:248-261`), which landed after `Planned at 939f154`, not a change to the heading path. Per the batch README standing directive, `Planned at` stays pinned; the excerpt Step 2 edits (`assignPreparedHeadingIds`, the `for (const heading of preparedHeadingNodes)` replay loop, `seedHeadingSlugger`) still match live code — only line numbers shifted (plan cites `294-316`; live is `305-327`). STOP condition: before implementing, the executor must confirm the installed `github-slugger` exposes a mutable `occurrences` object under that name (`node_modules/github-slugger`); if not, report rather than guess.

Verdict: **ON TRACK.** The red tests are genuine, fail for the right reason (missing `occurrences` snapshot/restore), and faithfully encode plan 006's intent — the equivalence guard passes exactly as the plan prescribes, and the scan-count guards pin O(tail) slug work while also asserting id correctness. A sound foundation for Step 2. Next gate is the green implementation checkpoint (re-run all Done criteria: `pnpm check`, full `pnpm test:only` incl. these three going green _by the source fix, not by weakening the tests_, `trunk fmt && trunk check`, README row 006 flip, #337 noted resolved-pending-merge), then `guard 6 final` as the integration gate. No PR at this checkpoint (not `final`; work is red by design).
