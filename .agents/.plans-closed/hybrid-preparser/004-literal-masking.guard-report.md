# Guard report — 004 literal masking

**Recommendation: PASS** — bounded Svelte JavaScript contexts no longer lose template literals to Markdown masking.

**Reviewed at:**410cc72 ·2026-10-06 · **Planned at:**54eff01

| Done criterion                        | Result and guard evidence                                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Red replay and template tests         | Baseline064bb94 standalone/nullish/component/nested expressions throw js_parse_error; exact test inputs extract correctly after. Focused41 tests pass across4 files.  |
| Literal/escape/offset/bold protection | Tests assert real code tokens/blockquote code, original island/source text with emoji offsets, odd/even escapes, shared refs and strong expression token.             |
| Zero runtime lexer                    | Existing runtime spies retained, mount/props/events/renderers pass. Greeting exact Initial load/Updated load asserted through template literal.                       |
| Production Chromium                   | 2 passed against fresh built assets using owned4173 preview: JS-disabled server output plus counter/callback/conditional/renderer updates and empty diagnostic lists. |
| Unit/coverage                         | 1451 tests/168 files;97.32stmt/92.84branch/98.3fn/98.64line meet gates.                                                                                               |
| Types/lint/build                      | 0 errors/3 baseline warnings; Trunk62 modified files/no issues; build/package/publint pass, existing import.meta.env warning retained.                                |
| Whitespace/scope                      | Scoped diff check passes; full five-file contribution read, no out-of-scope executor edits.                                                                           |
| Limits/report                         | Verbatim004-executor-report.md preserved; bounded scanner/regex heuristic and re-pairing approximation disclosed.                                                     |

The scanner prioritizes genuine Markdown literals and scans Svelte expressions
and attribute contexts lexically while preserving source offsets. Assertions
verify compile acceptance and runtime reactivity, rather than generated text
alone. Native authored HTML routing, typed component APIs and source exports are
unchanged. No dependencies or renderer files changed.

Residual risk: this is a bounded scanner, not complete JavaScript grammar parity.
Keyword-shaped property names before division can confuse regex detection;
guard reproduced native-valid data.return divided by a template literal length
still failing hybrid extraction. This is the disclosed heuristic limitation,
not a claim that arbitrary Svelte now works. Re-pairing approximation, GFM bare
autolinks and custom extension literals remain follow-ups. Generated-name
hygiene, nested Markdown and source maps are deferred.

The first snapshot hook failed its hidden type check. An isolated type check
passed; unchanged snapshot retry passed all hooks and final type rerun passed.
No cause was observed and no hook was bypassed. Initial temporary red-probe
dependency resolution/transcription errors were corrected; actual test inputs
were read through TypeScript AST for independent red replay.

Verification logs: /tmp/hybrid-004-guard-focused.log, unit.log, trunk.log,
build.log, browser.log, types.log with the same /tmp/hybrid-004-guard- prefix.
Guard stopped its owned preview4173; user's8237 untouched.

Integration: source snapshot410cc72;004 DONE,005 ready after baseline-only
preflight. No source edits by guard, no push/PR while batch is active.
