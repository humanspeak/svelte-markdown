# Continuity checkpoint — NO-PASS

Date: 2026-10-08
Snapshot: `c4db374`

The requested smoothness fix is incomplete. Sol017 correctly stopped without source edits because independent consumer effects lack persistent ownership across rawtext remounts. A shared provenance registry alone would not guarantee effect isolation.

Parent independently reproduced two failing browser regressions against current source at port 5260: emphasis completion snaps all three presets to opacity 1 and RiseWords to y=0 while their entrances are active. Parent also reproduced 50 passing existing unit tests. Successful baseline reproduction is evidence of the defect, not a successful implementation verdict.

Full Sol017 report: `/tmp/streaming-motion-sol017-report.md`. Parent logs: `/tmp/motion017-guard-regression.log`, `/tmp/motion017-guard-unit.log`.

Next action: resolve a concrete opt-in owner design and supported timing-transfer path, then revise scope if selected and route implementation through Sol. Preserve raw streaming and all consumer overrides; do not hide the failure through source buffering. A passing continuity regression plus unchanged existing gates will establish mechanical repair; live user review must still establish acceptable smoothness.

No source changes, PR, push, or batch close. Horizontal formatting reflow and preview throttling are separate unresolved concerns.

## Sol018 design verification

Parent independently rebuilt the isolated owned-MotionValue proof against public exports. Both Chromium and WebKit preserved exact recorded rise and fade timelines through remount and a 40ms detached gap when values remained subscribed; all settled at their endpoints without page errors. Removing the owner subscription froze animations. Artifacts are in `/tmp/motion018-guard`.

The concrete opt-in proposal is `createStreamingMotionScope()` plus preset `scope`, with explicit cleanup and one persistent owner per effect. Support initially covers built-in targets and validated finite tweens. Unsupported custom targets, variants, springs, and other Motion configurations keep the original path without a remount continuity guarantee. Full proposal: `/tmp/streaming-motion-sol018-design.md`.

Public API expansion remains pending the operator's decision. The live-page fix is still NO-PASS; isolated proof does not satisfy integrated gates or user visual acceptance. No source changes have landed.
