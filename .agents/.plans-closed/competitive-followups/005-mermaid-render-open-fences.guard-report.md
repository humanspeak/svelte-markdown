# Guard report: 005 mermaid-render-open-fences

**Recommendation: PASS**. With `markedMermaid({ renderOpenFences: true })` and a synchronous engine, diagrams now draw while their fence is still streaming and the last good diagram stays visible. Default behavior is unchanged, and I reproduced every gate, including streaming parity at every append.
**Reviewed at** `6981bda` · 2026-10-28 12:28 · **Plan planned at** `8a366c0` (re-stamped from `bdebe69`)
**Integrated**: committed to `chore/competitive-intel-2026-10-28`. No PR mid-batch.

## Done criteria

| Criterion                                                                                 | Result | Evidence                                                            |
| ----------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `MermaidRenderer.test.ts` unchanged, no pre-existing `markedMermaid.test.ts` test changed | met    | 0-line diff. Only the helper gained an optional parameter           |
| `pnpm test` exits 0, coverage ≥ 90%, new tokenizer, parity and renderer tests pass        | met    | 1690/1690. Coverage 97.4% statements, 93.11% branches, 98.31% lines |
| `pnpm test:e2e tests/mermaid-streaming.test.ts` exits 0                                   | met    | 15/15 in the full run. 60/60 with `--repeat-each=4`                 |
| `pnpm check` exits 0, `pnpm package && pnpm test:tree-shaking` exits 0                    | met    | 0 errors. Both exit 0                                               |
| `renderOpenFences` in README and `markedMermaid.ts`                                       | met    | counts 2 / 3                                                        |
| `trunk check` clean                                                                       | met    | pre-commit trunk check passed. No `any` or `eslint-disable` added   |
| Only in-scope files changed, index row updated                                            | met    | all in scope. Row updated by guard                                  |

## Spirit

The competitive gap is that streamdown draws Mermaid while it streams and we only drew it once the fence closed. That gap is closed, as an opt-in. The tokenizer stays tail-window safe, which the every-prefix parity test proves rather than assumes. The renderer hides mid-stream errors and keeps the last good diagram, and the E2E proves the diagram appears before the stream ends with no error flash, using the pele engine from plan 004. Default behavior is untouched for every existing consumer.

## Scope & conduct

- In scope only: yes. No forbidden files were touched.
- STOP conditions respected: yes, none fired. Parity held at every prefix.
- Plan amendments: revision (1) git workflow, revision (2) pre-flight notes (pele 1.10.1, re-stamp, port 4173), both before dispatch.

## Residual risk / follow-ups

- `closed` reaching snippet overrides is documented but untested. It follows mechanically from the `{...token}` spread in `Parser.svelte`, and a small snippet test would pin it.
- With async mermaid.js and `renderOpenFences`, every completed line triggers a full async render. The README says so and recommends pele.
- The compare page's `Diagrams (Mermaid)` row could now mention live streaming diagrams. That is a separate docs change, and the claim needs human sign-off.
- Once released, the digest can move `gap-lightweight-mermaid-engine` to `closed_gaps`.
