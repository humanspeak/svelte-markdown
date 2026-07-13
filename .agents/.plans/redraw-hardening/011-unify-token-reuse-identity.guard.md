# Guard log — 011 unify-token-reuse-identity

## Checkpoint 1 — 2026-07-13 16:14 — PLAN AMENDED

pre-execution · baseline amendment before dispatch; no executor work exists yet

- Trigger: 011's drift check (`eed2e08..HEAD` over the three in-scope source files) fires on `src/lib/SvelteMarkdown.svelte` — 10 changed lines, all from this batch's own landed work (plan 002's three reset-site swaps via PR #364 plus two operator-approved invariant comments). `incremental-parser.ts` and `streaming-token-reuse.ts` are byte-identical since `eed2e08` (guard-verified with `git diff --stat`).
- Classification: plan defect, not executor drift — the plan itself anticipated this ordering ("Land 002 first too"), so the stale baseline is expected reality the plan must re-stamp, and there is no executor whose work could be at fault.
- Operator approval: explicit ("Yes amend it"), 2026-07-13.
- Amendment (all in `011-unify-token-reuse-identity.md`): drift-check and STOP-condition baseline `eed2e08` → `e8940c5`; `Planned at` re-stamped; the `SvelteMarkdown.svelte:184-186` assignment refs updated to `:188-190` (guard verified the excerpt content still matches live code at the new lines); revision note added under the executor-instructions block, including a pointer to the new replace-never-shrink invariant at the `streamTokens` declaration. Batch README dependency note updated to record the re-baseline.
- Standard resisted: no done criterion, scope boundary, or STOP condition was weakened — only the baseline SHA and line references moved to match merged, guard-verified work.
- Action: amendment committed on `plans/011-rebaseline` for PR to main (skip-publish); 011 must not be dispatched until it merges, so the executor reads the amended plan.
