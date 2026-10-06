# Guard log — 005 Svelte scope/root placement

## Preflight — 2026-10-06 — PLAN AMENDED

410cc72 · dependency004 DONE

- Scope drift since e6195d0 matches verified001 README semantics and004 lexical fix/tests/fixture/docs. Full004 contribution independently read and all gates reproduced. No unexplained drift.
- Updated stale extraction/snippet line anchors (305/308/392), planning SHA and dated revision. Snippet/runtime scope defect and root metadata placement remain: native window compiles, generated window fails svelte_meta_invalid_placement. Authored snippet declarations are still independently wrapped.
- Scope, done criteria and STOPs unchanged. General component binding analysis, identifier hygiene and HTML routing remain out of scope. Preserve004 lexical semantics/template fixture and001 async arrays behavior.
  -005 IN PROGRESS; Opus5.5 owns source and guard remains read-only.

## Checkpoint 1 — 2026-10-06 — ON TRACK

22cd4dc · final review of Opus5.5 contribution (base2c067a4)

- Full420-line addition/14-line deletion diff read, exactly five allowed files. AST classification keeps snippet declarations at document scope, root metadata/options at component root, nested declarations in parent islands and source/islands fields compatible. No renderer/dependency/identifier/routing implementation changes.
- Independent real SSR red replay: baseline2c067a4 generated code compiles but render throws ReferenceError greeting is not defined; new code renders b/Hello from the same authored snippet. Evaluated generated code against actual Svelte internal/server plus renderServer, with minimal compiled token document; lexical scope not mocked.
- Independent root probes: window/options/head produce empty source/islands and root slices; both compiler targets accept generated output. Nested window, top-level const and unsupported namespace option rejected explicitly. Focused60 tests/4 files pass, including before/forward snippet SSR/client props, resize/title, native placement and zero marker tests.
- Full1470 tests/168 files; coverage97.36/92.88/98.31/98.61. Types0 errors/3 baseline warnings; Trunk65 files/no issues; build/package/publint pass with existing import.meta.env warning. Whitespace/scope checks pass; all commands serial, snapshot hooks pass without retry.
- Browser gate broadened due changed fixture: fresh production4173 preview,10 cases across all five projects pass in7.9s (JS-disabled SSR and hydrated behaviors). Existing greeting assertions now exercise actual authored snippet. Zero runtime Lexer assertions retained. Own preview stopped,8237 untouched.
- Masking exception for svelte: autolinks is necessary for native root tags and remains within hybrid.js/declared root support; normal URL literals still tested. Options limited to runes, other options rejected/docs updated. Top-level const/self/unsupported declaration tags fail rather than become valid through generated wrapper.
- PASS: all plan done criteria met. Limitations: runtime unit helper is a minimal token document; real MarkdownDocument SSR/hydration covered via fixture. Legacy runesfalse has compiler/SSR but no client runtime case. TS template/snippet parameter syntax unsupported, generated identifiers and004 regex heuristic deferred. Root/declaration groups retain own order and source slices and emit before generated document; arbitrary rendering side-effect order is not proven.
- Mark005 DONE. All five plans verified; retire batch after committing guard records. No source authored by guard, no push/PR.
