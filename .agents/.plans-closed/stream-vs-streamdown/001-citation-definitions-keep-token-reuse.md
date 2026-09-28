# Plan 001: Keep token reuse when a reference definition arrives mid-stream

> **SUPERSEDED (2026-09-28)** by the revised batch (plans 006–012) after
> [ADVERSARIAL-REVIEW.md](ADVERSARIAL-REVIEW.md). Do not execute. Kept for
> the reasoning and excerpts only.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dea763..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/streaming-token-reuse.ts src/lib/SvelteMarkdown.svelte`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `7dea763`, 2026-09-27

## Why this matters

When an LLM answer ends with a sources block (`[1]: https://…`, one line per
source) and the body cited those sources with `[1]` markers, every definition
line that streams in makes `IncrementalParser.update()` report
`canReuse: false` and `divergeAt: 0`. `SvelteMarkdown.svelte` then replaces the
entire token array with fresh objects, so every component in the document
receives new props and Svelte re-renders the whole tree. Measured on
2026-09-27 (evidence in `.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`):
on a 24 KB citation-heavy corpus with 40 definitions, 44 of 753 frames exceed
the 16.7 ms budget, peak frame work is 81–84 ms, and svelte-streamdown 4.2.0
does 2.8–3.0× less total main-thread work than we do. Outside those 44 spikes
our per-frame cost is prose-like (p50 3.7 ms).

The full re-lex on each definition is correct and stays: marked's reference
map is per-lex, so the prefix must be re-lexed to resolve `[1]` into a link.
What is wasteful is throwing away token identity afterwards. Most root tokens
come back byte-identical; only paragraphs that actually cite the newly defined
label change (a `text` child becomes a `link` child). After this plan, the
parser still re-lexes, but the component reuses every unchanged root and
unchanged nested token, so Svelte updates only the paragraphs that changed.

Expected delta on the `citations` bench scenario: `framesOverBudget` 44 → ≤ 5,
`peakWorkMs` 81–84 → ≤ 20, `totalWorkMs` 4,750–5,323 → roughly 3,300–3,800
(the prose gap). Other scenarios unchanged.

## Current state

Files:

- `src/lib/utils/incremental-parser.ts` — streaming parser; decides
  `canReuse`/`divergeAt` (lines ~555–640, method `update`).
- `src/lib/utils/streaming-token-reuse.ts` — `reuseStableTokenArray` (exported)
  reuses the stable PREFIX up to `divergeAt` and merges the single diverged
  root; the module-private `reuseStableNodeArray` does index-aligned reuse over
  a WHOLE array, recursing into children.
- `src/lib/SvelteMarkdown.svelte` — `applyStreamingSource` (lines ~168–195)
  chooses between `reuseStableTokenArray` and wholesale replacement.

`src/lib/utils/incremental-parser.ts:575-612` (today):

```ts
const referenceSensitive = this.isReferenceSensitiveUpdate(
    source,
    isAppendOnly,
    referenceInvalidatesTail
)
const canReuse = isAppendOnly && !referenceSensitive
// ...
let divergeAt = 0
let divergeOffset: number | undefined = parseResult.usedTailWindow ? boundary.reparseOffset : 0
if (!referenceSensitive) {
    const minLen = Math.min(this.prevTokens.length, newTokens.length)
    while (divergeAt < minLen) {
        // ... compares prev/next with isSameStableNode, accumulates divergeOffset
        divergeAt++
    }
}
```

`src/lib/utils/incremental-parser.ts:47-60` result shape:

```ts
export interface IncrementalUpdateResult {
    tokens: Token[]
    divergeAt: number
    divergeOffset?: number
    canReuse: boolean
    usedTailWindow: boolean
}
```

`src/lib/SvelteMarkdown.svelte:177-195` (today):

```ts
const { tokens: newTokens, divergeAt, divergeOffset, canReuse } = parser.update(nextSource)
// ... comment block about replacing the array wholesale (#291) ...
streamTokens = canReuse ? reuseStableTokenArray(streamTokens, newTokens, divergeAt) : newTokens
const canSkipRenderMetadataPrefix = canReuse && divergeOffset !== undefined
streamRenderMetadataStartIndex = canSkipRenderMetadataPrefix ? divergeAt : 0
streamRenderMetadataStartOffset = canSkipRenderMetadataPrefix ? divergeOffset : 0
```

`src/lib/utils/streaming-token-reuse.ts:84-110` — `reuseStableNodeArray` is
private and does exactly the index-aligned whole-array reuse this plan needs:

```ts
const reuseStableNodeArray = (
    previousArray: ReusableStreamingNodeArray,
    nextArray: ReusableStreamingNodeArray
): ReusableStreamingNodeArray => {
    const limit = Math.min(previousArray.length, nextArray.length)
    let reusedArray: ReusableStreamingNodeArray | undefined
    for (let index = 0; index < limit; index++) {
        // reuses previousItem when isSameStableNode, else merges children
    }
    return reusedArray ?? nextArray
}
```

Why reusing is safe here: render keys are source offsets (`src:<offset>`,
assigned in `src/lib/utils/render-metadata.ts` by `assignSequentialSourceKeys`).
A root whose `raw` is unchanged has an unchanged offset, so Svelte's keyed
`{#each}` keeps the same DOM whether or not the object is reused; reuse just
stops the prop churn. `isSameStableNode` compares `type`, `raw`/`text`, and
recursively every nested token array, so a paragraph whose `[1]` text became a
link is correctly detected as changed (its children differ in `type`).

Existing tests that pin the current behavior and must be UPDATED (not deleted):

- `src/lib/utils/incremental-parser.test.ts:132-140` — "disables stable token
  reuse when appended reference definitions can change links" asserts
  `canReuse === false` and `divergeAt === 0`.
- `src/lib/utils/incremental-parser.test.ts:337-348` — "falls back to a full
  re-lex when reference-style syntax could change the prefix" asserts the full
  re-lex (keep) and `divergeAt === 0` (revisit per Step 3).

Conventions: TypeScript strict, arrow-function class members, JSDoc with
`@param`/`@returns`/`@example` on exported and non-trivial private helpers (see
the existing helpers in `incremental-parser.ts`). Tests use Vitest with
`describe`/`it`; component tests use `@testing-library/svelte` with the
streaming harness (`src/lib/test/streaming/harness.ts`:
`useStreamingTestHarness()` and `flushStreamingBatch()`). Commit messages are
conventional commits, e.g. `perf(streaming): keep extension streams incremental
via tail-safe markers (#359)`. Never use `eslint-disable`; use
`// trunk-ignore(eslint/<rule>)` if suppression is unavoidable.

## Commands you will need

`pnpm` is not on PATH in non-interactive shells on this machine. Prefix
every command below with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose        | Command                                                                                                                                                                                              | Expected on success                           |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Install        | `pnpm install --frozen-lockfile`                                                                                                                                                                     | exit 0                                        |
| Typecheck      | `pnpm check`                                                                                                                                                                                         | `0 ERRORS` (3 pre-existing warnings are fine) |
| Unit tests     | `pnpm vitest run <file>`                                                                                                                                                                             | all pass                                      |
| Full tests     | `pnpm test`                                                                                                                                                                                          | all pass; coverage summary ≥ 90% lines        |
| Lint + format  | `trunk fmt && trunk check --fix`                                                                                                                                                                     | `✔ No issues`                                 |
| Build preview  | `pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                                                                                                               | preview serves `/test/stream-compare`         |
| Bench (before) | `STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=3 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=citations pnpm perf:stream-compare > /tmp/001-before.log` | exit 0; `median total work` line printed      |
| Bench (after)  | same, redirect to `/tmp/001-after.log`                                                                                                                                                               | exit 0                                        |

The bench needs a production preview running in another shell (or backgrounded).
Kill it with `pkill -f "vite preview"` afterwards. Read results with
`grep -E "median|over 16.7ms" /tmp/001-*.log`.

## Scope

**In scope** (the only files you should modify):

- `src/lib/utils/incremental-parser.ts`
- `src/lib/utils/incremental-parser.test.ts`
- `src/lib/utils/streaming-token-reuse.ts`
- `src/lib/utils/streaming-token-reuse.test.ts`
- `src/lib/SvelteMarkdown.svelte`
- `src/lib/SvelteMarkdown.issue-328.test.ts` (add the component-level test here;
  it already has the tracked-fixture pattern)
- `.agents/.plans/stream-vs-streamdown/README.md` (status row only)

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/utils/render-metadata.ts` — the full metadata walk on these updates
  is intentional and cheap (one O(N) pass per definition line).
- `src/lib/utils/parse-and-cache.ts`, `token-cleanup.ts` — lexing is unchanged.
- Avoiding the full re-lex itself (seeding marked's link map, label-scoped
  invalidation). Deferred; see Maintenance notes.
- `README.md` — no public API changes.

## Git workflow

- Branch: `perf/citation-definitions-token-reuse` off `main`.
- One commit per step or logical unit, conventional-commit style:
  `perf(streaming): reuse unchanged tokens after a reference definition`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Write a failing component test that observes the whole-tree re-render

In `src/lib/SvelteMarkdown.issue-328.test.ts`, add a test inside the existing
top-level `describe` modeled on "keeps unchanged list item DOM mounted while a
later item grows during streaming". Use the `TrackedParagraph` fixture
(`src/lib/test/issues/issue-328/TrackedParagraph.svelte`) as the `paragraph`
renderer, with `onParagraphMount`/`onParagraphDestroy` callbacks that count
mounts and destroys per paragraph text.

Scenario:

1. Render `<SvelteMarkdown source="" streaming renderers={{ paragraph: TrackedParagraph }} />`.
2. `writeChunk('Intro paragraph without citations.\n\nSee the study [1] for details.\n\nAnother plain paragraph.\n\n')`, flush.
3. Record the `<p>` elements (`container.querySelectorAll('p')`) and the
   mount counter.
4. `writeChunk('[1]: https://example.com/study\n')`, flush.
5. Assert:
    - the paragraph containing `[1]` now contains an `<a href="https://example.com/study">` (parity: the definition resolved);
    - the FIRST and THIRD `<p>` elements are the same DOM nodes as recorded in
      step 3 (`toBe`), i.e. not remounted;
    - `onParagraphDestroy` was never called for "Intro paragraph without
      citations." or "Another plain paragraph.";
    - additionally assert prop stability: pass a `text`-renderer fixture is NOT
      required — DOM identity plus destroy-count is the observable.

Also add a parser-level assertion in `src/lib/utils/incremental-parser.test.ts`
next to the existing "disables stable token reuse…" test (do not modify that
one yet): call `update('See [the docs][ref]\n\nPlain.\n\n')` then
`update('See [the docs][ref]\n\nPlain.\n\n[ref]: https://example.com')` and
assert the result exposes a whole-tree reuse signal (the exact field is
defined in Step 2: `reuseMode === 'tree'`). This test will fail to compile
until Step 2; that is the expected red state for it.

Note: with today's code the DOM-identity assertions in the component test
will most likely already pass, because the keyed `{#each}` preserves DOM by
source-offset key even when token objects are replaced. That is expected.
Keep the component test as a parity + no-remount guard; the RED anchor for
this plan is the parser-level `reuseMode` assertion. (A renderer-update-count
observable would need a new fixture under `src/lib/test/issues/issue-328/`,
which Plan 003 creates as `TrackedText.svelte`; if Plan 003 has already
landed, you may additionally assert that non-citing paragraphs' text
renderers received no updates after the definition arrived.)

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.test.ts` → the
new test FAILS (TypeScript/property error on `reuseMode`, or
`expected 'tree' received undefined`).
`pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts` → new component
test passes or fails only on the link-parity assertion; record which.

### Step 2: Expose whole-tree reuse from the parser

In `src/lib/utils/incremental-parser.ts`:

1. Extend `IncrementalUpdateResult` with
   `reuseMode: 'prefix' | 'tree' | 'none'` and JSDoc:
    - `'prefix'` — tokens before `divergeAt` are byte-identical; the consumer
      may reuse them positionally (today's `canReuse === true` behavior);
    - `'tree'` — the update was append-only but a reference definition may
      have changed inline children anywhere; the consumer must compare every
      root (and nested arrays) index-aligned and reuse the unchanged ones;
    - `'none'` — not append-only (edit/replace); take the new tokens as-is.
2. Compute it in `update`:
   `const reuseMode = !isAppendOnly ? 'none' : referenceSensitive ? 'tree' : 'prefix'`.
   Keep `canReuse` in the result for backward compatibility with existing
   tests; define it as `reuseMode === 'prefix'` (unchanged semantics).
3. When `reuseMode === 'tree'`, still return `divergeAt: 0` and
   `divergeOffset: undefined` (the consumer must do a full render-metadata
   walk because inline children may have changed without `raw` changing).
   Update the JSDoc comment above the divergence loop to say so.

In `src/lib/utils/streaming-token-reuse.ts`, export a new function:

````ts
/**
 * Reuses every previous token object (roots and nested arrays) whose stable
 * identity is unchanged, index-aligned across the whole array. Used after a
 * reference definition arrives: `raw` is unchanged for most roots but inline
 * children of citing paragraphs may differ, so a prefix-only reuse is wrong.
 *
 * @param previousTokens - Tokens from the previous streaming render
 * @param nextTokens - Freshly parsed tokens for the whole document
 * @returns `nextTokens` with unchanged objects swapped for their previous identities
 * @example
 * ```ts
 * const reused = reuseStableTokenTree(prev, next)
 * reused[0] === prev[0] // true when the first root is byte-identical
 * ```
 */
export const reuseStableTokenTree = (previousTokens: Token[], nextTokens: Token[]): Token[] =>
    reuseStableNodeArray(
        previousTokens as ReusableStreamingNodeArray,
        nextTokens as ReusableStreamingNodeArray
    ) as Token[]
````

Add unit tests in `src/lib/utils/streaming-token-reuse.test.ts` (model on
"reuses stable list items and nested inline tokens inside a diverged list
token"): (a) identical roots at index 0 and 2 are reused while index 1 with a
changed child type is a new object whose unchanged children are reused; (b)
arrays of different length reuse the shared range and keep extra next tokens.

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/streaming-token-reuse.test.ts`
→ Step 1 parser test PASSES; new reuse tests pass; the OLD test "disables
stable token reuse when appended reference definitions can change links"
still passes (canReuse is still false there).

### Step 3: Use whole-tree reuse in the component

In `src/lib/SvelteMarkdown.svelte`, `applyStreamingSource`:

```ts
const { tokens: newTokens, divergeAt, divergeOffset, reuseMode } = parser.update(nextSource)
// (keep the existing #291 comment block about wholesale replacement)
streamTokens =
    reuseMode === 'prefix'
        ? reuseStableTokenArray(streamTokens, newTokens, divergeAt)
        : reuseMode === 'tree'
          ? reuseStableTokenTree(streamTokens, newTokens)
          : newTokens
const canSkipRenderMetadataPrefix = reuseMode === 'prefix' && divergeOffset !== undefined
```

Import `reuseStableTokenTree` alongside `reuseStableTokenArray`. Add one
sentence to the comment: tree mode follows a reference definition; the full
metadata walk that follows (`startIndex 0`) is intentional because keys are
source offsets and re-assigning identical keys is a no-op for Svelte.

Update the two existing parser tests listed in Current state so they assert
the new contract: `canReuse === false`, `reuseMode === 'tree'`,
`divergeAt === 0`. Do not weaken the assertion that the full source was
re-lexed (`lexSpy.mock.calls[1]?.[0]).toBe(appended)`).

**Verify**: `pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts src/lib/utils/incremental-parser.test.ts`
→ all pass, including the Step 1 component test's link-parity assertion.

### Step 4: Full gate and bench

1. `pnpm check` → 0 errors. `trunk fmt && trunk check --fix` → no issues.
2. `pnpm test` → all pass, coverage ≥ 90%.
3. Bench before/after (see Commands). Before numbers come from the evidence
   README if you prefer not to rebuild `main`: citations `totalWorkMs` median
   4,750–5,323; `framesOverBudget` 44; `peakWorkMs` 81–84.
4. Record the after numbers in the commit body and in the README status row.

**Verify**: `grep -E "median|over 16.7ms" /tmp/001-after.log` → ours
`framesOverBudget ≤ 5` and `peakWorkMs ≤ 20` for the `citations` scenario.

## Test plan

- Red anchor: parser-level test asserting `reuseMode === 'tree'` after an
  appended definition that can resolve an earlier use. Fails at plan time
  (field does not exist), passes after Step 2.
- Component guard in `SvelteMarkdown.issue-328.test.ts`: definition resolves
  to `<a>`; non-citing paragraphs are not remounted or destroyed.
- `streaming-token-reuse.test.ts`: two new cases for `reuseStableTokenTree`.
- Existing reference tests updated to the new contract, full re-lex still
  asserted.
- `pnpm test` → all pass including the new tests.

## Done criteria

- [ ] `pnpm check` exits with 0 errors
- [ ] `pnpm test` exits 0; new tests exist and pass
- [ ] `grep -n "reuseMode" src/lib/utils/incremental-parser.ts src/lib/SvelteMarkdown.svelte` shows the field defined and consumed
- [ ] `grep -n "export const reuseStableTokenTree" src/lib/utils/streaming-token-reuse.ts` matches
- [ ] Bench `citations`: `framesOverBudget ≤ 5`, `peakWorkMs ≤ 20` (3 iterations, headless production preview)
- [ ] No files outside the in-scope list are modified (`git status`)
- [ ] `.agents/.plans/stream-vs-streamdown/README.md` status row updated with the after numbers

## STOP conditions

Stop and report back (do not improvise) if:

- The excerpts in "Current state" do not match the live code.
- After Step 3 the component test shows a non-citing paragraph destroyed or
  remounted — this means keys or offsets shifted; do not paper over it.
- The bench after Step 4 still shows `framesOverBudget > 15` on `citations`.
  Report the `libraryFlushMsMedian` too: if it is most of the total, the
  remaining cost is the full re-lex, which is deliberately out of scope.
- Any existing test outside the two listed needs its assertion weakened.

## Maintenance notes

- A later plan may avoid the full re-lex by checking whether the newly
  defined label is actually used in the prefix (normalize like marked:
  lowercase, collapse whitespace) and, if not, treating the definition like a
  plain append. That is the next lever for citation-heavy output; it was
  deferred to keep this change to identity handling only.
- Reviewers should confirm `reuseMode === 'tree'` never coincides with a
  non-append update (edits must stay `'none'`; `reuseStableNodeArray` assumes
  index alignment).
- If `isSameStableNode` gains new compared fields, tree reuse inherits them
  automatically; if it ever stops comparing children, tree reuse would keep
  stale links — the parity assertion in the component test guards that.
