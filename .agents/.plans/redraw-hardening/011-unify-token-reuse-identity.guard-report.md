# Guard report — 011 unify-token-reuse-identity

**Recommendation: PASS** — one identity predicate now governs both call sites, the child walk is generic, and every done criterion was reproduced green by guard on the final tip.
**Reviewed at** `378e6e1` · 2026-07-14 07:19 · **Plan planned at** `939f154` (baseline `e8940c5`; step 3 amended 2026-07-13 at guard checkpoint 2)
**Integrated** — PR <https://github.com/humanspeak/svelte-markdown/pull/368> opened via the `pr` skill for the reviewed snapshot (`plans/011-guard-checkpoint-2` → `main`). All verification gates ran at `213761c`; `378e6e1` adds only the batch-README status row on an otherwise identical source tree.

## Done criteria

| Criterion                                                               | Result | Evidence                                                                                                                                                                                                                                                                  |
| ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` 0; `pnpm test:only` 0; `trunk fmt && trunk check` 0        | met    | Guard-run on final tip: `COMPLETED 1045 FILES 0 ERRORS`; `Tests 971 passed (971)`; trunk `✔ No issues` (both fmt and check)                                                                                                                                               |
| The 5 repro cases from issue #331 exist and pass                        | met    | `src/lib/utils/streaming-reuse-repro.test.ts` — 5 cases (2 happy-path, 3 suspected-bug, module called without the `canReuse` gate); included in the 971-pass run; also run standalone at checkpoint 5 (5/5)                                                               |
| A single identity predicate governs both call sites                     | met    | `isSameStableNode` defined once (`streaming-token-reuse.ts:63`); parser loop uses it at `incremental-parser.ts:591` (old inline raw/html-shape check deleted); merge uses it at `streaming-token-reuse.ts:36,111`                                                         |
| Generic child walk, no hard-coded key allowlist — asserted by #333 test | met    | Walk iterates all array-valued own properties incl. arrays-of-arrays (`streaming-token-reuse.ts:40-60`); `streaming-token-reuse.test.ts:238-244` asserts a `customChildren` (non-enumerated key) changed child is NOT over-reused while its stable sibling keeps identity |
| Component identity logic (amended criterion)                            | met    | `SvelteMarkdown.svelte` streaming path holds exactly one conditional proxy-space call to `reuseStableTokenArray`; no predicate or shape logic in the component                                                                                                            |
| No files outside the in-scope list modified                             | met    | `git diff e10bfcc...378e6e1 --stat`: five in-scope source files + guard-stewarded plan artifacts only; `SvelteMarkdown.redraw-regression.test.ts` diff is 0 lines; `src/lib/index.ts` never exported the removed internals                                                |
| Batch README row updated; #331/#333 noted resolved-pending-merge        | met    | `README.md` 011 row → "DONE (guard final PASS; #331/#333 resolved-pending-merge)" (`378e6e1`); PR body carries `Closes #331` / `Closes #333`                                                                                                                              |

## Spirit

The plan's north star was ending the situation where two disagreeing encodings of "same stable streaming node" let a token the parser called diverged be resurrected by the reuse module. That is structurally delivered: the parser's inline check is gone, both call sites consume one function, and a future rule change can only happen in one place. The #333 blind spot is closed the way the plan intended — recursion is derived from the data shape, not a per-type allowlist, and the new test proves an unknown-key child is no longer waved through. The one departure from the original text — reuse stayed component-side instead of folding into `update()` — was a guard-verified plan defect (Svelte 5 proxy identity), amended with operator approval before the executor resumed; the amended contract is what the final tree satisfies, and the "one owner, one rule" intent survives it intact.

## Scope & conduct

- In-scope only? Yes — contribution touches `SvelteMarkdown.svelte`, `incremental-parser.ts`, `streaming-token-reuse.ts`, and the three named test files; nothing else.
- STOP conditions respected? Yes — exemplary. Conditions 2 and 3 fired mid-step-3 (14 failures incl. plan 001's harness); the executor halted and reported instead of adjusting baselines. Resume was a byte-pure revert of the failed fold (`git diff 481bc55 72a8736` empty) followed by the amended approach.
- Plan amendments during execution: 2026-07-13 re-baseline `eed2e08`→`e8940c5` after 001/002 landed (checkpoint 1); 2026-07-13 step-3 rework to proxy-space merge after STOP (checkpoints 3–4). Both operator-approved; no done criterion, scope boundary, or STOP condition was weakened.
- History note: the executor's commits were rebased onto `plans/011-guard-checkpoint-2` (new SHAs `4abe06f`…`096b1b7`, fold+revert pair dropped); guard verified the rebased source tree byte-identical to the verified executor tip `17ebf6b` before carrying the verdict over, then re-ran all gates on the final tip anyway.

## Residual risk / follow-ups

- The unified predicate is stricter than the parser's old check (type equality, text fallback, deep child walk on all types). All 971 tests — including the Parser-count and DOM-identity tripwires — stay green, but any consumer relying on the old looser divergence behavior for exotic token shapes gets the safer (more-redraw) behavior, not the stale one. That is the intended direction.
- Reviewer focus per the plan's maintenance notes: `divergeOffset` accounting and reference-sensitivity logic are byte-untouched by the contribution diff (guard-verified); no action needed, listed for merge-reviewer awareness.
- The stale branches `advisor/011-unify-token-reuse-identity-e10bfcc` (tip `17ebf6b`, superseded by the rebase) and `advisor/011-unify-token-reuse-identity-v2`, plus the worktrees under `/private/tmp/svelte-markdown-plan-011-*`, can be deleted after merge.
- Issues #331 and #333 close automatically on merge via the PR body.
