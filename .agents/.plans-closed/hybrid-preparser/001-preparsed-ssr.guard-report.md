# Guard report — 001 preparsed SSR

**Recommendation: PASS** — preparsed arrays render on the server with async document context; all final gates independently reproduced.

**Reviewed at** d8d664f · 2026-10-06 17:31 · **Plan planned at** e6195d0

**Integration:** source checkpoint d8d664f on investigate/issue-372-md-preprocessor. Publication deferred until user asks; no PR or push.

## Done criteria

| Criterion                                                                      | Result | Evidence                                                                                                                                                                                                         |
| ------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Red SSR failure recorded before fix and same test passes afterward.            | met    | Verbatim001-executor-report.md records2 failed/1 passed on unchanged component; guard's focused production command passes3 tests after fix. Red history is executor evidence; green is independently reproduced. |
| Focused async-tokens Playwright test passes on Chromium.                       | met    | pnpm exec playwright test tests/preprocess-async-tokens.test.ts --project=chromium --reporter=line:3 passed, exit0.                                                                                              |
| pnpm test passes with coverage gates.                                          | met    | Isolated guard retry:168 files/1441 tests pass, exit0; coverage97.48% statements/92.9% branches/98.28% functions/98.71% lines.                                                                                   |
| pnpm check, trunk check, and pnpm build exit0.                                 | met    | Types0 errors/3 baseline warnings; Trunk47 modified files no issues after retry; direct pnpm build and publint All good, exit0. Existing import.meta.env packaging warning remains.                              |
| Arrays render with zero Lexer/async parsing calls, including replacements.     | met    | SvelteMarkdown.test.ts:1303 initial/replacement/empty cases assert zero lexAndClean and sync/async parser/walkTokens calls. Direct built-server probe observes0 Lexer.lex,0 Lexer.inlineTokens,0 hook calls.     |
| Existing async-string and streaming behavior remains covered.                  | met    | Entire1441-test suite passes, including existing async string and streaming tests; new control swaps array to string and observes async parser and hooks.                                                        |
| git diff --check exits0.                                                       | met    | git diff --check5b36e6a..d8d664f exit0.                                                                                                                                                                          |
| The contribution modifies only the listed paths; conductor artifacts excluded. | met    | Complete six-file diff matches the exact plan scope; no dependencies/config/plan edits by executor.                                                                                                              |
| The final report names all verification limitations and deviations.            | met    | Verbatim report lists JSDOM red-test limitation, array/streaming precedence, retained harmless async effect branch and README placement; no blocked verification.                                                |

## Spirit

The fix selects already-processed array input before async scheduling at
SvelteMarkdown.svelte:610. It does not pretend to make async string parsing work
in SSR. The regression observes actual rendered markup and a page with JavaScript
disabled, so client effects cannot hide missing server output. Existing array
replacement and async string controls preserve the intended distinction.

## Scope and conduct

- In-scope only: yes; source diff base5b36e6a to snapshotd8d664f fully read.
- Planning drift: scoped e6195d0..5b36e6a empty; no plan amendment needed.
- STOP conditions respected: no substantive STOP reported or found.
- Plan/index/guard changes: conductor only; plan001 DONE, plan002 pre-flight started.

## Verification infrastructure

The first concurrent run saw an ESLint process crash (-11) and one Vitest worker
startup SIGTRAP, without assertion failures. A serial full-suite retry and Trunk
retry both passed unchanged source. Those failed attempts are recorded, not
counted as successful gates. Final logs were /tmp/hybrid-001-guard-unit-retry.log,
/tmp/hybrid-001-guard-browser.log, /tmp/hybrid-001-guard-types.log,
/tmp/hybrid-001-guard-build.log and /tmp/hybrid-001-guard-trunk-retry.log.

## Residual risk and follow-ups

- Async string sources still render after mount; this plan changes only arrays.
- Authored HTML routing, contextual literal masking and Svelte scopes remain later batch work.
- The no-JavaScript regression is Chromium here; plan002 adds the hybrid fixture browser matrix.
- SSR/hydration console instrumentation is not part of001;002 owns that integration tripwire.
