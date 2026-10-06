# Guard report — 003 HTML routing

**Recommendation: PASS** — a feasible staged routing contract is specified, with unbuilt behavior and maintainer decisions explicit.

**Reviewed at:**54eff01 ·2026-10-06 · **Planned at:**e6195d0

| Done criterion              | Result and independently observed evidence                                                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nine sections               | rg lists Goals, Evidence, Routing matrix, Alternatives, Recommended contract, Compiler integration, Verification strategy, Open decisions, Deferred work.                                                                     |
| Syntax/ownership matrix     | Sixteen categories cover static/custom HTML, components/member names, expression/spread/directive attributes, snippets, expressions, blocks, special tags, nesting, Markdown and CMS; props and sanitizer ownership explicit. |
| Alternatives/recommendation | Three design alternatives compared plus rejected runtime parsing; recommends staged AST-classified renderer routing.                                                                                                          |
| Evidence/unknowns           | Local installed AST, server compiler, structured token/reference/nested marker observations reproduced; exact runnable Probe4 matches all A/B/C outputs on Node26. End-to-end routed DOM/SSR/hydration explicitly unverified. |
| Quality                     | Scoped Trunk check one file/no issues; git diff --check passes; snapshot precommit formatting/lint/types pass.                                                                                                                |
| Scope                       | Entire original report and all correction diffs read; executor changes only003-html-routing-design.md, no source/dependencies/plan/index/guard edits.                                                                         |
| Limitations                 | Verbatim three executor reports preserved; Probe2 is a sketch needing CASES inputs, Probe4 executable; no performance/full mdsvex claim.                                                                                      |

The design serves the intended distinction: build-time tokens can target existing
HTML renderers/sanitizers while typed components remain compiled Svelte. The
first future slice is conservative Text-only static elements. Nested-static and
nested-compiled elements, dynamic attribute adapters and general component binding
analysis are separate work.005 preserves snippet scope/root metadata only.
Existing compiled-island remains a control for that first routing slice.

All original contradictions and the later entity-path overgeneralization are
corrected. Complete HTML blocks decode entities; blank-line-separated flat tokens
preserve raw entity strings; an unclosed opening remains unstructured. Future DOM
fidelity checks must cover both closed shapes. No token-cleanup fix is authorized.

No implementation of this routing was built, mounted, server-rendered or hydrated.
Maintainer decisions D1-D7 remain open. This PASS accepts the design artifact;
it grants no routing implementation or release approval. Plans004/005 retain
current native HTML routing. No runtime suite rerun required for design-only work.

Integration: snapshots9b0614d/e153e79/54eff01 on issue372 branch; no push/PR.
Batch003 DONE;004 can proceed after its baseline-only preflight amendment.
