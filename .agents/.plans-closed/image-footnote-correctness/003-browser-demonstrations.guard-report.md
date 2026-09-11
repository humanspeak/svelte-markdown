# Guard report — 003 browser demonstrations

**Recommendation: PASS** — the real-library demos and all five browser regression cases pass; T3 interactions independently reproduce the fixes.
**Reviewed at** 43cf7b6 · 2026-09-09 14:47 · **Plan planned at** 57f144d

Source committed on `fix/image-footnote-correctness`; no PR requested.

## Done criteria

| Criterion                                                                                      | Result                         | Evidence                                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Both pages render the real library, with working documented controls and local assets.         | met                            | Full three-file diff reviewed. One SvelteMarkdown instance per page, actual footnote extension/renderers, existing PNG assets; T3 exercised controls.                                                                                                                   |
| New Playwright browser regression tests pass in Chromium; no mocked render results.            | met                            | Guard `pnpm exec playwright test tests/image-footnote-correctness.test.ts --project=chromium --reporter=line --workers=1`: 5 passed in 4.8s. Assertions inspect naturalWidth, classes, node identity, preserved text, unique IDs, actual :target, completion and reset. |
| Trunk check, pnpm check, pnpm build and git diff --check pass.                                 | met                            | Independent sequential final run exits 0: Trunk clean (30 files), check 0 errors / 3 existing warnings, build/package/publint pass, diff clean.                                                                                                                         |
| Guard observes recovery and footnote navigation in T3 and leaves pages accessible to the user. | met with visibility limitation | T3 tab_d: error=true/naturalWidth=0 -> error=false/150, same node after prose append. tab_c: fn-repeat target -> second backlink target fnref-repeat:ref:2. Both local URLs loaded and open/show requested; underlying visibility flag remains false (see below).       |
| Changes match the three-file allowlist; guard records verification and status.                 | met                            | 1e513aa..43cf7b6 modifies only two new test routes and tests/image-footnote-correctness.test.ts. Guard owns DONE/status/log/report.                                                                                                                                     |

## Spirit

The operator can inspect source beside the actual rendering and trigger each regression through controls. Tests validate browser behavior rather than a claimed PASS label. Hydration readiness reflects real client lifecycle so SSR controls cannot lose early clicks. Timers are canceled on reset/unmount; completion preserves accumulated Markdown. Existing library snapshots remain unchanged.

## Scope & conduct

- One corrective dispatch resolved page/test issues; guard authored no source. No dependencies/config/runtime changes.
- Initial browser run overlapped guard typecheck regeneration and Vite reloads. A separate retry still reproduced early-click failures; guard proved load precedes client initialization. Explicit lifecycle gating fixed it without sleeps or weaker assertions.
- Trunk found missing each key; svelte-check found unused CSS. Both corrected. Global body styling removed to preserve route scope.
- A Checkov scan of previously carried JSON stalled at full CPU for over seven minutes. Guard stopped that exact process, then normal final Trunk and commit hooks passed. No rules disabled.

## Residual risk / follow-ups

- Both demos are loaded in T3 (`tab_c`, `tab_d`) and open/show requests were issued. T3's underlying visibility field remains false. Foregrounding the application succeeded; macOS denied fallback assistive access to inspect its window. Operator was asked to confirm inline-preview visibility. This report does not claim the OS preview window was independently proven visible.
- Direct URLs: [image recovery](http://localhost:4173/test/image-recovery) and [footnotes](http://localhost:4173/test/footnote-correctness). The local Vite server remains running.
- Browser automation was Chromium-only; unit coverage and existing streaming guards passed for the unchanged runtime. Broader browser projects were not run.
- Existing Svelte/package warnings remain. Next operator decision: PR, if desired.
