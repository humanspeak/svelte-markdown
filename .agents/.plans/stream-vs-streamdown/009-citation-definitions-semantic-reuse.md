# Plan 009: Reference definitions mid-stream — semantic whole-tree reuse, then targeted re-lex

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dea763..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/streaming-token-reuse.ts src/lib/SvelteMarkdown.svelte src/lib/Parser.svelte`
> Plans 007 and 008 are EXPECTED to have changed `SvelteMarkdown.svelte` and
> `streaming-token-reuse.ts`. Re-read the live code for every excerpt below;
> where it differs only by those plans' changes, proceed; otherwise STOP.

## Status

- **Priority**: P1
- **Effort**: M (Part A) + M (Part B)
- **Risk**: MED
- **Depends on**: 006 (protocol), 008 (semantic equality). 007 recommended first.
- **Category**: perf
- **Planned at**: commit `7dea763`, 2026-09-28

## Why this matters

On a 24 KB citation-heavy answer (body cites `[1]`…`[40]`, trailing block of
40 `[n]: url` lines), each definition line makes `IncrementalParser.update()`
return `canReuse: false`; `SvelteMarkdown.svelte` then replaces every token
object, so the whole component tree gets new props. Measured 2026-09-27:
44 of 753 frames over budget, peak 81–84 ms, total work 4,750–5,323 ms vs
Streamdown 1,716–1,769 ms (evidence:
`.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`). In Node the
parser alone shows the same 41 no-reuse updates and 4–10 ms peaks for the
full re-lex, so two costs stack: the full re-lex (parser) and the full
re-render (component).

Part A removes the re-render cost: after a definition, keep the full re-lex
but reuse every root and nested token that is semantically unchanged (Plan
008's comparator makes this sound; the old comparator would have kept stale
hrefs). Part B attacks the re-lex cost with a targeted re-lex of only the
roots that can reference the new label, seeded with marked's link map, gated
on Part A's measurement.

Target for this scenario (the batch goal, not a milestone): total work below
Streamdown's 1,716–1,769 ms with zero over-budget frames and zero parity
mismatches. Part A alone is expected to remove the spikes (peak ≤ 20 ms) and
bring total work to roughly the prose level (~3,300 ms); Part B is what can
close the rest.

## Current state

`src/lib/utils/incremental-parser.ts:~555-640` (`update`):

```ts
const referenceInvalidatesTail = this.prevHasPotentialReferenceUse && appendAddsDefinition
const parseResult = this.parseSource(source, boundary, isAppendOnly, referenceInvalidatesTail)
// ...
const referenceSensitive = this.isReferenceSensitiveUpdate(
    source,
    isAppendOnly,
    referenceInvalidatesTail
)
const canReuse = isAppendOnly && !referenceSensitive
let divergeAt = 0
let divergeOffset: number | undefined = parseResult.usedTailWindow ? boundary.reparseOffset : 0
if (!referenceSensitive) {
    /* prefix scan with isSameStableNode */
}
return { tokens: newTokens, divergeAt, divergeOffset, canReuse, usedTailWindow }
```

`IncrementalUpdateResult` (`:47-60`): `tokens`, `divergeAt`, `divergeOffset?`,
`canReuse`, `usedTailWindow`.

`src/lib/SvelteMarkdown.svelte:~177-195` (`applyStreamingSource`):

```ts
const { tokens: newTokens, divergeAt, divergeOffset, canReuse } = parser.update(nextSource)
streamTokens = canReuse ? reuseStableTokenArray(streamTokens, newTokens, divergeAt) : newTokens
const canSkipRenderMetadataPrefix = canReuse && divergeOffset !== undefined
streamRenderMetadataStartIndex = canSkipRenderMetadataPrefix ? divergeAt : 0
streamRenderMetadataStartOffset = canSkipRenderMetadataPrefix ? divergeOffset : 0
```

`src/lib/utils/streaming-token-reuse.ts`: `reuseStableTokenArray(prev, next, divergeAt)`
(exported; prefix reuse + merge of the diverged root) and the private
`reuseStableNodeArray(prev, next)` (index-aligned whole-array reuse with
child merging). After Plan 008, equality is semantic with a same-object fast
path.

Reference detection helpers in the parser: `hasPotentialReferenceUse`,
`hasReferenceDefinition` (`REFERENCE_DEFINITION_RE = /^\s{0,3}\[[^\]\n]+\]:/m`),
`appendIntroducesMatch`. marked stores definitions in `lexer.tokens.links`
(keyed by normalized label: lowercased, whitespace collapsed) and resolves
reference uses during `inlineTokens` from that map; a `Lexer` instance can be
given a pre-populated `tokens.links` before lexing a fragment (verify against
the installed marked in Step 4 before relying on it).

Dev-only renderer-work counter: `src/lib/Parser.svelte` increments
`window.__svmParserCount` per Parser instance under `import.meta.env.DEV`
(lines ~126–150). There is no update counter yet; Step 1 adds one.

Existing tests to UPDATE (not delete): `incremental-parser.test.ts:132-140`
("disables stable token reuse when appended reference definitions can change
links": asserts `canReuse === false`, `divergeAt === 0`) and `:337-348`
("falls back to a full re-lex…"). Component fixtures for identity/lifecycle:
`src/lib/test/issues/issue-328/TrackedParagraph.svelte`; streaming test
harness `src/lib/test/streaming/harness.ts` (`useStreamingTestHarness`,
`flushStreamingBatch`).

Conventions: see Plan 006/008.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                         | Expected                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| Typecheck     | `pnpm check`                                                                                                                                    | 0 errors                  |
| Focused tests | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/streaming-token-reuse.test.ts src/lib/SvelteMarkdown.issue-328.test.ts` | pass                      |
| Full tests    | `pnpm test`                                                                                                                                     | all pass, coverage ≥ 90%  |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                | `✔ No issues`             |
| Paired bench  | Plan 006/007 protocol, `STREAM_COMPARE_SCENARIO=citations`, A = main, B = branch, 5 iterations, 1 warmup, twice                                 | parity 0, deltas recorded |
| Attribution   | `STREAM_COMPARE_SCENARIO=citations node scripts/stream-compare-attribute.mjs`                                                                   | bucket table              |

## Scope

**In scope**:

- `src/lib/utils/incremental-parser.ts` + `incremental-parser.test.ts`
- `src/lib/utils/streaming-token-reuse.ts` + test (export a whole-tree helper)
- `src/lib/SvelteMarkdown.svelte`
- `src/lib/Parser.svelte` (dev-only update counter ONLY)
- `src/lib/SvelteMarkdown.issue-328.test.ts`
- `.agents/.plans/stream-vs-streamdown/evidence/009/`, batch `README.md`

**Out of scope**: `render-metadata.ts`; `parse-and-cache.ts`/`token-cleanup.ts`
except the seeded-lexer helper in Part B if placed in `parse-and-cache.ts`
(say so in the commit); any weakening of the Plan 008 comparator; docs claims.

## Git workflow

- Branch: `perf/citation-definitions-semantic-reuse` off `main` after 008.
- Commits: `perf(streaming): reuse semantically unchanged tokens after a reference definition`,
  `perf(streaming): re-lex only roots that reference a newly defined label`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Renderer-work observable (dev-only) and failing test

In `src/lib/Parser.svelte`, next to the existing `__svmParserCount` block,
add a dev-only `window.__svmParserUpdateCount` incremented in a `$effect`
that reads `sanitizedRest` (so it runs once per props change of any Parser
instance). Guarded by `import.meta.env.DEV && typeof window !== 'undefined'`
exactly like the existing counter.

In `src/lib/SvelteMarkdown.issue-328.test.ts` add a test (pattern: "keeps
unchanged list item DOM mounted…"):

1. Stream, via `writeChunk` + `flushStreamingBatch`, 20 paragraphs where only
   paragraphs 5 and 15 contain `[1]`; all others are plain.
2. Read `window.__svmParserUpdateCount`, then reset it to 0.
3. `writeChunk('[1]: https://example.com/study\n')`, flush.
4. Assert: paragraphs 5 and 15 now contain `<a href="https://example.com/study">`;
   the update count is ≤ 4 × (number of Parser instances under paragraphs 5
   and 15) — i.e. bounded by the citing paragraphs, NOT the whole document.
   Compute the bound from `__svmParserByType` if needed; document the formula
   in the test.
5. Parity: compare `container.textContent` and all `a[href]` against a fresh
   non-streaming `render(SvelteMarkdown, { source: fullSource })`.

**Verify**: focused run → the update-count assertion FAILS with a count on
the order of the whole document (every Parser updated).

### Step 2 (Part A): `reuseMode` and whole-tree semantic reuse

Parser: add `reuseMode: 'prefix' | 'tree' | 'none'` to `IncrementalUpdateResult`
(`'prefix'` = today's canReuse path; `'tree'` = append-only but
reference-sensitive, consumer must compare index-aligned across the whole
array; `'none'` = not append-only). Keep `canReuse` = `reuseMode === 'prefix'`.
In tree mode return `divergeAt: 0`, `divergeOffset: undefined` (full metadata
walk is intentional: inline children may differ without `raw` changing; keys
are source offsets, so re-assigning identical keys is a no-op for Svelte).

Reuse util: export `reuseStableTokenTree(prev, next)` wrapping
`reuseStableNodeArray` (JSDoc + tests: identical roots reused; a root whose
child `href` changed is a NEW object whose unchanged siblings are reused;
different lengths keep the shared range).

Component: `streamTokens = reuseMode === 'prefix' ? reuseStableTokenArray(...) : reuseMode === 'tree' ? reuseStableTokenTree(streamTokens, newTokens) : newTokens`;
`canSkipRenderMetadataPrefix = reuseMode === 'prefix' && divergeOffset !== undefined`.

Update the two existing parser tests to the new contract (`canReuse === false`,
`reuseMode === 'tree'`, full re-lex still asserted).

**Verify**: Step 1 test PASSES (bounded update count, hrefs correct, parity);
focused suites pass.

### Step 3: Measure Part A

Paired bench `citations` (A = main, B = branch), twice; attribution for
`citations` on B. Record `totalWorkMsMedian`, `peakWorkMsMedian`,
`framesOverBudgetMedian`, `libraryFlushMsMedian`, `parityMismatches`.

**Verify**: parity 0; `framesOverBudget` ≤ 5; `peakWorkMs` ≤ 20. If total work
is already below Streamdown's paired result, skip Part B and record why.
Otherwise continue.

### Step 4 (Part B): Verify marked's seeded-lexer behavior, then red test

Verify in a scratch script (`/tmp`, not committed) with the installed marked:
`const l = new Lexer(opts); l.tokens.links = { ref: { href: '/x', title: null } }; l.lex('See [ref].')`
yields a `link` token with `href: '/x'`. If it does not, STOP (Part B's
mechanism does not exist in this marked version).

Red test in `incremental-parser.test.ts`: spy on `lexAndClean`; stream a
document with 10 paragraphs where only paragraph 3 cites `[a]`; append
`[a]: /docs\n`. Assert the source passed to the lexer on that update is NOT
the whole document (today it is — fails). Assert streamed tokens equal a fresh
full lex (semantic parity via Plan 008's comparator).

### Step 5 (Part B): Targeted re-lex for a newly defined label

In `incremental-parser.ts`, when `appendAddsDefinition` is true and the
update is append-only:

1. Extract the new definition labels from the appended text and boundary line
   (regex from `REFERENCE_DEFINITION_RE`, capture the label; normalize like
   marked: `label.toLowerCase().replace(/\s+/g, ' ')`). If a label cannot be
   extracted unambiguously, fall back to today's full re-lex (`'tree'` mode).
2. Lex the appended tail as usual (it contains the `def` tokens). Collect the
   complete link map: the previous map (store `lexer.tokens.links` from the
   last parse in parser state) merged with the new defs.
3. Find prefix roots whose `raw` contains `[` + a use of any new label
   (`[label]` not followed by `(`, or `][label]`), case-insensitive; use
   `String.prototype.toLowerCase` on the root raw once. For each such root,
   lex ONLY that root's `raw` with a fresh `Lexer` whose `tokens.links` is
   pre-seeded with the complete map, then run the same cleanup
   (`shrinkHtmlTokens`) the normal path uses; splice the result in place
   (a single root lexes to a single root plus possibly a trailing `space`;
   if it lexes to a different count, STOP-fallback to a full re-lex for this
   update).
4. Return `reuseMode: 'tree'` with `usedTailWindow: true`; the component's
   tree reuse keeps everything else.

If `walkTokens`/custom `tokenizer`/non-tail-safe extensions are active
(`tailWindowDisabled`), keep the full re-lex.

**Verify**: Step 4 red test passes (lexer called with fragments only; parity
holds); all reference tests in `incremental-parser.test.ts` pass; new tests
for: label with mixed case/whitespace, label used in a list item and a
blockquote (nested roots), two definitions in one chunk, definition of an
unused label (no root re-lexed), duplicate definition (marked keeps the first
— parity with fresh lex must hold).

### Step 6: Measure Part B and full gate

Paired bench `citations` twice + attribution. `pnpm check`,
`trunk fmt && trunk check --fix`, `pnpm test`. Record everything under
`evidence/009/README.md` and in the batch README.

**Verify**: parity 0; `framesOverBudget` 0; ours `totalWorkMsMedian` <
Streamdown's paired median in both repeats — or the plan is marked partial
with the numbers and the dominant attribution bucket.

## Test plan

- Red anchors: (A) dev-only Parser update count proportional to the document
  today, bounded after; (B) lexer called with the full document today,
  fragments after.
- Parity after every chunk for the chunked definition stream (from Plan 008)
  must remain green with Part B.
- Component-level: hrefs resolve; non-citing paragraphs' DOM identity kept;
  textContent parity with a non-streaming render.
- All existing reference-handling tests, updated to the new contract, green.

## Done criteria

- [ ] `pnpm check` 0 errors; `pnpm test` exits 0 with the new tests passing
- [ ] `grep -n "reuseMode" src/lib/utils/incremental-parser.ts src/lib/SvelteMarkdown.svelte` shows definition and consumption
- [ ] `grep -n "export const reuseStableTokenTree" src/lib/utils/streaming-token-reuse.ts` matches
- [ ] Paired bench `citations`: parity 0; `framesOverBudget` 0 (Part B) or ≤ 5 (Part A only, with justification); result vs Streamdown recorded
- [ ] `evidence/009/README.md` archived
- [ ] No files outside scope modified

## STOP conditions

- Plan 008 is not merged (the comparator still ignores `href`): tree reuse
  would keep stale links.
- Step 4 seeded-lexer check fails on the installed marked.
- Parity mismatches > 0 at any intermediate chunk in any test or bench run.
- A targeted re-lex of a single root yields a different root count.
- The Step 1 update-count bound cannot be met after Part A (report the count
  and which Parser types updated — likely a prop-churn source for Plan 010).

## Maintenance notes

- The seeded link map is parser state; `resetStream`/`streamId` changes must
  clear it (they recreate the parser, which does).
- If marked changes how `tokens.links` is consumed, the Step 4 check is the
  tripwire; keep it as a unit test.
- Extensions that define their own reference-like syntax are outside the
  regex; they keep the conservative full re-lex path.
