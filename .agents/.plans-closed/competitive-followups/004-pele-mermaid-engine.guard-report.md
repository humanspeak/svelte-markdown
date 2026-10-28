# Guard report: 004 pele-mermaid-engine

**Recommendation: PASS**. Users can now opt into a synchronous, tree-shaken pele engine through `extensions/mermaid-pele`, pele can never leak into the barrel or the shared renderer, and I reproduced every gate.
**Reviewed at** `8a366c0` · 2026-10-28 12:10 · **Plan planned at** `3051dc1` (re-stamped from `bdebe69`)
**Integrated**: committed to `chore/competitive-intel-2026-10-28`. No PR mid-batch.

## Done criteria

| Criterion                                                                             | Result | Evidence                                                                     |
| ------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| `pnpm test` exits 0, coverage ≥ 90%, `createPeleEngine.test.ts` has ≥ 6 passing cases | met    | 1678/1678. Coverage 97.38% statements, 93.06% branches, 98.3% lines. 6 cases |
| `pnpm check` and `pnpm -C docs check` exit 0                                          | met    | 0 errors / 0 errors                                                          |
| `pnpm package && pnpm test:tree-shaking` exits 0, with the 3 new cases                | met    | all three `✓`. `grep -c pele scripts/tree-shaking.mjs` gives 15              |
| `grep -n "pele" src/lib/extensions/index.ts` gives no output                          | met    | 0 matches                                                                    |
| `package.json` has the export, an optional peer, and a devDependency                  | met    | `./extensions/mermaid-pele`, `pele: >=1.10.1` (optional), dev `1.10.1`       |
| `trunk check` clean, no `any` and no `eslint-disable`                                 | met    | pre-commit trunk check passed. No added disables, `any`, or trunk-ignores    |
| Only in-scope files changed                                                           | met    | 9 paths, all listed. `mermaid/` untouched                                    |
| Index status row updated                                                              | met    | by guard                                                                     |

## Spirit

The goal was to let users opt into the light, synchronous Mermaid engine that streamdown 5.0.0 now uses, without leaving the library and without making anyone else pay for it. The diff delivers that. `createPeleEngine` implements the plan 003 contract with pele's sync `render`, and consumers register only the diagram types they need. Barrel and shared-renderer invariants are enforced by unit guards and by bundle-level tree-shaking cases. The README shows install, usage, theming, and the visual-difference caveat honestly. The live-while-streaming half of the competitive gap is plan 005.

## Scope & conduct

- In scope only: yes.
- STOP conditions respected: yes. The canvas condition did not fire (pele fell back to metrics in jsdom), and the version fallback was used as the plan prescribed.
- Plan amendments: revision (1) git workflow and revision (2) Step 6a README move, both before dispatch. The second was agreed by the operator.

## Residual risk / follow-ups

- pele is pinned to 1.10.1 because of the 2-day release-age policy. Bump the devDependency once 1.12.x clears the window. pele releases several times a week, so re-check `register`/`render` signatures on bumps.
- Nothing exercises pele in a real browser yet. Plan 005's E2E route covers that.
- `register` is global in pele: several engines share one diagram registry.
