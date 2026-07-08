# Guard close-out report — 006 heading-id-slugger-snapshot

**Verdict: PASS** · Reviewed at `50d4ddc` (source snapshot) · branch `advisor/006-heading-id-slugger-snapshot` · base `main` (merge-base `a926055`) · PR **[#348](https://github.com/humanspeak/svelte-markdown/pull/348)** · 2026-07-08

## What the plan asked for

Streaming heading-id dedup was O(H·N): each append-only flush re-seeded a fresh `github-slugger` by replaying `slug()` over **every** prior heading before the stable-prefix boundary. Plan 006's _Why this matters_ requires making it **O(tail)** — snapshot the slugger's mutable `occurrences` map at the divergence boundary and restore it instead of replaying — as a **pure performance change: output must be identical**.

## What was delivered

`src/lib/utils/render-metadata.ts` now maintains a parallel `preparedHeadingSnapshots` array (`{offset, occurrences-clone}` per prepared heading, captured right after each heading is slugged). On an append-only pass `restorePreparedHeadingSluggerSnapshot` restores `slugger.occurrences` from the last in-prefix snapshot and carries the prefix headings forward **without re-slugging them** (their ids stay in the `headingIds` WeakMap); only the divergent tail is slugged. `replayPreparedHeadingPrefix` preserves the original replay path as the fallback.

## Done criteria — all reproduced in-tree at `50d4ddc` (not trusted from a report)

| Criterion                                                                      | Result                                                                                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` exits 0                                                           | ✅ 0 errors (4 pre-existing/unrelated warnings)                                                                                 |
| `pnpm test:only` exits 0; #328 heading tests + new equivalence test pass       | ✅ **944/944**, 145 files                                                                                                       |
| Chunked duplicate-heading ids byte-identical to single-shot (asserted by test) | ✅ `matches static duplicate heading ids…` asserts `['intro','intro-1','intro-2','intro-3']` **and** `chunkedIds === staticIds` |
| Replay loop no longer re-slugs every prior heading on the fast path            | ✅ restore path replaces the loop; three scan-count guards enforce it (`0`/`1`/`4` slug calls, was `12`/`17`/`50`)              |
| No files outside the in-scope list modified                                    | ✅ only `render-metadata.ts` + the in-scope test file + README + guard artifacts                                                |
| README row 006 updated; #337 noted resolved-pending-merge                      | ✅ flipped `TODO → DONE`; #337 annotated; PR `Closes #337`                                                                      |
| `trunk fmt && trunk check`                                                     | ✅ clean on all changed files                                                                                                   |

## Why this is a genuine PASS, not a rubber-stamp

- **Not gamed — went green by the source fix.** `git diff c0f5fdc..50d4ddc -- src/lib/SvelteMarkdown.issue-328.test.ts` is **empty**: the tests are byte-identical to the red-phase commit. The `0`/`1`/`4` assertions now hold purely because `render-metadata.ts` changed. No `.skip`/`.only`/`todo` in the file.
- **Output equivalence proven, not asserted.** Every pre-existing #328 heading test (drift, dedup order, `headerPrefix`, custom-renderer id, large streamed doc, nested/top-level dedup, duplicate-dedupe-stable) still passes with unchanged expected ids → STOP condition "any #328 heading test changes its expected ids" not tripped.
- **Performance intent delivered, not approximated.** The scan-count guards show the O(H·N) replay signature `50` collapse to `4` — the plan's O(tail) goal, measured by `slug()` call count rather than a flaky timer.
- **Correctness rests on the fallback, exactly as the plan required.** `restore` returns false — deferring to full replay — on signature mismatch, any undefined/mismatched prefix offset, or a missing snapshot. The `occurrences` internal is typed (`Slugger['occurrences']`), not guessed past, satisfying the github-slugger STOP condition. The plan's maintenance note asked a reviewer to confirm the fallback triggers on any non-append/boundary-mismatch pass — confirmed at `render-metadata.ts:391-416`.
- **Scope clean, plan untampered.** The +177/-16 source diff lands only on type defs, closure state, and the heading-id functions; out-of-scope helpers (`getSourceOffset`, `assignSequentialSourceKeys`, `assignSourceLessRootKeys`, `getStableRowKey`) are untouched. The plan file `006-…md` has no diff.

## Integration

Work committed at `50d4ddc` (+ red-phase tests `c0f5fdc`); PR **#348** opened into `main` (labels: performance, javascript, enhancement; assignee jaysin586). **Merging remains the operator's call.** On merge, GitHub will close **#337** via the PR's `Closes #337`.

## Residual notes for the merger

- The PR branch carries guard's own artifacts (`006-…guard.md`, this report) alongside the source — intended; they travel with the plan.
- Baseline drift: `Planned at 939f154` predates plans 003/004 landing, so `git diff 939f154..HEAD -- render-metadata.ts` is non-empty by design (batch README standing directive pins the SHA). Not a real drift — the Step-2 edit targets matched live code.
- This relies on a `github-slugger` internal (`occurrences`); if that package is upgraded, re-verify the field exists — the fallback replay is the safety net if it ever disappears.
