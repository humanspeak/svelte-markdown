# Guard report — 002 footnote correctness

**Recommendation: PASS** — following document content survives and every rendered reference has deterministic navigation, including streaming updates.
**Reviewed at** 57f144d · 2026-09-09 14:22 · **Plan planned at** 415df2e

Snapshot committed on `fix/image-footnote-correctness`. No PR requested; browser demonstration follow-up remains in this batch.

## Done criteria

| Criterion                                                                                                                                                            | Result | Evidence                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Step 1 content-loss, duplicate-reference, and duplicate-definition failures were recorded and now pass without weakening assertions.                                 | met    | Executor trace/report records 3 intended failures / 27 passing before runtime edits. Guard read the preserved assertions and independently ran the completed matrix green; typing correction adds runtime narrowing without dropping checks.                             |
| Complete footnote matrix and streaming guard commands exit 0.                                                                                                        | met    | Guard `pnpm test:only src/lib/extensions/footnote src/lib/SvelteMarkdown.footnotes.test.ts src/lib/utils/footnote-render-metadata.test.ts --reporter=dot --maxWorkers=2`: 5 files / 80 passed. Guard streaming command from plan: 4 files / 100 passed with two workers. |
| `trunk check`, `pnpm check`, `pnpm test --reporter=dot --maxWorkers=2`, `pnpm build`, and `git diff --check` exit 0; coverage thresholds and dependencies unchanged. | met    | Independent Trunk clean; check 0 errors / 3 existing warnings; coverage 154 files / 1,081 passed, 96.88% statements / 91.68% branches / 98.05% functions / 97.93% lines; build/package/publint passed; diff check clean. Config and dependencies unchanged.              |
| No edits outside the allowlist beyond pre-existing user changes.                                                                                                     | met    | Entire 3b45ca4..57f144d source diff reviewed: exactly the thirteen allowed source/test/README files. Competitive analysis and image work remain in their earlier commits.                                                                                                |
| README documents the actual supported contract; batch status/evidence updated.                                                                                       | met    | README footnote section describes indentation, first-wins, encoding, per-occurrence backlinks, additive props, plain-text bodies and separate-document ID limitation. Guard authored DONE row and evidence.                                                              |

## Spirit

The scanner consumes only definition source and indented continuations, leaving ordinary following blocks for Marked. Navigation is prepared from the complete rendered token tree as a fresh immutable snapshot: later references update an earlier retained definition, while duplicate definitions disappear and image-alt tokens do not create ghost links. Cache replay and frozen caller tokens retain their data; nested references count in document order. Simple first IDs stay compatible and special labels receive injective encoding. Independent regression tests verify DOM identity during append, completion, resets and cache reuse. A separate guard probe also verified CRLF through the actual Marked lexer.

## Scope & conduct

- One corrective dispatch resolved 24 fixture/assertion typing errors and a Trunk false positive before the snapshot could pass its normal hook. Guard authored no source and bypassed no hook.
- One default-worker focused run lost a Vitest worker after 72 assertions passed. The amended two-worker retry passed all 80 focused and 100 streaming tests; full coverage passed under the same limit. This changes scheduling only, not test assertions, timeouts or thresholds.
- The companion reported an intermediate worker exit followed by an identical successful rerun. No assertion failure was hidden as an environment issue.
- Plan baseline moved to reviewed image snapshot 415df2e before dispatch; README image edits preserved. Scope and STOP conditions respected.

## Residual risk / follow-ups

- Footnote bodies remain escaped plain text, and independent document instances still need application-provided namespaces when sharing labels.
- Definitions stay at their source position; rich bodies, numbering, global relocation and tail-window parsing remain deferred.
- Existing Svelte warnings and import.meta.env packaging warning remain outside scope.
- Next: create and verify the operator-requested demonstration pages, then open them in T3.
