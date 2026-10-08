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

## Checkpoint 3 — 2026-10-06 — ON TRACK

54eff01 · final correction review (base ea7b900)

- Full175-line correction diff read, sole design output changed. Prior nine-section alternatives/routing/ownership/dataflow contract retained; factual overgeneralization corrected throughout Evidence, Compiler integration and D7.
- Independently extracted the exact runnable Probe4 from the report into /tmp/hybrid-003-guard-attrs.mjs and ran it on Node26. Outputs match all A/B/C token, Svelte and htmlparser2 observations. Prior classification/reference/nested marker probes remain valid; source unchanged.
- rg lists all nine required headings; Trunk report check one file/no issues; diff whitespace check passes. Snapshot hooks also pass. No full runtime gates needed for this design-only contribution.
- PASS: static Text-only first slice, broader nested-static/compiled routing, and future general binding analysis are explicit separate stages. Existing compiled-island is unchanged control;005 scope is accurately described. Sanitizers and typed props ownership are explicit, no authoring delimiters/runtime lexing proposed.
- Limitations: no DOM/SSR/hydration of proposed routing; Probe2 is a sketch requiring CASES input, disclosed in executor report; Probe4 is directly executable. No performance/mdsvex parity claim. Future routing needs a separately approved plan and D1-D7 choices.
- Mark003 DONE; preflight004: only in-scope drift since e6195d0 is six README lines from verified001. Hybrid source/tests/fixture unchanged. Rebaseline004 to54eff01 with dated note preserving all gates/scope/routing policy; dispatch004 next. No push/PR.
