# Guard report: 003 mermaid-engine-contract

**Recommendation: PASS**. `MermaidRenderer` now runs on a pluggable `MermaidEngine` contract, mermaid.js behavior is unchanged (the original 8 tests pass unmodified), and I reproduced every gate, including 80/80 E2E across all five browser projects.
**Reviewed at** `3051dc1` · 2026-10-28 11:55 · **Plan planned at** `bdebe69`
**Integrated**: committed to `chore/competitive-intel-2026-10-28`. No PR mid-batch (one-branch/one-PR digest convention).

## Done criteria

| Criterion                                                           | Result | Evidence                                                               |
| ------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------- |
| `git diff bdebe69 -- …/MermaidRenderer.test.ts` is empty            | met    | 0 lines                                                                |
| `pnpm test` exits 0, coverage ≥ 90%, new test files exist and pass  | met    | 1663/1663. Coverage 97.38% statements, 93.06% branches, 98.3% lines    |
| `pnpm check` exits 0                                                | met    | 0 errors, 10 pre-existing warnings                                     |
| `pnpm package && pnpm test:tree-shaking` exits 0                    | met    | publint "All good!", `✓ mermaid renderer`                              |
| Mermaid E2E (`mermaid.test.ts`, `mermaid-snippets.test.ts`) exits 0 | met    | 80 passed (5 projects), after bootstrapping browsers and freeing :4173 |
| `grep -rn "from 'mermaid'" src/lib` (`.ts`) gives no output         | met    | no matches                                                             |
| New names in barrel, subpath index and README                       | met    | counts 2 / 1 / 3                                                       |
| `trunk check` clean, no `eslint-disable`                            | met    | pre-commit trunk check passed, no added disables or `any`              |
| Only in-scope files changed                                         | met    | 12 files, all listed in Scope                                          |
| Index status row updated                                            | met    | by guard                                                               |

## Spirit

The intent is to make the Mermaid extension engine-pluggable, mirroring `HighlightedCode`, with zero behavior change for existing users, as groundwork for pele. The diff does that. The renderer talks only to `MermaidEngine`, resolves an engine from prop, then context, then singleton, then a per-instance mermaid.js fallback, accepts sync or async results, and drops stale async renders. The mermaid.js path stays behind a dynamic import, so bundles are unchanged (tree-shaking still shows mermaid only as a dynamic chunk). The one gap is cosmetic: the README subsection's placement, which the plan itself prescribed.

## Scope & conduct

- In scope only: yes.
- STOP conditions respected: yes. The first dispatch stopped correctly when the plan file was missing from its worktree.
- Plan amendments: a pre-dispatch git-workflow revision on plan 003. During review, a README placement defect was routed to plan 004 Step 6a with operator agreement. Plan 003 itself was not amended.

## Residual risk / follow-ups

- README order: until plan 004 lands, the snippet-override example sits under `#### Choosing an engine`. Plan 004 Step 6a moves it.
- SSR of sync engines is deliberately deferred (engines run only after mount).
- E2E environment note: Playwright 1.63 needs `pnpm exec playwright install firefox webkit` on this machine, and a stale preview on :4173 makes Playwright reuse a dead server. Kill it before running.
