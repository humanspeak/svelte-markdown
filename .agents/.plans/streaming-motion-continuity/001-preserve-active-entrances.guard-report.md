# Continuity checkpoint — NO-PASS

Date: 2026-10-08
Snapshot: `c4db374`

The requested smoothness fix is incomplete. Sol017 correctly stopped without source edits because independent consumer effects lack persistent ownership across rawtext remounts. A shared provenance registry alone would not guarantee effect isolation.

Parent independently reproduced two failing browser regressions against current source at port 5260: emphasis completion snaps all three presets to opacity 1 and RiseWords to y=0 while their entrances are active. Parent also reproduced 50 passing existing unit tests. Successful baseline reproduction is evidence of the defect, not a successful implementation verdict.

Full Sol017 report: `/tmp/streaming-motion-sol017-report.md`. Parent logs: `/tmp/motion017-guard-regression.log`, `/tmp/motion017-guard-unit.log`.

Next action: resolve a concrete opt-in owner design and supported timing-transfer path, then revise scope if selected and route implementation through Sol. Preserve raw streaming and all consumer overrides; do not hide the failure through source buffering. A passing continuity regression plus unchanged existing gates will establish mechanical repair; live user review must still establish acceptable smoothness.

No source changes, PR, push, or batch close. Horizontal formatting reflow and preview throttling are separate unresolved concerns.
