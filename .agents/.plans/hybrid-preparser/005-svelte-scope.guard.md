# Guard log — 005 Svelte scope/root placement

## Preflight — 2026-10-06 — PLAN AMENDED

410cc72 · dependency004 DONE

- Scope drift since e6195d0 matches verified001 README semantics and004 lexical fix/tests/fixture/docs. Full004 contribution independently read and all gates reproduced. No unexplained drift.
- Updated stale extraction/snippet line anchors (305/308/392), planning SHA and dated revision. Snippet/runtime scope defect and root metadata placement remain: native window compiles, generated window fails svelte_meta_invalid_placement. Authored snippet declarations are still independently wrapped.
- Scope, done criteria and STOPs unchanged. General component binding analysis, identifier hygiene and HTML routing remain out of scope. Preserve004 lexical semantics/template fixture and001 async arrays behavior.
  -005 IN PROGRESS; Opus5.5 owns source and guard remains read-only.
