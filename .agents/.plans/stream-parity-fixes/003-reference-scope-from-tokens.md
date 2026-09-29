# Plan 003: Detect reference definitions from marked's tokens, not from line regexes

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits.
>
> **Drift check (run first)**:
> `git diff --stat <Planned-at SHA>..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/parse-and-cache.ts`
> Plans 001 and 002 are EXPECTED to have changed `incremental-parser.ts`.
> Re-read the live code for every excerpt; proceed if the differences are
> only theirs; otherwise STOP.

## Status

- **Priority**: P1
- **Effort**: M–L
- **Risk**: MED–HIGH (rewrites the reference-detection decision in `update`)
- **Depends on**: 001, 002
- **Category**: bug
- **Planned at**: commit `<filled by reviewer at dispatch>`, 2026-09-29

## Why this matters

When a reference definition arrives after the text that cites it, the
earlier reference must turn into a link. The parser decides whether that
happened with line-anchored regexes over the appended text
(`REFERENCE_DEFINITION_RE = /^\s{0,3}\[[^\]\n]+\]:/m` and
`appendTouchesReferenceDefinition`). Anything the regex cannot see leaves the
earlier reference as plain text permanently:

```text
'See [a].\n\n' | '[a]:\n' | '/x\n'            URL on the next line
'See [one].\n\n' | '> [one]: /in-quote\n'      definition inside a blockquote
'See [two].\n\n' | '- [two]: /in-list\n'       definition inside a list item
'See [r].\n\n[r]: /a' | '\n"Title"\n'          title arrives on the next line
```

In every case the streamed token SHAPES equal a one-shot parse, but the
citing paragraph has a `text` child where the one-shot parse has a `link`
(or a link without its `title`).

The previous batch already built the right source of truth:
`collectDefinitions(tokens, links)` walks marked's own `def` tokens
recursively (including inside blockquotes and lists), and
`lexAndClean(source, options, isInline, links)` lexes a fragment with a
pre-seeded link map. This plan makes the decision from those tokens.

## Current state

`src/lib/utils/incremental-parser.ts` (line numbers at `119cc58`):

```ts
// :55  REFERENCE_DEFINITION_RE, :101 DEFINITION_LABEL_RE — line-anchored / regex label scans
// :123 collectDefinitions(tokens, links) — recursive, from `def` tokens
// :154 getChangedLabels(before, after, shadowing)
// :412 hasReferenceDefinition(source)               — regex over source
// :442 appendIntroducesMatch(source, matches)       — appended slice + boundary line
// :472 appendTouchesReferenceDefinition(source)     — skips appends that start with a line break
// :570 canUseTailWindow(...)                        — returns false when the prefix has a
//                                                     definition (prevHasReferenceDefinition)
//                                                     and the tail has a reference use
// :628 parseDefinitionUpdate(source, boundary)      — targeted re-lex: tail seeded with the
//                                                     prefix's definitions + citing roots re-lexed
// :956 updateCachedState — prevHasPotentialReferenceUse / prevHasReferenceDefinition from regexes

// :1092 update()
const appendAddsDefinition = isAppendOnly && this.appendTouchesReferenceDefinition(source)
const referenceInvalidatesTail = this.prevHasPotentialReferenceUse && appendAddsDefinition
const parseResult = this.parseSource(source, boundary, isAppendOnly, referenceInvalidatesTail)
```

So the decision "did a definition change?" is taken BEFORE lexing, from
regexes. The fix is to take it AFTER lexing the tail, from the tail's `def`
tokens compared with the definitions known so far.

Cheap necessary condition: every reference definition contains `]:`. A tail
source without `]:` cannot add or change one, so the common prose path needs
no definition work at all.

Red tests (currently failing):

- `src/lib/utils/incremental-parser.parity.test.ts`, `describe('C. reference scope …')`:
  "a definition whose URL is on the next line resolves earlier uses", "a
  definition nested in a blockquote resolves earlier uses", "a definition
  nested in a list item resolves earlier uses", "a definition indented by
  four or more columns inside a container resolves", "a definition title
  arriving on the following line updates earlier uses".
- `src/lib/SvelteMarkdown.parity.test.ts`, `describe('C. reference scope')`:
  "a definition inside a blockquote links an earlier reference".
- `describe('D. fuzz …')`: "tricky documents keep parity under random
  chunking" — after plans 001–003 this must pass.

Existing tests that pin IMPLEMENTATION (which source string was lexed) in
`incremental-parser.test.ts`: "falls back to a full re-lex when
reference-style syntax could change the prefix" (`:388`), "re-enables
tail-window reparsing after a one-time shortcut definition re-lex" (`:404`),
"falls back to a full re-lex when reference syntax is split across chunks"
(`:446`), "resolves a full reference use split across the append boundary"
(`:487`), "keeps full reference syntax conservative until its definition
arrives" (`:518`), and the scan-count tests in
`describe('Streaming Bookkeeping Performance')` that spy on
`hasReferenceDefinition` / `appendIntroducesMatch`.

Conventions: see plan 001.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose                  | Command                                                                                                                                         | Expected                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Red tests, real failures | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts`                         | bucket C + fuzz fail before, pass after |
| Parser + reuse suites    | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/streaming-token-reuse.test.ts src/lib/SvelteMarkdown.issue-328.test.ts` | all pass                                |
| Full tests               | `pnpm test`                                                                                                                                     | all pass, coverage ≥ 90%                |
| Typecheck                | `pnpm check`                                                                                                                                    | 0 errors                                |
| Lint + format            | `trunk fmt && trunk check --fix`                                                                                                                | `✔ No issues`                           |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`;
`src/lib/utils/incremental-parser.test.ts`; the two parity test files (flip
bucket C and the fuzz `red(` to `it(`, add guards);
`src/lib/utils/parse-and-cache.ts` only if the seeded-lex helper needs a
change (say so in your report).

**Out of scope**: `SvelteMarkdown.svelte` (the `reuseMode` contract it
consumes must not change); `streaming-token-reuse.ts`; `render-metadata.ts`;
buckets A and B.

## Steps

### Step 1: Confirm the red state

Run the red-test command; record the bucket C and fuzz failures.

### Step 2: Keep the definitions known so far as parser state

Maintain a link map of every definition in the document so far
(`collectDefinitions` over the root tokens after a full re-lex; merged from
the tail's definitions after a tail-window update — first definition of a
label wins, as in marked). Reset it wherever `prevTokens` is reset. This
replaces `prevHasReferenceDefinition` as the answer to "does the prefix
define anything?".

### Step 3: Lex the tail seeded, then decide

On an append-only update with a usable tail window:

1. Lex the tail with `lexAndClean(tailSource, options, false, knownLinks)` so
   references in the tail resolve against definitions in the prefix. This
   removes the need for `canUseTailWindow` to fall back to a full re-lex
   when "the prefix has a definition and the tail has a use".
2. If the tail source contains `]:`, collect the tail's definitions and
   compare them with the definitions the PREVIOUS tail contributed
   (`getChangedLabels`). No `]:` → no definition work.
3. If a label was added or changed AND the prefix can contain a use of it
   (`prevHasPotentialReferenceUse`, or better the per-root check already in
   `findCitingRoots`), take the reference-sensitive path exactly as today:
   targeted re-lex of the citing roots when it is cheap
   (`parseDefinitionUpdate`), full re-lex otherwise, and report
   `reuseMode: 'tree'`.
4. Otherwise it is a normal tail-window update (`reuseMode: 'prefix'`).

Remove `appendTouchesReferenceDefinition` and the regex-based
`hasReferenceDefinition` decision from `update`. Keep
`hasPotentialReferenceUse*` if they are still the cheap use-detector, or
replace them with a token-derived flag if that is simpler — but do not add
an O(document) pass per update.

Plan 001's integrity guard and plan 002's boundary rule must keep working:
run their tests after this step.

**Verify**: red-test command → every bucket C test passes and the tricky
fuzz passes; buckets A and B still pass.

### Step 4: Update tests that pin the old implementation

For each test listed under "Existing tests that pin IMPLEMENTATION":

- If it asserts OUTPUT (tokens, hrefs, `reuseMode`, `divergeAt`), it must
  pass unchanged.
- If it asserts WHICH SOURCE was lexed or HOW MANY TIMES a removed helper was
  called, update the assertion to the new behavior ONLY when the new
  behavior is parity-correct and does no more work than before (a fragment
  or the tail instead of the whole document). Keep the test's name honest —
  rename it if it no longer "falls back to a full re-lex". List every such
  test in your report with the old and new assertion.
- Never delete a test.

Add guards to `incremental-parser.test.ts`: a tail reference resolves
against a definition nested in a blockquote in the prefix without a full
re-lex (spy on `lexAndClean`: the lexed source is the tail); prose without
`]:` performs no definition collection (spy on the collector or assert via
the dev stream counters).

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.test.ts` → all pass.

### Step 5: Flip bucket C and the fuzz test; full gate

Change bucket C and the tricky-corpus fuzz `red(` calls to `it(`. After this
step there must be no `red(` left in either parity file; keep the `red`
helper and its comment for future use. Then `pnpm check`,
`trunk fmt && trunk check --fix`, `pnpm test`.

**Verify**: `grep -n "red(" src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts`
→ no matches; `pnpm test` reports 0 "expected fail".

## Test plan

- Red anchors: six bucket C tests plus the tricky-corpus fuzz.
- Output-pinning reference tests pass unchanged; implementation-pinning ones
  are updated only as Step 4 allows and are listed in the report.
- New guards: nested prefix definition resolved from a tail-only lex; no
  definition work without `]:`.

## Done criteria

- [ ] No `red(` call remains in the two parity files; `pnpm test` shows 0 expected failures
- [ ] `PARITY_STRICT=1` run is fully green
- [ ] `grep -n "appendTouchesReferenceDefinition" src/lib/utils/incremental-parser.ts` → no matches
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0, coverage ≥ 90%; `trunk check` clean
- [ ] Report lists every implementation-pinning test that changed, with old and new assertions
- [ ] No files outside scope modified

## STOP conditions

- An OUTPUT-pinning test would have to change.
- The fuzz still fails after Step 3: report document name, seed, chunk,
  source, and shapes.
- The `reuseMode` / `divergeAt` contract consumed by `SvelteMarkdown.svelte`
  would have to change.
- A per-update O(document) pass cannot be avoided.

## Maintenance notes

- Definitions are now whatever marked says they are. New definition-like
  syntax from an extension is covered as long as the extension emits `def`
  tokens; otherwise that extension must not be marked tail-safe.
- The `]:` pre-filter is the only textual shortcut left; if it is ever
  removed, prose updates will pay a definition walk over the tail.
