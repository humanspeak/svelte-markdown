# User-controlled soft fade and rise trial

Planned at: `a8d8741`
Date: 2026-10-08
Executor: Sol, T3 codex/gpt-6.1-sol
Status: READY

## Executor instructions

Implement only in the isolated streaming-text-motion-resume worktree. Parent is guard and does not edit source. Do not modify plans/guard records, commit, push, open a PR, stop the review server, touch unrelated branches/stashes/worktrees, or delegate further. Full-access runtime permits real testing. Use Trunk for lint/format, never raw Prettier/ESLint.

> Revision 2026-10-08: User explicitly requests the same lift/fade trial in FadeWords, with the attached RiseWords settings 3px/.4s lift/.5s fade. Existing RiseWords trial is verified at b2cd6f9 and inherited; this round only adds the FadeWords consumer option and targeted coverage. Re-baselined to a8d8741, with no intervening source drift. Existing library defaults and the original trials remain unchanged.

## Why this matters

The user still dislikes whole-word effects and asks about a fade/rise mix. RiseWords already combines opacity and vertical movement on one timeline. This trial lets the user compare separate timings on the actual review page: a smaller, quicker lift with a slightly longer fade. It is an aesthetic experiment, not a claim that the known formatting-remount snap or preview-throttling concern has been solved.

## Scope

- Root `src/routes/streaming-motion/+page.svelte`, and a private route-local component if helpful.
- Focused regression additions to `tests/streaming-motion.test.ts` or a separate comparison-page test.
- No library/core/public API/default preset changes, dependencies, source buffering, raw producer changes, docs redesign, or continuity scope implementation. The separate public continuity-scope proposal remains pending; this user request does not approve it.

## Implementation contract

1. Keep the current four comparison panes and unchanged source, baseline, raw word/fragment delivery, 100/50ms pacing, default .18 preset duration, and presets.
2. Retain the existing RiseWords trial and add an independently selectable, clearly labeled matching custom soft fade/rise option in the FadeWords pane. Both page toggles default off; existing preset behavior remains available. No new pane or library preset changes. Give the FadeWords toggle a distinct accessible name so existing RiseWords tests/controls remain unambiguous.
3. New FadeWords trial starting values are the user's screenshot: 3px lift, .4s lift duration, .5s fade duration. Reuse the same private SoftFadeRise rendering, easing, and capped stagger as the RiseWords trial. Keep its controls independent of RiseWords and global preset duration. Expose lift distance, lift duration, and fade duration for FadeWords, with accessible pane-scoped controls. Preserve RiseWords source defaults and existing tests; parent will restore its user-selected screenshot values after reload for the live comparison.
4. Use the existing consumer override/headless API and public optional Motion API. If per-segment rendering is needed to retain batch stagger, use the existing segment snippet and keep whitespace literal, baseline/revealed content visible, and each grapheme intact. No replay of revised/settled content. Preserve the trial's support for disabled/system reduced motion.
5. Keep normal preset duration control semantics unchanged and clearly indicate the trial uses its separate controls. Retain accessible controls, mobile layout, and exact content in all panes. Avoid selector collisions that alter existing E2E behavior.
6. Retain all 90 existing browser checks. Add focused FadeWords coverage for actual intermediate opacity/positive rise/settlement, exact text and visible baseline, disabled/reduced motion, and independence from RiseWords settings. Verify both can use 3px/.4s/.5s simultaneously. Scope locators rather than weakening assertions when two trial forms are visible. Preserve can->can't continuity, reusable Range recorder, and the 400ms gate. Use lightweight probes.

## Done criteria

- Full contribution diff stays in scope, existing library source/defaults and raw producer unchanged.
- New trial behavior verified in Chromium and WebKit plus existing motion E2E suite across configured projects. Existing default tests still use default presets, not the trial.
- Trunk fmt/check and root pnpm check pass. No full unrelated unit/coverage run needed for a route-only consumer experiment.
- Live URL <http://127.0.0.1:5260/streaming-motion> remains accessible, ready for parent to select the trial and replay after verification.
- Parent will select both trials at the user's screenshot values 3px/.4s/.5s for live review after checks; do not make them library defaults or secretly persist animation preferences.
- Report exact parameters, commands/results, and limitations. User must judge smoothness on this page; do not declare subjective acceptance or claim the formatting-remount defect fixed.

## STOP conditions

- Need library/public API/dependency changes, producer grouping/buffering, or test gate relaxation.
- Unexpected drift in in-scope files from baseline; report rather than overwrite.
