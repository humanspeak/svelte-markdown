# Plan 013: The tail-window boundary must not treat a list (or indented code) as closed at a blank or whitespace-only line

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 9ec976f..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/incremental-parser.test.ts`
> If either file changed since this plan was written, compare the "Current
> state" excerpts against the live code before proceeding; on a mismatch,
> treat it as a STOP condition.

## Status

- **Priority**: P0 (correctness; blocks 006's parity gate and every later measurement)
- **Effort**: S–M
- **Risk**: MED (parser boundary logic; the fix must stay O(1) per append)
- **Depends on**: 008 (its Step 2b lands in the same file and must be committed first)
- **Category**: bug
- **Planned at**: commit `9ec976f`, 2026-09-28 (amended; original `6892589`)

## Why this matters

Plan 006's new semantic parity check found that streaming ordinary prose
produces a different token tree from a one-shot parse: a nested bullet list
is split into two top-level lists, and the split sits in the reused prefix
forever (31 of 31 parity checks failed on the `prose-mixed` corpus). Guard
reproduced the mechanism in Node against the built package (2026-09-28):

```text
first chunk  "- a\n  - b\n "     → tokens list,space   boundary prefixCount=1 reparseOffset=9
append       " - c\n"            → streamed list,space,list   fresh list       MISMATCH
first chunk  "- a\n\n"           → tokens list,space   boundary prefixCount=1 reparseOffset=3
append       "- b\n"             → streamed list,space,list   fresh list       MISMATCH
```

Cause: `getNextTailWindowBoundary` marks the LAST token unstable and assumes
every earlier token is closed. When the last token is a `space` (a blank line
or a whitespace-only line), the block before it is treated as closed. But a
blank line does not close a list — a following list item continues it as a
loose list — nor an indented code block (a further indented line continues
it). The next chunk is then lexed in isolation and starts a new block.

This is a pre-existing rendering bug, not a bench artifact: any LLM answer
that puts blank lines between bullets (common) renders as several lists
while streaming, and the acceptance contract for this batch (zero parity
mismatches) cannot be met until it is fixed. Plan 006 is BLOCKED on it.

## Current state

`src/lib/utils/incremental-parser.ts` (as of `38271dc`; Plan 008 Step 2b
touches `update()`, not these helpers):

```ts
// :169-190
private isStableAtSourceEnd = (token: Token): boolean => {
    if (token.type === 'space') return false
    // ... (fence comment)
    if (token.type === 'code') return CLOSED_FENCE_RE.test(token.raw)
    if (token.raw.endsWith('\n\n')) return true
    switch (token.type) {
        case 'heading':
        case 'hr':
            return token.raw.endsWith('\n')
        default:
            return false
    }
}

// :485-508
private getNextTailWindowBoundary = (tokens, sourceLength, hasHtmlSpanMismatch) => {
    if (tokens.length === 0 || hasHtmlSpanMismatch) return { prefixCount: 0, reparseOffset: 0 }
    const lastToken = tokens[tokens.length - 1]
    if (this.isStableAtSourceEnd(lastToken)) {
        return { prefixCount: tokens.length, reparseOffset: sourceLength }
    }
    return {
        prefixCount: tokens.length - 1,
        reparseOffset: sourceLength - this.getTokenSourceLength(lastToken)
    }
}
```

`getTokenSourceLength(token)` returns `sourceLength ?? raw.length`. The
boundary is computed once per committed update (`updateCachedState`) and read
in O(1) by `update()`; existing tests in the "Streaming Bookkeeping
Performance" describe block pin that no per-append prefix scan is added.

Block-closing facts (marked, GFM): a blank line ends a paragraph, heading,
blockquote, table, html block, and `def`. It does NOT end a list (next item →
same loose list) or an indented code block (next indented line → same
block). marked emits the blank line(s) as a separate `space` token after a
list; a whitespace-only trailing line (`"\n "`) also lexes as `space`.

Test file: `src/lib/utils/incremental-parser.test.ts`; `describe` blocks
include "Tail Window Reparsing" (line ~326), "Streaming Bookkeeping
Performance" (~666), "Extension streaming parity" (~910). Helper
`expectSemanticParity(streamed, fresh, source)` was added by Plan 008 near
the top of the file (uses `isSameStableNode` from
`./streaming-token-reuse.js`); reuse it. `lexAndClean` is imported as
`parseAndCacheModule.lexAndClean`.

The `prose-mixed` corpus that fails lives in
`src/routes/test/stream-compare/+page.svelte` (`section(index)`): heading,
paragraph, a bullet list with two nested items, blockquote, ts fence, table.

Conventions: TypeScript strict; arrow-function class members; JSDoc on
non-trivial helpers; Vitest; Trunk for lint/format; no `eslint-disable`;
conventional commits (`fix(streaming): …`).

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                         | Expected                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Typecheck     | `pnpm check`                                                                                                                                                    | 0 errors                 |
| Focused tests | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/incremental-parser.streaming-fence.test.ts src/lib/utils/streaming-reuse-repro.test.ts` | pass                     |
| Full tests    | `pnpm test`                                                                                                                                                     | all pass, coverage ≥ 90% |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                | `✔ No issues`            |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`,
`src/lib/utils/incremental-parser.test.ts`, batch `README.md` (status row,
by the reviewer).

**Out of scope**: `streaming-token-reuse.ts`, `SvelteMarkdown.svelte`,
`render-metadata.ts`, the bench page/runner (Plan 006 resumes after this),
`CLOSED_FENCE_RE`/fence handling (already correct).

## Git workflow

- Work on `perf/stream-bench-flush-timing` (batch branch) — the reviewer
  commits.
- Commit message (reviewer): `fix(streaming): keep lists open across blank lines at the tail-window boundary`.

## Steps

### Step 1: Failing parity tests

Add a `describe('Tail-window boundary across blank lines')` block with a
`streamParity(chunks: string[])` helper that feeds cumulative sources to one
`IncrementalParser({ gfm: true })` and, after EVERY chunk, calls
`expectSemanticParity(result.tokens, parseAndCacheModule.lexAndClean(source, options, false), source)`.
Cases:

1. Nested item then whitespace line: `['- a\n  - b\n ', ' - c\n']` (the
   original repro).
2. Loose list via blank line: `['- a\n\n', '- b\n']`.
3. Loose list then a real paragraph: `['- a\n\n', 'para\n']` (must end the
   list: list, space, paragraph — parity holds both before and after the fix;
   include it as a guard).
4. Ordered list with blank lines and a nested bullet:
   `['1. a\n\n', '2. b\n', '   - c\n\n', '3. d\n']`.
5. Indented code continued after a blank line:
   `['    code1\n\n', '    code2\n']` (fresh: one `code` token).
6. Chunk-boundary sweep over the `prose-mixed` section: copy the `section(0)`
   string from `src/routes/test/stream-compare/+page.svelte` into the test as
   a constant (two sections concatenated, ~1.2 KB) and stream it at chunk
   sizes 1, 7, 32 and 64, asserting parity after every chunk. This is the
   test that mirrors the bench failure.

**Verify**: focused run → cases 1, 2, 4, 5 and the sweep FAIL (root count or
`isSameStableNode` false); case 3 passes.

### Step 2: Keep continuable blocks in the re-lexed tail

In `getNextTailWindowBoundary`, after determining that the last token is
unstable, walk back while the token before the cut is one that a blank line
does not close and the cut token is `space`:

```ts
/** Blocks a blank or whitespace-only line does NOT terminate: the next
 *  chunk may continue them, so they must be re-lexed with the tail. */
private canContinueAcrossBlankLine = (token: Token): boolean =>
    token.type === 'list' || (token.type === 'code' && !CLOSED_FENCE_RE.test(token.raw) && !/^ {0,3}(`{3,}|~{3,})/.test(token.raw))
```

(An indented code block has no fence marker; an OPEN fence is already kept
in the tail by `isStableAtSourceEnd`.)

```ts
let cut = tokens.length
let reparseOffset = sourceLength
if (!this.isStableAtSourceEnd(tokens[cut - 1])) {
    cut--
    reparseOffset -= this.getTokenSourceLength(tokens[cut])
}
// A trailing `space` does not close a list or indented code block; pull
// that block into the tail too (one extra token — still O(1) per append).
if (cut > 0 && tokens[cut].type === 'space' && this.canContinueAcrossBlankLine(tokens[cut - 1])) {
    cut--
    reparseOffset -= this.getTokenSourceLength(tokens[cut])
}
return { prefixCount: cut, reparseOffset }
```

Also make `isStableAtSourceEnd` return `false` for `list` before the
`endsWith('\n\n')` test (a list at the very end of the source is never
closed, whatever its raw ends with), with a one-line comment.

Keep the change O(1): at most two tokens inspected. Do not scan the token
array.

**Verify**: focused run → all Step 1 cases PASS; every existing test in the
file passes, including the "Streaming Bookkeeping Performance" block (no new
prefix scans) and "Code Fences".

### Step 2c (added 2026-09-28): A heading or thematic break at the source end is not stable

State: Step 2 is committed at `9ec976f`; cases 1–5 and the size-7 sweep are
green; the sweep fails at sizes 1, 32, 64 with, e.g.:

```text
prev   "# Long streaming benchmark\n"        (heading frozen with raw "# Long streaming benchmark\n")
source "# Long streaming benchmark\n\n"
streamed heading{raw:"# Long streaming benchmark\n"}, space{raw:"\n"}
fresh    heading{raw:"# Long streaming benchmark"},   space{raw:"\n\n"}
```

Cause: `isStableAtSourceEnd` returns `true` for `heading`/`hr` whose raw
ends with `\n` (`incremental-parser.ts:186-188`). marked assigns the trailing
newlines differently once a blank line follows, so freezing the heading one
chunk early yields a different `raw` split than a one-shot parse.

Fix: in `isStableAtSourceEnd`, remove the `heading`/`hr` special case so
both fall through to `return false` (the generic `raw.endsWith('\n\n')` test
stays above it). A heading that is the LAST token is re-lexed with the next
chunk (a few dozen bytes); once anything follows it, it becomes part of the
prefix through the normal `prefixCount = cut` path, exactly as the existing
test "reuses a fully stable trailing heading boundary" expects (that test
starts from `# Title\n\n`, where the heading is NOT last, so it is
unaffected). Update the comment above the switch accordingly (or delete the
switch and leave `return false` with a comment listing heading/hr).

If any existing test pins the old behavior (a trailing heading with raw
ending in a single `\n` treated as stable), STOP and report the test name —
do not edit it.

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.test.ts` → the
sweep passes at sizes 1, 7, 32 and 64; all other tests unchanged.

### Step 3: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test` (coverage ≥ 90%).

## Test plan

- Red anchors: cases 1, 2, 4, 5 and the chunk-size sweep over the prose
  section; all fail today with a split list (or split code block).
- Guard: case 3 (blank line then paragraph still closes the list) passes
  before and after.
- Existing fence, table, HTML and bookkeeping tests unchanged and green.

## Done criteria

- [ ] `pnpm check` 0 errors; `pnpm test` exits 0 with the new describe block passing
- [ ] `grep -n "canContinueAcrossBlankLine" src/lib/utils/incremental-parser.ts` matches (definition + use)
- [ ] The chunk-size sweep test over the prose section exists and passes for sizes 1, 7, 32, 64
- [ ] No files outside scope modified

## STOP conditions

- The excerpts in Current state do not match live code beyond Plan 008's
  Step 2b change in `update()`.
- Any "Streaming Bookkeeping Performance" test fails after Step 2 (the fix
  must not add a scan).
- Case 3 fails after Step 2 (the list is no longer closed by a blank line +
  paragraph) — the walk-back is too aggressive.
- The sweep still fails at some chunk size after Step 2c: report the chunk
  size, the source at the first mismatch, and the streamed vs fresh token
  shapes — there may be a second continuable block type (blockquote lazy
  continuation, table) to handle; do not guess it in.

## Maintenance notes

- If marked changes how it tokenizes blank lines after lists (e.g. folds
  them into the list raw), `canContinueAcrossBlankLine` may become
  unnecessary; the sweep test is the tripwire either way.
- The cost of this fix is one extra re-lex of the whole list on the one or
  two frames where the stream pauses on a blank line after it. That is the
  correct price; do not "optimize" it away without parity coverage.
