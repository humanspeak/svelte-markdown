# Guard log — 004 literal masking

## Preflight — 2026-10-06 — PLAN AMENDED

54eff01 · dependencies002/003 DONE

- Scoped drift from e6195d0: only README six-line preparsed-array/async-context explanation from verified001. Hybrid code/tests/fixture unchanged; current-state excerpts independently read and still accurate.
- Dispatch-authorized dated rebaseline to54eff01 prevents false STOP on that predecessor change. Scope, literal regressions, routing policy, full validation and STOP boundaries retained.
- Conductor marks004 IN PROGRESS. Opus5.5 owns implementation; guard read-only on source.005 waits for004 PASS.

## Checkpoint 1 — 2026-10-06 — ON TRACK

410cc72 · final review of Opus5.5 contribution (base064bb94)

- Scope: full392-line addition/17-line deletion contribution read across exactly five allowed files. No routing, renderer, dependency or package API edits. Exports/source slices/UTF16/newline positions retained; helper functions implement lexical context, Markdown priority/re-pairing and escape parity.
- Independent red replay: loaded064bb94 hybrid.js from temporary copy with repo dependency resolution. Standalone/nullish/component/nested template cases throw js_parse_error before and extract correct original islands after. Even-backslash expression previously omitted, now extracted. Initial hand-typed nested probe had a transcription error; corrected probe reads exact test literals through TypeScript AST and succeeds. Tests themselves pass unchanged.
- Focused preparser41/4; full1451/168 and coverage97.32/92.84/98.3/98.64. Types0 errors/3 baseline warnings. Trunk62 modified files/no issues. Build/publint pass with existing import.meta.env packaging warning.
- Fresh production4173 preview owned by guard after build; Chromium2 tests pass (JS-disabled SSR plus hydrated counter/callback/conditional/renderer toggles). Stopped own preview;8237 untouched. Scoped diff whitespace check passes.
- Snapshot hook initially failed hidden type gate; independent pnpm check passed and unchanged commit retry passed all hooks. Final independent type check passes too. Cause of first hidden failure unobserved; no bypass used.
- PASS for bounded literal contract. Runtime fixture asserts exact greeting initially/after props change and zero Lexer calls. Markdown literal/code/blockquotes, emoji, references, escapes and typed props regressions genuinely asserted.
- Residual: regex/division heuristic is incomplete. Native-valid data.return / template-length and equivalent component prop can still fail js_parse_error; executor disclosed keyword-as-property issue and README names heuristic. Experimental compiler grammar parity is not claimed. Re-pairing approximation and deferred GFM/custom-extension boundaries remain.
- Mark004 DONE; preflight005 rebased to410cc72 and update stale line references after verified lexical changes. No source authorship/push/PR by guard.
