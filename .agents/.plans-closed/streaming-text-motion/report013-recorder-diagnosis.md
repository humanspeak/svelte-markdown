# Recorder diagnosis — 2026-10-07

Snapshot unchanged: `2495bbf`. Round013 made no tracked edits.

Sol's controlled experiment isolates repeated DOM Range allocation in the
per-frame recorder as the cause of the observed delay. A reusable Range keeps
all semantic, continuity, grapheme and 400ms assertions intact. No library fix
is justified by this evidence; perceived motion quality remains separate.

Parent read full `/tmp/motion013-report.md` and its diagnostic harness, then
independently reproduced original versus reusable Range on mobile Safari,
using the same compiled page, actual defaults, source and cadence:

| Measurement                   | Original recorder | Reusable Range |
| ----------------------------- | ----------------: | -------------: |
| Max frame gap                 |            601 ms |          50 ms |
| FadeWords settling age        |            409 ms |         186 ms |
| RiseWords settling age        |            409 ms |         186 ms |
| FadeCharacters settling age   |            539 ms |         326 ms |
| FadeCharacters unreadable age |            440 ms |         219 ms |
| Exact text vs plain           |               yes |            yes |

Commands: `ORIGINAL=1 MODES=full BROWSERS=mobile-safari REPEATS=1` with
`node /tmp/motion013.cjs`, then same with `REUSERANGE=1`, both using additional
compiled preview at port5270. Logs `/tmp/motion013-parent-original.log` and
`/tmp/motion013-parent-reuse.log`. Parent stopped only that additional preview;
5260/8260 remain untouched. Mutation timing/engine internals are an inference,
but independent Range reuse removes the measured backlog without source changes.

Next authorized bounded correction: allocate one Range per recorder, reuse it
for exact offsets, release it at recorder completion. Preserve all assertions,
thresholds, timeouts, retries and configuration. Run all60 motion E2E cases across
all5 projects, then parent snapshot/reproduction. No core/docs/dependency edits,
PR or push. Current motion review is not yet a final PASS.
