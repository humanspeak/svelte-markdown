# Guard report — 003 HTML routing

**Recommendation: NO-PASS** — two contradictions prevent a reliable implementation handoff.

**Reviewed at:** 9b0614d · 2026-10-06 · **Planned at:** e6195d0

The report meets the nine-section, alternatives, routing matrix, sanitizer ownership,
no-delimiter and no-runtime-lexing requirements. AST and structured-token probes
were independently reproduced against installed packages. Trunk report check and
git diff --check pass. The sole contribution is the design artifact; no source,
dependencies, or executor-owned plan/index edits occurred.

To earn PASS:

1. Correct the false dependency on plan005 for general component binding analysis
   (report:336–340 and Deferred work).005 only handles snippet scope/root placement.
2. Align the proposed production red test (report:385–387) with the Text-only first
   slice (report:363–368). The current section contains compiled descendants and
   remains native in that slice; use a separately proposed eligible static fixture.
3. State the first slice's conservative descendant rule explicitly throughout,
   separate unchanged green controls from expected-red tests, and qualify unprobed
   attribute entity differences rather than stating them as established facts.

No performance or mdsvex parity claim is accepted. Nested marker token feasibility
is established; end-to-end rendering/hydration of the proposed routing is unbuilt.
The design remains advisory and does not authorize routing implementation.

Source snapshot9b0614d remains unmerged. Correction returns to the executor;
guard authored no design/source changes. No push/PR while the batch remains active.
