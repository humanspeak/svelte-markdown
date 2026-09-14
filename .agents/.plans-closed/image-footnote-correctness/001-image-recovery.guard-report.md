# Guard report — 001 image recovery

**Recommendation: PASS** — replacement images recover and unchanged-source state remains stable; all amended verification gates reproduced green.
**Reviewed at** 415df2e · 2026-09-09 13:53 · **Plan planned at** db41ab0

Source snapshot is committed on `fix/image-footnote-correctness`. PR deferred under dispatch batch rules and until requested.

## Done criteria

| Criterion                                                                                                                                                 | Result | Evidence                                                                                                                                                                                                                                                    |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Both Step 1 failures were observed against baseline and now pass.                                                                                         | met    | Guard baseline run: 2 failed / 8 passed; focused post-fix run includes both and passes.                                                                                                                                                                     |
| Focused image/integration and streaming guard commands exit 0.                                                                                            | met    | `pnpm test:only src/lib/renderers/Image.test.ts src/lib/SvelteMarkdown.image-recovery.test.ts src/lib/SvelteMarkdown.issue-328.test.ts src/lib/SvelteMarkdown.redraw-regression.test.ts --reporter=dot`: 4 files / 52 passed.                               |
| `trunk check`, `pnpm check`, `pnpm test --reporter=dot --maxWorkers=2`, `pnpm build`, and `git diff --check` exit 0; coverage configuration is untouched. | met    | Independent Trunk passed; check 0 errors / 3 existing warnings; coverage 152 files / 1,034 passed, 96.89% statements / 91.34% branches / 97.96% functions / 97.89% lines; separate build retry passed through publint; diff check passed, config untouched. |
| No new dependencies, public props, placeholders, or unrelated edits.                                                                                      | met    | Entire 573e012..415df2e diff reviewed: Image.svelte, Image.test.ts, SvelteMarkdown.image-recovery.test.ts, README image paragraph only.                                                                                                                     |
| Batch README records verification results and status.                                                                                                     | met    | Guard authored DONE row and execution evidence alongside this report.                                                                                                                                                                                       |

## Spirit

The fix ties load/error state to the current URL attempt, so replacing a broken image genuinely loads and displays the replacement. Events from discarded nodes cannot contaminate a later attempt, including A-to-B-to-A transitions. Unchanged URLs keep their DOM and completed state while surrounding Markdown updates. Lazy loading still defers unexposed images and retains exposure once visible. Tests exercise renderer events, controlled observers, sanitization, and streaming integration.

## Scope & conduct

- Runtime/test/doc scope matches the plan; no Parser, sanitizer, dependency or generic key changes.
- Red gate independently reproduced after companion pnpm could not start; companion continuation implemented and ran direct Vitest. Guard authored no source.
- STOP conditions respected. Test concurrency was amended with dated evidence after one existing full-suite heading timeout; identical assertions and timeout passed with two workers. No acceptance threshold reduced.
- Build's first packaging process was killed (137); separate retry passed. Existing import.meta.env packaging warning remains.
- Planning baseline was rebased onto fresh main db41ab0 at the operator's request. Competitive-analysis changes were carried in separate commit 29dfe6e.

## Residual risk / follow-ups

- Reusing the same failed URL does not automatically retry it; README documents custom renderer retry behavior.
- Layout placeholders and reserved image dimensions remain deferred.
- Browser demonstration requested by the operator will follow footnote implementation; these automated checks use jsdom.
- Next: dispatch Plan 002 from its amended reviewed baseline, then open requested T3 demonstrations.
