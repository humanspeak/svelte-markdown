# User-controlled soft fade and rise trial

Planned at: `12af1de`
Date: 2026-10-08
Executor: Sol, T3 codex/gpt-6.1-sol
Status: READY

## Executor instructions

Implement only in the isolated streaming-text-motion-resume worktree. Parent is guard and does not edit source. Do not modify plans/guard records, commit, push, open a PR, stop the review server, touch unrelated branches/stashes/worktrees, or delegate further. Full-access runtime permits real testing. Use Trunk for lint/format, never raw Prettier/ESLint.

## Why this matters

The user still dislikes whole-word effects and asks about a fade/rise mix. RiseWords already combines opacity and vertical movement on one timeline. This trial lets the user compare separate timings on the actual review page: a smaller, quicker lift with a slightly longer fade. It is an aesthetic experiment, not a claim that the known formatting-remount snap or preview-throttling concern has been solved.

## Scope

- Root `src/routes/streaming-motion/+page.svelte`, and a private route-local component if helpful.
- Focused regression additions to `tests/streaming-motion.test.ts` or a separate comparison-page test.
- No library/core/public API/default preset changes, dependencies, source buffering, raw producer changes, docs redesign, or continuity scope implementation. The separate public continuity-scope proposal remains pending; this user request does not approve it.

## Implementation contract

1. Keep the current four comparison panes and unchanged source, baseline, raw word/fragment delivery, 100/50ms pacing, default .18 preset duration, and presets.
2. Add an explicit checkbox or similarly simple control to switch only the RiseWords pane between its current preset behavior and a clearly labeled custom soft fade/rise trial. Default remains the existing preset. Avoid adding another pane or silently modifying FadeCharacters/FadeWords.
3. Trial starting values: 2px lift, 140ms lift duration, 240ms fade duration; opacity 0 to 1, vertical displacement to 0. Use a gentle decelerating lift easing and a simple fade easing. Expose lift distance, lift duration, and fade duration as independent, labeled controls when the trial is selected. These settings are consumer choices, not new library defaults. Changing them must affect the actual trial.
4. Use the existing consumer override/headless API and public optional Motion API. If per-segment rendering is needed to retain batch stagger, use the existing segment snippet and keep whitespace literal, baseline/revealed content visible, and each grapheme intact. No replay of revised/settled content. Preserve the trial's support for disabled/system reduced motion.
5. Keep normal preset duration control semantics unchanged and clearly indicate the trial uses its separate controls. Retain accessible controls, mobile layout, and exact content in all panes. Avoid selector collisions that alter existing E2E behavior.
6. Add meaningful browser coverage: selecting the trial produces actual intermediate opacity plus a positive rise of at most the selected distance, both settle; baseline stays visible; independent controls affect timings/distance; disabling motion yields exact text. Do not weaken existing motion assertions, can->can't continuity, reusable Range recorder, or the 400ms gate. Choose focused assertions without loading the page with a heavy observer.

## Done criteria

- Full contribution diff stays in scope, existing library source/defaults and raw producer unchanged.
- New trial behavior verified in Chromium and WebKit plus existing motion E2E suite across configured projects. Existing default tests still use default presets, not the trial.
- Trunk fmt/check and root pnpm check pass. No full unrelated unit/coverage run needed for a route-only consumer experiment.
- Live URL <http://127.0.0.1:5260/streaming-motion> remains accessible, ready for parent to select the trial and replay after verification.
- Report exact parameters, commands/results, and limitations. User must judge smoothness on this page; do not declare subjective acceptance or claim the formatting-remount defect fixed.

## STOP conditions

- Need library/public API/dependency changes, producer grouping/buffering, or test gate relaxation.
- Unexpected drift in in-scope files from baseline; report rather than overwrite.
