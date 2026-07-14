# Guard log — 011 unify-token-reuse-identity

## Checkpoint 1 — 2026-07-13 16:14 — PLAN AMENDED

pre-execution · baseline amendment before dispatch; no executor work exists yet

- Trigger: 011's drift check (`eed2e08..HEAD` over the three in-scope source files) fires on `src/lib/SvelteMarkdown.svelte` — 10 changed lines, all from this batch's own landed work (plan 002's three reset-site swaps via PR #364 plus two operator-approved invariant comments). `incremental-parser.ts` and `streaming-token-reuse.ts` are byte-identical since `eed2e08` (guard-verified with `git diff --stat`).
- Classification: plan defect, not executor drift — the plan itself anticipated this ordering ("Land 002 first too"), so the stale baseline is expected reality the plan must re-stamp, and there is no executor whose work could be at fault.
- Operator approval: explicit ("Yes amend it"), 2026-07-13.
- Amendment (all in `011-unify-token-reuse-identity.md`): drift-check and STOP-condition baseline `eed2e08` → `e8940c5`; `Planned at` re-stamped; the `SvelteMarkdown.svelte:184-186` assignment refs updated to `:188-190` (guard verified the excerpt content still matches live code at the new lines); revision note added under the executor-instructions block, including a pointer to the new replace-never-shrink invariant at the `streamTokens` declaration. Batch README dependency note updated to record the re-baseline.
- Standard resisted: no done criterion, scope boundary, or STOP condition was weakened — only the baseline SHA and line references moved to match merged, guard-verified work.
- Action: amendment committed on `plans/011-rebaseline` for PR to main (skip-publish); 011 must not be dispatched until it merges, so the executor reads the amended plan.

## Checkpoint 2 — 2026-07-13 18:59 — ON TRACK

35d38d0 · executor halted at a reported STOP mid-step-3; guard snapshot-committed the uncommitted fold work in worktree `/private/tmp/svelte-markdown-plan-011-e10bfcc` (branch `advisor/011-unify-token-reuse-identity-e10bfcc`), then reproduced and diagnosed the STOP

- Steps 1–2 verified green by guard: the 5 issue-#331 repro cases exist and pass at the snapshot (`pnpm test:only src/lib/utils/streaming-reuse-repro.test.ts` → 5/5); at step-2 commit 481bc55 all four affected suites pass (118/118, re-run by guard in the review worktree).
- STOP reproduction at 35d38d0: `pnpm test:only` → 14 failed / 957 passed across 4 files — `SvelteMarkdown.issue-328.test.ts` ×8, `SvelteMarkdown.redraw-regression.test.ts` ×3 (plan 001's harness: Parser-count 2→0 expected, DOM identity `title-1`≠`title`), `SvelteMarkdown.test.ts` ×2, `ShikiCode.test.ts` ×1. STOP conditions 2 (redraw-regression fails) and 3 (#328 render-metadata prefix-skip fails) both fired; the executor halted instead of adjusting expectations — exactly what the plan requires.
- Diagnosis (guard's analysis): the step-3 fold severs token identity at Svelte 5's reactive-proxy boundary. Old code merged in proxy space — `reuseStableStreamingTokens(streamTokens, …)` read previous tokens out of `$state` `streamTokens`, so the reused prefix entries were the same proxy objects the WeakMap render metadata (`SvelteMarkdown.svelte` `tokens` derived), keyed each blocks, slugger prefix-skip, and `parsed()` consumers were keyed on. Parser-side reuse returns raw (never-proxied) objects — the parser's own chain is intact (`incremental-parser.ts:512` caches the returned array unclosed) — but `streamTokens = newTokens` wraps a fresh array whose child reads mint fresh proxies, so every WeakMap lookup misses and every keyed row remounts each flush. Evidence: every identity assertion fails as "serializes to the same string" (deep-equal, not reference-equal); slug spy 0→12/1→17/4→50; stateful slugger yields `intro-1` where static render yields `intro`; unchanged Shiki block re-highlights ×6; large-doc test times out (O(document) re-render per flush).
- Scope audit clean: executor contribution (`git diff e10bfcc...35d38d0`) touches only the six in-scope files; `SvelteMarkdown.redraw-regression.test.ts`, plan files, and guard log untouched. No criterion gamed — the repro tests assert real identity, and the executor did not weaken any baseline.
- Classification: plan defect suspected, not executor drift — step 3's literal prescription ("`streamTokens = newTokens` unconditionally") conflicts with a real constraint (proxy-space identity) the plan's own STOP condition 3 anticipated. The plan's intent (one identity predicate, generic child walk — both delivered at step 2 and green) is achievable; the collapse-to-unconditional-assignment part is what needs rework.
- Action: reported to operator with amendment options; no plan edit without explicit agreement. Executor work stays parked at 35d38d0, unmerged.

## Checkpoint 3 — 2026-07-13 19:34 — PLAN AMENDED

follows checkpoint 2 · step-3 amendment, operator-approved ("Go ahead"), applied on `plans/011-guard-checkpoint-2`

- Amendment (all in `011-unify-token-reuse-identity.md`): Step 3 rewritten from fold-into-`update()` to "parser decides identity, component merges in proxy space" — `update()` keeps returning raw tokens plus `divergeAt`/`canReuse` (renames permitted), and the component keeps a single proxy-space call to the step-2 `reuseStableTokenArray`. Done criterion "unconditional `streamTokens = newTokens`" replaced with "no identity logic in the component beyond one call to the shared merge; the predicate exists in exactly one function used by both call sites". Step-4 grep narrowed to the genuinely dead pre-plan names (`reuseStableStreamingTokens`, `hasSameStableNodeIdentity`). STOP condition 3 reworded to be design-agnostic and records that it fired once. Revision 2026-07-13 #2 note added under the executor-instructions block with resume instructions (revert guard snapshot `35d38d0`, keep history); `Planned at` annotated (drift baseline stays `e8940c5`; executor's own branch commits are expected in the drift diff). Superseded-goal marker added to the `Why this matters` collapse sentence. Batch README: 011 row → IN PROGRESS, amendment note added.
- Rationale: plan defect confirmed per checkpoint 2 — the prescribed collapse is unachievable under Svelte 5 proxy identity semantics (evidence in checkpoint 2). The plan was wrong about reality; the work faithfully implemented the wrong prescription.
- Standard resisted: the quality bar is unchanged — all done-criteria commands, the 5 repro cases, the #333 generic-walk test, plan 001's unmodified harness, and all STOP conditions remain in force. Only the mechanism prescription moved; #331's one-rule and #333's generic-walk intents are unaffected (both already delivered at `481bc55`).
- Action: amendment committed on `plans/011-guard-checkpoint-2` for PR to main; executor should not resume step 3 until it merges, so it reads the amended plan.

## Checkpoint 4 — 2026-07-13 19:48 — PLAN AMENDED

follows checkpoint 3 · operator-approved editorial consolidation of the same amendment, found uncommitted in the working tree on `plans/011-guard-checkpoint-2` and committed by guard

- Change: the checkpoint-3 amendment restated cleanly rather than layered — title, `Why this matters`, `Scope`, `Git workflow`, `Step 4`, and maintenance notes now describe the amended design directly (parser decides identity, component merges in proxy space; `reuseStableTokenArray` rename; resume-by-revert instructions), replacing the superseded-marker prose.
- Guard verification before commit: done criteria and STOP conditions byte-untouched by this edit; no scope boundary, verification command, or quality gate weakened; all sections consistent with the amended Step 3 and the checkpoint-3 record.
- Action: committed on `plans/011-guard-checkpoint-2` as the authoritative amendment text.

## Checkpoint 5 — 2026-07-13 20:08 — ON TRACK

17ebf6b · post-resume checkpoint against `advisor/011-unify-token-reuse-identity-e10bfcc`; tree clean, nothing to snapshot — the branch tip is the snapshot

- Resume followed the amended plan exactly: `72a8736` is a byte-pure revert of guard snapshot `35d38d0` (guard-verified: `git diff 481bc55 72a8736` empty, history preserved); `37387cd` renames the merge to `reuseStableTokenArray` with a temporary alias and keeps the component's conditional proxy-space call; `17ebf6b` migrates the tests and removes the alias.
- Done criteria re-run by guard, all green: `pnpm check` → 0 errors; `pnpm test:only` → 971/971 (includes the 5 #331 repro cases, plan 001's redraw-regression harness, issue-328, and Shiki suites — the 14 checkpoint-2 failures are gone); `trunk fmt && trunk check` → no issues; `grep -rn "reuseStableStreamingTokens\|hasSameStableNodeIdentity" src/lib` → clean.
- One predicate, both call sites: `incremental-parser.ts:591` (`if (!isSameStableNode(prev, next)) break`, old inline raw/html-shape check deleted) and `streaming-token-reuse.ts:36,111`; predicate defined once at `streaming-token-reuse.ts:63`. `divergeOffset` accounting and reference-sensitivity logic byte-untouched by the contribution diff.
- #333 criterion genuinely asserted, not gamed: `streaming-token-reuse.test.ts:238-244` walks an `extension` token's `customChildren` (non-enumerated key) and asserts the changed child is NOT over-reused while the stable sibling keeps identity.
- Scope audit clean: contribution (`git diff e10bfcc...17ebf6b`) touches five in-scope files only; `SvelteMarkdown.redraw-regression.test.ts`, plan files, and guard log untouched. `src/lib/index.ts` never exported the removed internals.
- Open item: done criterion "batch README status row updated; #331/#333 noted resolved-pending-merge" is not yet satisfied — the README is currently stewarded on `plans/011-guard-checkpoint-2` (rows at e10bfcc on the executor branch would conflict); reconcile at final/merge rather than having the executor touch it now.
- Action: reported to operator — work is faithful to the amended plan and gate-complete except the administrative README row; ready for `guard final` (close-out report + PR) once the plans branch merges.

## Checkpoint 6 — 2026-07-14 07:19 — ON TRACK (final: PASS)

378e6e1 · `guard final` close-out on `plans/011-guard-checkpoint-2`; tree clean, nothing to snapshot — gates re-run at `213761c`, `378e6e1` adds only the README status row

- All done criteria reproduced green on the final tip: `pnpm check` 0 errors; `pnpm test:only` 971/971; `trunk fmt && trunk check` no issues; stale-name grep clean; drift check (`e8940c5..HEAD`, in-scope source) shows exactly the executor's three source files; redraw-regression harness diff 0 lines; origin/main unmoved at `e10bfcc`.
- README row closed out by guard (`378e6e1`): 011 → DONE, #331/#333 resolved-pending-merge — the last open criterion from checkpoint 5.
- Close-out report written: `011-unify-token-reuse-identity.guard-report.md` — **PASS**.
- Integration: branch pushed (`-u origin plans/011-guard-checkpoint-2`), PR opened via the `pr` skill: <https://github.com/humanspeak/svelte-markdown/pull/368> (base `main`, closes #331/#333). Merge is the operator's call; guard stops here.

## Checkpoint 7 — 2026-07-14 08:50 — ON TRACK

7d2e91c · post-final CI remediation: PR #368's Trunk check failed with 4 new `@typescript-eslint/no-redundant-type-constituents` findings in `streaming-reuse-repro.test.ts` (the `$lib`-aliased `Token` resolves as an error type in CI's typed lint, flagging every union/intersection containing it — not reproducible locally, where type resolution works)

- Remediation authored by a Codex rescue agent acting as executor, operator-directed; guard authored no source. Fix reshapes the four `Token`-in-type-operator positions to the sibling suite's structural `StreamingTestNode` + cast-helper convention (`node`/`nodes`), matching `streaming-token-reuse.test.ts`.
- Guard verification before commit: diff read in full — one file only, every repro assertion byte-preserved (identity `toBe` checks, link/br expectations intact); `pnpm test:only src/lib/utils/streaming-reuse-repro.test.ts` → 5/5; `trunk check` on the file → no issues. Snapshot committed as `7d2e91c` and pushed to PR #368.
- The final PASS verdict is unaffected: this changes test-type plumbing only, no source or assertion semantics. Awaiting CI green on the PR; batch close-out (`599c184`) rides the same PR.
