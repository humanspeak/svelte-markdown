# Guard report — 005 Svelte scope/root placement

**Recommendation: PASS** — authored snippet scope and supported root metadata survive preprocessing.

**Reviewed at:**22cd4dc ·2026-10-06 · **Planned at:**410cc72

| Done criterion                   | Guard evidence                                                                                                                                                                                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real SSR/client snippet scope    | Independent baseline SSR throws greeting ReferenceError and22cd4dc renders Hello. Focused tests cover parameterized before/forward declarations separated by Markdown, data props, client updates and nested declaration scope.                                |
| Root placement/options           | Window/head/document/body compile for both targets; tests assert SSR head title/client document.title and resize updates. Runesfalse compiles both/SSR; unsupported options explicitly rejected. Native invalid placement/duplicates/top-level const retained. |
| No declaration/root marker       | Exact extraction fields and nested token traversal assert only actual render marker; independent window/head/options probes return empty source/islands and root slices.                                                                                       |
| Existing composition/zero lexing | Runtime fixture now gets load-greeting from authored snippet across Markdown/table. Existing refs/bold/typed props/callbacks/conditional/renderer switching and zero Lexer spies retained and pass.                                                            |
| Production browser               | 10 passed across Chromium/Firefox/WebKit/mobile Chrome/mobile Safari,2 each JS-disabled SSR and hydrated behavior; fresh production assets and empty diagnostics.                                                                                              |
| Gates                            | Focused60/4; full1470/168; coverage97.36stmt/92.88branch/98.31fn/98.61line. Types0 errors/3 baseline warnings; Trunk65 files/no issues; build/package/publint pass.                                                                                            |
| Scope/whitespace/report          | Full five-file diff read, scoped whitespace check passes, no out-of-scope source edits. Verbatim005-executor-report.md preserved, limitations/deviations explicit.                                                                                             |

The tests exercise actual compiled lexical bindings, rather than accepting
compiler output that still references an unbound greeting. Minimal token-document
runtime tests isolate generated scope; the real MarkdownDocument path is covered
by Vitest fixture and production SSR/hydration browser tests. Nested declarations
are not hoisted out of their parent. Unknown/unsupported root node types fail.

The small svelte: autolink masking exception enables root elements that CommonMark
otherwise masks as links. It is a necessary in-scope correction, not broader HTML
routing. Only runes is supported in root options; other options fail explicitly.
Top-level const/self reject native-invalid placement; new declaration tags reject
as unsupported. Those conservative decisions match the plan's classification
and explicit unsupported-policy requirements; no scope expansion needed.

Limits: TS syntax in template expressions/snippet parameters remains unsupported;
legacy runesfalse lacks a client runtime assertion. Generated-name collisions and
004's regex heuristic are untouched. Root/declaration source slices retain order
within their groups and emit before the generated document; arbitrary side-effect
ordering across relocated root metadata and rendered islands is unproven.
No styles/maps/HMR/nested-Markdown/package-entry implementation or full parity
claim.003 HTML routing remains an advisory design, unimplemented.

Verification logs: /tmp/hybrid-005-guard-focused.log, unit.log, types.log,
trunk.log, build.log, browser.log with the same /tmp/hybrid-005-guard- prefix.
All final gates exited0; no retry needed. Own preview4173 stopped;8237 untouched.

Integration: source snapshot22cd4dc,005 DONE. All batch plans PASS; conductor
will archive their plans/reports. No guard-authored source, push or PR.
