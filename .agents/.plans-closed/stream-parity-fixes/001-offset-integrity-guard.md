# Plan 001: Guard tail-window offsets with a source-length integrity check

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits.
>
> **Drift check (run first)**:
> `git diff --stat 119cc58..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts`
> If any of these changed since this plan was written, compare the "Current
> state" excerpts against the live code; on a mismatch, STOP.

## Status

- **Priority**: P0 (content loss)
- **Effort**: S–M
- **Risk**: MED
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `119cc58`, 2026-09-29

## Why this matters

The streaming parser re-lexes only the tail of the source and computes where
that tail starts by arithmetic on token lengths
(`sourceLength - raw.length`). That is only valid when every token's length
equals the source it consumed. marked breaks the assumption in at least two
ways: it normalizes `\r\n` to `\n` (tokens are shorter than their source
span) and it consumes a duplicate reference definition without emitting any
token. The reparse offset then lands in the wrong place and content is lost
or leaked, permanently:

```text
source "a\r\n\r\nb" in 3-char chunks
  streamed: space"\n\n" paragraph"b"              <- paragraph "a" is gone
  fresh:    paragraph"a" space"\n\n" paragraph"b"

"# Title\r\n\r" -> streamed paragraph" Title"    <- heading became a paragraph

duplicate "[1]: https://b.example" -> streamed paragraph"le"  <- URL leaks as text
```

Patching each cause is a losing game (plan 013 of the previous batch found
three variants of one mechanism). This plan adds a general invariant: after
every lex, the consumed length must equal the source length; when it does
not, the tail window is not used until it does again. Correctness holds for
causes nobody has thought of, and only the rare odd document pays with a
full re-lex per update.

## Current state

`src/lib/utils/incremental-parser.ts` (1149 lines at `119cc58`):

```ts
// :346-348 — the length every offset computation trusts
private getTokenSourceLength = (token: Token): number => {
    return (token as HtmlToken).sourceLength ?? token.raw.length
}

// :805-838 parseSource — tail-window branch
const tailTokens = lexAndClean(source.slice(boundary.reparseOffset), this.options, false)
return {
    tokens: this.prevTokens.slice(0, boundary.prefixCount).concat(tailTokens),
    tailTokens,
    usedTailWindow: true,
    reusedPrefixCount: boundary.prefixCount
}

// :871-915 getNextTailWindowBoundary(tokens, sourceLength, hasHtmlSpanMismatch)
if (tokens.length === 0 || hasHtmlSpanMismatch) return { prefixCount: 0, reparseOffset: 0 }
let cut = tokens.length - 1
let reparseOffset = sourceLength - this.getTokenSourceLength(tokens[cut])
// + one-token walk-back for list / indented code before a trailing space

// :956-990 updateCachedState — computes hasHtmlSpanMismatch (tail-only on the
// tail-window path, whole array otherwise) and calls getNextTailWindowBoundary
```

`prevHasHtmlSpanMismatch` is the existing precedent for "this document cannot
use the tail window right now": a boolean carried between updates that
forces the `{ prefixCount: 0, reparseOffset: 0 }` boundary, which makes
`canUseTailWindow` return false (`boundary.reparseOffset <= 0`).

Plan 011 of the previous batch made per-update work independent of document
length, pinned by tests in `describe('Streaming Bookkeeping Performance')`
(`incremental-parser.test.ts:~666+`) and the dev-only stream counters. The
integrity check must not add an O(document) pass on the tail-window path.

Red tests already written (they assert correct behavior and currently fail;
`const red = process.env.PARITY_STRICT ? it : it.fails`):

- `src/lib/utils/incremental-parser.parity.test.ts`, `describe('A. offset integrity …')`:
  "CRLF line endings do not drop earlier content", "CRLF prose keeps parity
  at every chunk size", "a duplicate reference definition does not leak its
  URL as text", "a duplicate definition streamed character by character
  keeps parity".
- `src/lib/SvelteMarkdown.parity.test.ts`, `describe('A. offset integrity')`:
  "CRLF source keeps every paragraph", "a duplicate definition renders no
  stray text".

Conventions: TypeScript strict; arrow-function class members; JSDoc with
`@param`/`@returns`/`@example` on non-trivial helpers; Vitest; Trunk for
lint/format (`trunk fmt`, `trunk check --fix`); never `eslint-disable`
(use `// trunk-ignore(eslint/<rule>)` if unavoidable); cyclomatic
complexity limit 15 per function; conventional commits.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose                  | Command                                                                                                                                                                  | Expected                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| Red tests, real failures | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts`                                                  | bucket A tests fail before, pass after |
| Parser suites            | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/incremental-parser.streaming-fence.test.ts src/lib/utils/incremental-parser.nested-html.test.ts` | all pass                               |
| Full tests               | `pnpm test`                                                                                                                                                              | all pass, coverage ≥ 90%               |
| Typecheck                | `pnpm check`                                                                                                                                                             | 0 errors                               |
| Lint + format            | `trunk fmt && trunk check --fix`                                                                                                                                         | `✔ No issues`                          |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`,
`src/lib/utils/incremental-parser.parity.test.ts` and
`src/lib/SvelteMarkdown.parity.test.ts` (ONLY to change bucket A `red(` to
`it(` and to add guards), `src/lib/utils/incremental-parser.test.ts` (new
tests only).

**Out of scope**: buckets B and C in the parity suites (plans 002/003);
`token-cleanup.ts`; `SvelteMarkdown.svelte`; normalizing line endings in the
component's buffer (offset-mode chunks address the caller's original text).

## Steps

### Step 1: Confirm the red state

Run the red-test command. Record which bucket A tests fail and their
messages. If any bucket A red test already passes, STOP.

### Step 2: Track consumed length and refuse the tail window when it does not add up

Add an integrity flag to the parser state, parallel to
`prevHasHtmlSpanMismatch`:

- Tail-window path: the prefix is covered by `boundary.reparseOffset` by
  construction, so only the tail needs summing:
  `sum(getTokenSourceLength(tailToken)) === source.length - boundary.reparseOffset`.
  This is O(tail).
- Full re-lex path: sum every root token and compare with `source.length`.
  The lex itself was already O(document).
- Targeted definition path (`parseDefinitionUpdate`): treat like the
  tail-window path for the tail it lexed; re-lexed prefix roots must each
  consume exactly the root's previous source length, otherwise return
  `undefined` so the caller falls back to a full re-lex.

When the check fails, the result of THIS update must still be correct: if a
tail-window or targeted parse fails the check, discard it and do a full
re-lex for this update. Then store the flag so
`getNextTailWindowBoundary` returns `{ prefixCount: 0, reparseOffset: 0 }`
while the full-source sum does not match. The flag is recomputed on every
full re-lex, so a document whose mismatch goes away (it will not for CRLF,
it can for other causes) regains the tail window.

Keep `getNextTailWindowBoundary` under the complexity limit; extract a
`sumSourceLength(tokens)` helper with JSDoc.

**Verify**: red-test command → every bucket A test passes in both files;
parser suites all pass.

### Step 3: Flip the bucket A tests and add guards

In both parity test files change the bucket A `red(` calls to `it(`. Add to
`incremental-parser.test.ts` (in `describe('Tail Window Reparsing')`):

1. A CRLF document never reports `usedTailWindow: true` and every update
   equals a one-shot parse.
2. An LF-only document still reports `usedTailWindow: true` on appends after
   the first update (the guard must not disable the fast path).
3. After a duplicate definition the stream keeps parity through three more
   appended paragraphs.

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts src/lib/utils/incremental-parser.test.ts`
→ all pass; buckets B, C and the tricky-corpus fuzz remain "expected fail".

### Step 4: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- Red anchors: the six bucket A tests named above, failing at `119cc58`.
- New guards: CRLF never uses the tail window but stays correct; LF keeps the
  fast path; parity after a duplicate definition.
- The "Streaming Bookkeeping Performance" tests must pass unchanged.

## Done criteria

- [ ] All bucket A tests are `it(` (not `red(`) and pass
- [ ] `PARITY_STRICT=1` run shows no bucket A failure
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean
- [ ] No O(document) work added on the tail-window path (bookkeeping tests pass unchanged)
- [ ] No files outside scope modified

## STOP conditions

- A "Streaming Bookkeeping Performance" test fails and cannot be satisfied
  without an O(document) pass on the tail-window path.
- Any existing test would need its assertion weakened.
- A bucket A test still fails after the guard is in place — report the
  chunk, source, and streamed vs fresh shapes from the failure message.

## Maintenance notes

- A CRLF document now costs a full re-lex per update. Normalizing line
  endings inside the parser would restore the tail window, but offset-mode
  chunks address the caller's original text, so it needs its own design.
- `getTokenSourceLength` stays the single place that defines a token's
  source span; anything that changes how cleanup rewrites `raw` must keep the
  sum equal to the source length or the guard will (correctly) turn the fast
  path off.
