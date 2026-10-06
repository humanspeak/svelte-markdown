# Guard report — 003 HTML routing

**Recommendation: NO-PASS** — one new factual overgeneralization needs correction.

**Reviewed at:** e153e79 · 2026-10-06 · **Planned at:** e6195d0

The original dependency and test-scope contradictions are fixed. Scope is solely
the design report; full correction diff read. All nine headings, scoped Trunk
check (one file, no issues) and git diff --check pass. No runtime checks required
for this design-only contribution. No source or dependencies changed.

Probe4 now claims the structured-token path always preserves raw entity strings.
Independent installed-API probes show two paths: a complete HTML block such as
a closed section with inline text gets decoded attributes through htmlparser2;
a blank-line-separated section gets raw entities through flat token pairing.
An unclosed opening section (the report's stated input) has no structured
attributes. Both closed source shapes are eligible Text-only Svelte nodes.

To earn PASS, correct Probe4 and its downstream Compiler integration/D7 claims
to distinguish those shapes and preserve rendered DOM behavior as unverified.
No source fix is authorized; this remains a design feasibility report. The
report's token probe sketch requires filling its CASES list, disclosed as a
verification limitation; AST/compile commands are directly runnable.

Snapshot e153e79 is committed; correction returns to Opus5.5. No push/PR while
the batch is active. Guard authored no design/source changes.
