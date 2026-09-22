# Guard report — 001 Streamdown comparison refresh

**Recommendation: PASS** — current facts and numerical claims reconcile to two complete production suites.
**Reviewed at** `2889ce0` · 2026-09-22 07:03 · **Plan planned at** `f7d3a60`.
Measured source `a01c72b`; final comparison source `be20309`. PR deferred under
dispatch batch-close instructions; no package release, merge or deployment.

## Done criteria

| Criterion                                                                                                                                 | Result | Evidence                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All three version records and installed Streamdown are exactly 4.2.0.                                                                     | met    | Guard assertions check manifest, benchmark config, state and installed package; [frozen install](evidence/final-frozen-install.log) passes.                                                                                                |
| Two complete suites, 40 measured runs each, parseable JSON and provenance are committed under evidence; no page errors or missing output. | met    | [Evidence and formulas](evidence/README.md), both complete raw logs and parsed JSON, shape/error checks and [semantic output](evidence/semantic-output.json).                                                                              |
| Every numerical page claim reconciles to captured results.                                                                                | met    | Guard recalculated three scenario-specific ratio ranges, frame rates and 18.9368% DOM reduction. 2,821/3,480 counts coincidentally match old values but are independently stable in 20 measured 50 KB runs per renderer.                   |
| Stale highlighting and URL wording is gone; generated mirrors agree.                                                                      | met    | Full source diff reviewed; production DOM and both generated mirrors match canonical changed rows/notes/prose; [rendered check](evidence/rendered-comparison.json).                                                                        |
| pnpm build, root/docs checks, docs build, pnpm test, and Trunk pass.                                                                      | met    | [Root build](evidence/root-build.log), [final docs build](evidence/final-docs-build.log), [docs types](evidence/final-docs-check.log), [1,084 tests and coverage](evidence/unit-tests.log); source commit hooks pass root types and Trunk. |
| Only scope-listed tracked files changed; the plan index is DONE.                                                                          | met    | Executor source after dispatch c80462b is only package pin/lock, Streamdown data, config and validation block. Earlier docs-kit integration belongs to Plan 002. Guard updated the index; inherited nightly changes excluded from commits. |
| Three findings are resolved with evidence; other competitor state is preserved.                                                           | met    | Independent JSON assertions and object comparisons; last_run and all other working-state values match the pre-dispatch backup. Only Streamdown validation was staged.                                                                      |

## Spirit

The comparison now names the actual optional highlighting engine and explains
the competitor's protocol allowlist without treating all origins as all protocols.
Performance claims reflect 4.2.0 on the existing unchanged workload. Published
ratios stay specific to each burst scenario and expose variation across both
suites; frame pacing is explicitly near-tied, with Streamdown slightly lower
elapsed medians. DOM counts are elements, not a memory claim.

## Scope and conduct

Guard preflight rebaselined the lockfile after shared docs-kit integration and
recorded sandbox ownership and eventual evidence retirement. Source remained
executor-owned; guard installed dependencies, captured and reviewed evidence,
committed snapshots, and preserved unrelated nightly changes. One follow-up
removed a temporary path-location phrase from resolution status. No harness or
library source change, evidence selection, weakened output guard, or skipped STOP.

## Residual risk and follow-ups

Timings are workstation observations from headless Chromium 151 on the documented
macOS/Node 26 environment, not universal speed guarantees or CI timing thresholds.
The existing fixed renderer order and normal workstation activity limit precision.
Semantic checks cover the planned representative shapes, not complete conformance.
Existing docs CSS/build warnings and the eslint-plugin-import peer warning remain
outside this scope; required gates pass.

Merge/release/deploy remain separate. The next Streamdown upgrade requires fresh
production measurement before advancing benchmark provenance; nightly remains
report-only. Unrelated nightly-state edits remain in the working tree.
