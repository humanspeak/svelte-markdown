# Default motion timing checkpoint — 2026-10-07

Snapshot: `95b3b98`. Verdict: **NO-PASS** for motion review.

Parent read the complete two-file round012 diff and snapshot committed with
normal Trunk/types hooks. Core, dependencies, docs and existing stashes unchanged.
Tests now exercise real can-to-can't growth at exact source offsets, retained
nodes, intact graphemes, non-vacuous baseline checks, opacity continuity, and
default-duration replay. Comparison route uses actual preset defaults at 0.18s.

Executor reported 57 passed/3 failed with normal workers and 58 passed/2 failed
serially: default whole-word settling age exceeded 400ms in WebKit/mobile Safari.
Parent independently reran the two failing project cases serially: WebKit passed,
mobile Safari failed at the same line281 age assertion. Log:
`/tmp/streaming-motion-guard012-safari.log`. This variation plus large sampled
frame gaps leaves cause unresolved. Recorder repeatedly scans all spans, computes
styles and creates DOM Ranges for every span every frame; it may perturb timing.
The 400ms assertion remains unchanged. No library fix justified yet.

Next scoped investigation: measure recorder wall time/frame gaps and actual
animation activation timing; compare lightweight targeted/no-recorder runs with
the full recorder on Safari. Preserve text, continuity, disabled/reduced-motion
and animation assertions. Diagnose before changing implementation or gate.
No PR/push. Existing comparison page remains live for user review.
