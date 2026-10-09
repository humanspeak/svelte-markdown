# Guard report — 008 semantic-token-equality

**Recommendation: PASS** — every done criterion reproduced green on the snapshot; the comparator now compares every render-affecting field and the parser bug the plan surfaced is fixed under the amended Step 2b.
**Reviewed at** 6892589 · 2026-09-28 06:03 · **Plan planned at** f470a91 (amended 2026-09-28; original 7dea763)
**Integrated** — no PR: batch convention is one branch → one PR at batch close (dispatch overlay). Snapshot commits `f470a91` (comparator + tests) and `6892589` (Step 2b) sit on `perf/stream-bench-flush-timing`.

## Done criteria

| Criterion                                                             | Result         | Evidence                                                                                                                                          |
| --------------------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` 0 errors; `pnpm test` exits 0 with the new tests passing | met            | `COMPLETED 1202 FILES 0 ERRORS 3 WARNINGS`; `Test Files 160 passed`, `Tests 1167 passed`; lines 98.5%, branches 93.01%, functions 98.21%          |
| Chunked reference-URL parity test passes (red at `f470a91`)           | met            | in the 1167 passing; guard reproduced the red at f470a91 (`root 0 for "See [ref].\n\n[ref]: https": expected false to be true`) before the fix    |
| `grep "if (a === b) return true"` fast path present                   | met            | `streaming-token-reuse.ts:82`                                                                                                                     |
| `grep "typeof .* === 'function'"` functions never equal               | met            | 1 match in `streaming-token-reuse.ts`                                                                                                             |
| No files outside scope modified                                       | met            | `git diff --stat f470a91..HEAD -- <in-scope>` shows only `incremental-parser.ts` (+40/−2); snapshot f470a91 touched only the three in-scope files |
| README status row updated                                             | met (by guard) | this commit                                                                                                                                       |

## Spirit

The plan's purpose was to make token equality a sound basis for widening reuse. The new `isSemanticallyEqual` compares type/raw/text first, then every own enumerable field recursively, treats null-safe arrays element-wise, and refuses to equate functions or class instances — a conservative contract with a same-object fast path. The nine formerly-equal cases (href, title, image src, depth, ordered/start, checked, lang, attributes, displayMode) now compare unequal; the no-false-diff guard over a 30-root mixed document passes, so prefix reuse is not weakened. Execution also exposed that the plan's "masked today" claim was false on one path: a definition whose URL streams in chunks never re-lexed its citing paragraph. That is fixed in `appendTouchesReferenceDefinition` (`incremental-parser.ts:291-320`), and the after-every-chunk parity test pins it. Spirit met; the batch's parity contract is closer, not just its checklist.

## Scope & conduct

- In-scope only: yes (three files at f470a91; one file at 6892589; executor did not touch plan/README/guard files).
- STOP conditions respected: yes. The first executor stopped on the red parity test without weakening it; the fix executor found the plan's exact snippet broke two pinned bookkeeping tests and adjusted the implementation, not the tests, as the plan instructs — order of checks (new-definition scan first), skip appends beginning with a line break, and a helper to stay under the lint complexity limit. Guard read the diff: each deviation is sound (an append starting with `\n` cannot change the boundary line).
- Plan amendments: 2026-09-28 — scope widened to `incremental-parser.ts` for Step 2b after a pre-existing stale-href bug surfaced; rationale in `008-semantic-token-equality.guard.md` checkpoint 1.

## Residual risk / follow-ups

- A definition title continued on the NEXT line (`[ref]: /a` then `\n"T"`) is not detected once the title line is the boundary line; rare in model output. Add to Plan 009's characterization set.
- `hasNewReferenceDefinition` (standalone default for `canUseTailWindow`) still uses new-match-only detection; `update()` passes the corrected flag explicitly, so the hot path is correct. Plan 011 touches that area — keep the parity test as the tripwire.
- Executor worktree was created from `main` (307b548), not the batch tip; the executor read the plan via `git show`. Future dispatches on this batch run in the working tree or verify the worktree base first.
