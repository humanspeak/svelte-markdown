# Guard report — 002 production hydration

**Recommendation: PASS** — production SSR and hydrated behavior are covered across all five configured browser projects.

**Reviewed at** a42d902 · 2026-10-06 17:42 · **Plan planned at** e6195d0

**Integration:** source snapshot a42d902 on investigate/issue-372-md-preprocessor; no push/PR while batch is active.

## Done criteria

| Criterion                                                                       | Result | Evidence                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Focused hybrid tests pass on all five configured projects.                      | met    | Guard command pnpm exec playwright test tests/preprocess-hybrid.test.ts --reporter=line:10 passed in8.3s,2 each Chromium/Firefox/WebKit/mobile Chrome/mobile Safari.                                                   |
| SSR is checked before hydration, independently of client JavaScript.            | met    | tests/preprocess-hybrid.test.ts:55 uses separate javaScriptEnabled:false context and full initial-document assertions, closing context in finally.                                                                     |
| Counter/callback/conditional/renderer toggles are checked.                      | met    | :68 hydrated test clicks counter and renderer toggle; checks Count7, Parent updates1, conditional content, semantic headings and retained state/custom links.                                                          |
| Literal code and strong interpolation are checked.                              | met    | :43 shared helper checks exact inline paragraph, strong greeting, exact fenced-code text and no live counter in pre. Used before/after hydrated interactions and with JS disabled.                                     |
| Console hydration warnings, page errors, and failed local assets fail the test. | met    | :77 listeners attach before navigation; arrays asserted empty at end. Source review confirms warning/error and failure collection; production hydration warning URL remains present in installed/built Svelte runtime. |
| pnpm test, pnpm check, trunk check, pnpm build exit0.                           | met    | Independently ran each serially:168 files/1441 tests pass; coverage97.48/92.9/98.28/98.71;0 type errors/3 baseline warnings; Trunk52 files no issues; build/publint pass with existing import.meta.env warning.        |
| git diff --check exits0.                                                        | met    | Scoped df77a4f..a42d902 check exits0.                                                                                                                                                                                  |
| The contribution modifies only the listed paths; conductor artifacts excluded.  | met    | Complete contribution is one new125-line tests/preprocess-hybrid.test.ts; fixture/config/dependencies unchanged.                                                                                                       |
| The final report names all verification limitations and deviations.             | met    | Verbatim002-executor-report.md records no explicit hydrated signal, unplanted diagnostic failure, and omitted unnecessary install. Its production warning claim is corrected below.                                    |

## Spirit

The test observes actual server output with JavaScript disabled, then separately
checks that compiled events, parent state and renderer customization work after
hydration. It pins the previous literal-asterisk bug and code-example boundary.
Assertions inspect behavior rather than snapshots or generated-source spelling.
The network-idle wait is followed by event assertions, so an unhydrated page
cannot satisfy the test solely through SSR markup.

## Scope and conduct

- In-scope only: yes; full source contribution read.
- Drift: e6195d0..df77a4f contains no change to the sole in-scope file.
- STOP conditions: none found; existing fixture passed without modification.
- Plan amendments: none. Guard owns report/index changes.
- Source snapshot committed before verification through commit skill; no guard-authored source.

## Executor report correction

The report says Svelte strips hydration-mismatch warnings in production. Installed
node_modules/svelte/src/internal/client/warnings.js:149–160 has a non-DEV
console.warn branch containing the hydration_mismatch URL. Calls are present
in render.js:207 and dom/hydration.js, and that URL is in the built client chunk.
The new test collects all console warnings before navigation, so it still detects
this production diagnostic. This correction changes the report's explanation,
not the implementation or verdict.

## Residual risk and follow-ups

- DOM assertions cover this fixture; they do not prove every possible hydration mismatch is caught.
- Diagnostic listeners were reviewed but no intentional failure was injected into the fixture; injection would be separate verification tooling work.
- No explicit hydrated signal exists; interaction assertions provide practical confirmation.
- Routing, lexical masking and authored snippet/root scope remain later plans.

## Verification record

Final guard logs: /tmp/hybrid-002-guard-unit.log, /tmp/hybrid-002-guard-types.log,
/tmp/hybrid-002-guard-trunk.log, /tmp/hybrid-002-guard-build.log,
/tmp/hybrid-002-guard-browser.log. All final commands exited0; no retry needed.
