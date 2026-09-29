# Guard report — 002 block-boundaries

**Recommendation: PASS** — all seven bucket B tests pass as normal tests; loose ordered lists stay one list, HTML blocks with blank lines nest their children, and documents with closed or void HTML regain the tail window.
**Reviewed at** f116ce6 · 2026-09-29 03:51 · **Plan planned at** 4e1ab97 (amended 2026-09-29; original 8805f29)
**Integrated** — no PR action: the work is on the existing PR #396 branch. Snapshots `4e1ab97` (Steps 1–6) and `f116ce6` (Step 7).

## Done criteria

| Criterion                                                                      | Result | Evidence                                                                                                                                  |
| ------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| All bucket B tests are `it(` and pass; strict run shows no bucket B failure    | met    | remaining `red(` calls 6 + 1, all in buckets C and D; `pnpm test` 1282 passed, 7 expected fail                                            |
| After a closed HTML block with blank lines, later appends use the tail window  | met    | Step 5 test in `incremental-parser.test.ts` asserts `usedTailWindow` on the last two appends; passed without a code change                |
| Documents with a root-level void HTML tag use the tail window on later appends | met    | new `it.each` over `<br>`, `<hr>`, `<img>`, `<br/>`: `[true,true,true]` after the fix (guard's probe showed `[false,false,false]` before) |
| `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean                | met    | `0 ERRORS 3 WARNINGS`; 163 files, lines 98.7%; `✔ No issues`                                                                              |
| No files outside scope modified                                                | met    | `incremental-parser.ts` + tests (Steps 1–6); `token-cleanup.ts` + two test files (Step 7)                                                 |

## Spirit

The plan's purpose was that a block is never frozen while the next chunk can still continue or enclose it. Both halves landed with the minimum rule that achieves it: the list rule keeps the list in the tail only while the last paragraph could still become an ordered marker, and the HTML detector recognizes an opening tag by what it is rather than by a field only paired tokens carry. The follow-up step established an invariant in cleanup — root source lengths add up to the lexed source — instead of special-casing void tags, which is why a row nobody asked about (`<br>\n<hr>\n\n`, one token expanding to two roots) also went from failing to passing. No existing expectation had to change.

## Scope & conduct

- In-scope only: yes. STOP conditions: none fired.
- Deviations (both judged sound, see guard log): the list rule is narrower than the plan's wording; a tag-less source ending in `/>` is treated as an opening.
- Plan amendment: 2026-09-29 Step 7, after guard's probe found void tags disabled the tail window.

## Residual risk / follow-ups

- An expansion that ends with a still-unclosed tag does not add up until the closing tag arrives; harmless because the unclosed-HTML detector forces a full re-lex meanwhile.
- `sourceLength` is now also recorded on html expanded inside nested contexts and on root `text` tokens produced by expansion; `render-metadata.ts` reads it as a more accurate span. Covered by the full suite, not by a dedicated test.
- A document with an HTML tag that never closes is fully re-lexed on every update (unchanged design).
