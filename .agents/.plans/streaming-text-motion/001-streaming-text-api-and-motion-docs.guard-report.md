# Streaming text motion — final guard report

Verdict: **NO-PASS** (2026-10-07). Implementation snapshot: `c731780`.

## Delivered

Default core rendering stays unchanged. Streaming text tracking and the headless
StreamingText helper are explicit opt-ins. FadeWords, RiseWords and FadeCharacters
are isolated in streaming/motion, using optional Motion ^2.0.1-0. Consumer snippets
and Motion props control presentation. README, runnable docs, Unicode/revision/
remount/lifecycle tests and packaging proofs are included. Motion's whitespace
fix and the can' → can't segmentation correction were independently verified.

## Parent verification

| Gate                        | Result                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Source snapshot hooks       | Passed Trunk formatting/lint and root types                                                                  |
| Full unit/coverage          | 1,564 tests, 169 files; 97.52/92.70/97.89/98.27%                                                             |
| Docs types                  | Zero errors, one existing CSS warning                                                                        |
| Build/publint               | Passed in full E2E server bootstrap                                                                          |
| Core/preset tree shaking    | Passed                                                                                                       |
| Normal npm no-peer consumer | Core/root/headless succeed; presets require Motion                                                           |
| Preset/ledger tests         | 31 passed                                                                                                    |
| Interactive docs            | Three presets, custom path, disabled plain output, Unicode, controls and restart pass; captured errors empty |
| Full E2E                    | Failed heading scenario; no feature test failures in log                                                     |

Logs: /tmp/streaming-guard-unit.log, /tmp/streaming-guard-docs.log,
/tmp/streaming-guard-tree.log, /tmp/streaming-guard-e2e.log.
The first parent E2E bootstrap attempt had a temporary-config cwd error, fixed
in /tmp before the actual full test run. All configured projects were retained.
Parent preview navigation initially timed out under concurrent test load;
subsequent snapshot and actual interactions succeeded.

## Blocking evidence

`tests/heading-metadata.test.ts:4` on Chromium expected
`scenario=parse-heading-heavy-done`, but `perf-stats` stayed `scenario=idle`
after its click. The assertion timed out after five seconds. The test is
unchanged, but a baseline defect has not been established. Sol's two prior
full runs each had one unchanged failing test: mobile Safari issue-192 image
URL (isolated rerun passed), then mobile Chrome heading stream scenario.
Verbatim executor reports 007 and 008 record those results and 15 passing
feature E2E cases across five projects.

The parent runner finished with **614 passed, one failed**. Its
preview child remained alive after execution; parent terminated only that
port-4260 process, retaining exit 1. No claim of a clean full-suite pass is made.

Seven added root Svelte warnings describe deliberate synchronous initial-prop
reads for opt-in SSR baseline seeding; lifecycle updates remain effect-driven.
Three earlier root warnings remain. Sol observed two derived_inert warnings
during rapid docs resets; parent captured no runtime errors during interactions.
These are limitations recorded for review, not suppressed diagnostics.

## Next action

Diagnose the heading interaction against baseline and obtain a clean full E2E
run, with separate approval if a fix must cross this plan's scope. Then rerun
the failed gate and update this report. Acceptance criteria and coverage remain
unchanged. No PR, push or merge; batch stays active. Stash is retained.
