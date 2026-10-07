# Plan 001 — subtle RiseWords tuning

Planned at: `6fa18d4`, 2026-10-07.

## Why this matters

User finds RiseWords promising and asks for a small smoothing adjustment.
FadeCharacters already feels smooth to them. Improve the explicitly imported
RiseWords preset without changing plain/core behavior or either fade preset.

## Executor instructions and scope

Sol is executor; parent remains guard. No commits, PR, push or .agents edits.
Preserve the worktree, unrelated branches/stashes and live5260/8260 servers.

Try reducing rise travel from6px to4px and a gentle cubic-bezier easing
`[0.25, 0.1, 0.25, 1]`. Keep duration0.18s and existing capped batch stagger.
Treat this as a small visual tuning candidate, not a claim of universal preference.
Consumers retain complete initial/animate/transition overrides and baseline,
revision and initial-content opt-ins. Passing transition still replaces defaults.
Do not merge defaults into explicit consumer overrides or add a spring/queue.

Allowed: src/lib/streaming/motion/MotionText.svelte and RiseWords.svelte as needed,
presets.test.ts; tests/streaming-motion.test.ts for a meaningful rise-motion
regression; root streaming-motion page and docs StreamingMotionDemo only to make
the actual tuned defaults visible while preserving consumer duration controls;
README and existing docs streaming guide to describe adjusted RiseWords defaults.
No parser, provenance, helper, dependency, config or fade-preset changes.

## Done criteria

- Smaller rise and gentle easing actually apply to streamed arrivals; no extra
  reflow, baseline replay, opacity reset or whitespace/Unicode loss.
- FadeWords/FadeCharacters keep their prior default props and timing.
- Consumer initial/animate/transition overrides still replace preset choices.
- At default duration the review page uses actual preset defaults; the docs demo
  reflects tuned RiseWords easing even while its duration is adjustable.
- Meaningful unit test for rise tuning plus override preservation; existing
  preset tests pass. All60 motion E2E pass across five projects with unchanged
  400ms guard, assertions and configuration. Add only a useful rise regression.
- Root/docs checks, Trunk fmt/check, build/package and bundle isolation pass.
  Parent independently reproduces; no full unrelated E2E repeat needed absent
  a failure or core change. Coverage gates unchanged.
- Inspect actual motion in collaborative preview and describe before/after
  practical difference honestly. Keep review pages available for the user.

## STOP conditions

Need to change parsing/segmentation/transport, consumer override semantics,
fade presets or dependencies; repeated gate failures; loss of baseline identity
or exact text. Diagnose and report rather than relaxing assertions.
