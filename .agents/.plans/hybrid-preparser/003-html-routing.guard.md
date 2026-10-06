# Guard log — 003 HTML routing

## Checkpoint 1 — 2026-10-06 — DRIFTING

9b0614d · final review of Opus 5.5 contribution (base 5fae1e2)

- Scope: sole 437-line design report; full contribution read. Snapshot committed before judging. No source changes.
- Reproduced nine required headings, scoped Trunk check (one file, no issues), git diff --check, AST classification and build-time nested section/strong/reference/marker token shapes. Server compiler accepts undeclared Callout/UI.Card with zero warnings. Source reads confirm sanitizer enforcement, snippet dispatch and wrapper-dropping fallback.
- NO-PASS: report:336–340 and Deferred work incorrectly claim plan005 builds general instance/module binding analysis. Plan005 preserves authored snippet declarations and root metadata only. Future component binding analysis needs a separate plan; do not enlarge005.
- NO-PASS: report:363–368 excludes non-Text descendants from slice1, while test6:385–387 expects its existing compiled-island section (TypedCounter/expressions/if descendants) to route. Test6 must use an eligible text-only static section in a future fixture; current compiled-island stays a control until nested routing is separately implemented.
- Clarify slice1's conservative Text-only rule vs the broader matrix and label control test5 as already green. No runtime HTML routing is authorized by this design.
- Action: correction dispatch to same Opus5.5, scope only design report. Keep003 IN PROGRESS;004 blocked by dependency. No full suite rerun needed for design-only artifact.

## Checkpoint 2 — 2026-10-06 — DRIFTING

e153e79 · correction review (base031d0ff)

- Full315-line diff read; design-only scope, nine headings, Trunk report check and diff whitespace check pass. Original scope dependency and first-slice test contradictions are corrected.
- New Probe4 incorrectly generalizes attribute decoding: independent Node26 probe shows a complete single-block section yields decoded title/alt/q attributes; blank-line-separated section yields entity strings; an unclosed opening section yields no structured attributes at all. Both closed inputs qualify as Text-only Svelte elements.
- Concrete outputs: one-block section attributes title:'{', alt:'&', q:'"', hidden:''; blank-line-separated section title:'&#123;', alt:'&amp;', q:'&quot;', hidden:''. Current token-cleanup has both htmlparser2 expansion and flat-token regex pairing paths.
- NO-PASS pending precise correction to Evidence Probe4, Compiler integration and D7. Preserve the future DOM-fidelity decision; do not change source. Original general binding-analysis and nested-routing issues are now resolved.
- Action: focused final correction round to Opus5.5.003 remains IN PROGRESS;004 awaits PASS.
