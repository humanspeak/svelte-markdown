# Guard log

## 2026-10-08 — Sol019 final implementation checkpoint

Snapshot: `b2cd6f9`; verdict ON TRACK. Implementation gates PASS; live user review remains pending.

- Committed executor work through the commit skill after upstream safety check. Normal hooks passed Trunk fmt/check and root svelte-check. Read the full plan and all three changed files in the contribution diff from `ce029ff`.
- Scope: only root review route, private SoftFadeRise consumer component, and six added browser cases. Library source, public API, dependencies, baseline/source producer, 100/50ms pacing, default preset settings, and original test assertions unchanged.
- Trial uses existing RiseWords segment snippet and public MotionSpan: opacity 0→1 linear over .24s; y=2→0 easeOut over .14s; shared batch delay .02s capped .16s. Independent controls affect real property timelines. Whitespace remains literal and old content has initial=false.
- First parent full run: 89 pass, one original Chromium partial-word timing assertion failed at 416.6ms against unchanged 400ms limit. Exact text, baseline, graphemes, retained target nodes, and no-reset assertions passed. Preserved artifact `/tmp/soft-fade-rise-guard-first-timing-miss.json`; log `/tmp/soft-fade-rise-guard-e2e.log`.
- Parent reran full suite without source/assertion changes, using three rather than five simultaneous browser workers: all 90 passed across five projects. Default partial-word pending maxima were about 259–267ms. Log `/tmp/soft-fade-rise-guard-rerun.log`, results `/tmp/soft-fade-rise-guard-rerun-results`. Initial failure demonstrates timing sensitivity; reduced concurrency passing does not establish its exact cause.
- Parent inspected the root UI and selected the trial with 2px/.14s/.24s. Screenshot `/Users/jasonkummerl/.t3/userdata/browser-artifacts/browser-screenshot-127-0-0-1-muzshmx7-c2a6e094.png`. No subjective smoothness verdict from static screenshot or passing tests.
- Raw-formatting remount snap remains unresolved. No continuity-scope API approval or implementation. No PR/push, batch retirement, or user acceptance claimed.

## 2026-10-08 — PLAN AMENDED for matching FadeWords trial

Operator explicitly requests matching lift/fade in FadeWords and supplies 3px/.4s/.5s via screenshot. Re-baselined to `a8d8741` after confirming no source drift. Added independently selectable FadeWords consumer trial and targeted tests to the contract, preserving the existing RiseWords trial and all library defaults. The parent will restore screenshot settings in both panes after reload for live comparison. Public continuity-scope proposal remains outside this amendment.

## 2026-10-08 — Sol020 matching FadeWords checkpoint

Snapshot `e89f59d`; verdict ON TRACK. Implementation gates PASS; user visual review pending.

- Safe-upstream snapshot through commit skill, with normal Trunk fmt/check and root types passing. Read the complete revised plan and full two-file diff from `3541a9b`. No edits to library, dependencies, producer, original preset settings, or the reused private SoftFadeRise component.
- FadeWords independently opts into the same private consumer rendering, using starting values 3px/.4s/.5s. Article scopes and distinct checkbox label preserve control accessibility. Existing RiseWords defaults 2px/.14s/.24s remain unchanged in source; parent selects screenshot values for live comparison.
- Parent independently ran the full motion suite with three workers: 110 passed across five projects in 4.1m, including all 90 inherited cases. The original 400ms gate and assertions remain; recorded default partial-word maxima were about 261–272ms. Log `/tmp/fade-words-trial-guard-e2e.log`, results `/tmp/fade-words-trial-guard-results`.
- New assertions cover intermediate fade/lift, settlement, settings independence and matching simultaneous motion, exact text/baseline/Unicode, preset fallback, disabled/reduced motion, re-enabling, and retained partial-word entrances. The generalized test observer defaults to its original RiseWords target and remains lightweight.
- Live controls set in both panes to 3px/.4s/.5s before the final record commit; parent restores them after its reload. No global/public animation changes, source buffering, continuity-scope implementation, PR/push, or subjective smoothness acceptance.
