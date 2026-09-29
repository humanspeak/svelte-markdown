# Guard report — 001 offset-integrity-guard

**Recommendation: PASS** — all six bucket A tests pass as normal tests, the integrity check adds no per-update work proportional to the document, and the one deviation from the plan is sound and pinned by a test.
**Reviewed at** 8805f29 · 2026-09-29 03:31 · **Plan planned at** 119cc58
**Integrated** — no PR action: the work is on the existing PR #396 branch; batch convention is one branch.

## Done criteria

| Criterion                                                       | Result | Evidence                                                                                                                                    |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| All bucket A tests are `it(` and pass                           | met    | remaining `red(` calls: 11 + 3 = 14, all in buckets B, C, D; `pnpm test` 1253 passed, 14 expected fail                                      |
| `PARITY_STRICT=1` shows no bucket A failure                     | met    | strict run fails only in "B. block", "C. reference", "D. fuzz"                                                                              |
| `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean | met    | `0 ERRORS 3 WARNINGS`; 163 files, lines 98.68%; `✔ No issues`                                                                               |
| No O(document) work added on the tail-window path               | met    | diff: `sumSourceLength(tailTokens)` on tail and targeted paths, whole-array sum only in `parseFullSource`; bookkeeping tests pass unchanged |
| No files outside scope modified                                 | met    | four in-scope files                                                                                                                         |

## Spirit

The plan asked for a general invariant rather than a CRLF patch and a duplicate-definition patch. That is what landed: `hasLengthMismatch` is computed wherever tokens are produced and gates both fast paths and the next boundary. The executor found that the plan's "discard and fully re-lex" instruction conflicted with an existing test that pins the targeted path's lexer inputs, and chose keep-and-flag instead. Guard agrees with the reasoning: a tail lexed from a valid boundary is itself correct; a length mismatch only invalidates the NEXT boundary, which the flag empties. The extra guard test (LF prefix followed by CRLF chunks) pins exactly that branch, and per-chunk parity holds.

## Scope & conduct

- In-scope only: yes. STOP conditions: none fired; the executor avoided weakening the existing duplicate-definition test.
- Plan amendment: none needed; the deviation is recorded here.

## Residual risk / follow-ups

- A duplicate definition with NO earlier reference use takes the plain tail path without seeded links, so the tail emits a `def` token where a one-shot parse emits none; lengths add up, so this guard cannot see it. Plan 003 (definitions from tokens, tail always seeded) must cover it — added to 003's pre-flight note.
- `divergeOffset` for mismatched documents is a sum of token lengths rather than a true source offset; consistent with what a render-metadata walk computes, and rendered parity passes, but there is no dedicated test.
- CRLF documents are fully re-lexed per update (documented trade-off; plan 004 records it in the docs).
