# Plan 005: Close the boundary gaps found by the generative fuzz

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits.
>
> **Drift check (run first)**:
> `git diff --stat 181ab17..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/incremental-parser.fuzz.test.ts`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code; on a mismatch, STOP.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001, 002, 003
- **Category**: bug
- **Planned at**: commit `181ab17`, 2026-09-29

## Why this matters

Plans 001–003 turned every targeted parity test green. The reviewer then ran
an independent generative fuzz — random documents assembled from markdown
building blocks, random chunk boundaries, parity checked after every update
— and 27 of 120 documents still diverged from a one-shot parse. The fuzz is
now a permanent test (`src/lib/utils/incremental-parser.fuzz.test.ts`); its
core-block guard is green and its gap case is red with 13 failing documents.
Three mechanisms remain:

**1. A definition is frozen before its title line arrives** (about three
quarters of the failures, and the only one that changes what users see):

```text
source ends  '[d]: /d\n"Title on next line"'
  streamed: def"[d]: /d\n" paragraph"\"Title on next line\""
  fresh:    def"[d]: /d\n\"Title on next line\""
```

The tokens were `def, paragraph` with the paragraph last, so the `def` was
frozen. The title renders as a stray paragraph and the link never gets its
`title`.

**2. A block is frozen while the last line is whitespace-only.** A trailing
`space` token that does not end a line yet may still turn into indentation,
and marked assigns the previous block's trailing newline differently once it
does:

```text
source ends  '# Heading one\n    i'
  streamed: heading"# Heading one" space"\n" code"    i"
  fresh:    heading"# Heading one\n" code"    i"
```

Same rendering, different `raw` split — and `raw.length` feeds the
source-offset render keys, so parity is required.

**3. After a dropped duplicate definition, blank lines split differently for
one update.** Plan 001's executor kept a fast-path result that failed the
length check and only disabled the NEXT fast path (its reasoning: a tail
lexed from a valid boundary is correct). The fuzz shows the kept result is
not byte-identical to a one-shot parse:

```text
  streamed: space"\n\n" space"\n"
  fresh:    space"\n\n\n"
```

It self-heals on the next update (a full re-lex), but the contract is parity
after every update.

## Current state

`src/lib/utils/incremental-parser.ts` after plans 001–003 (read the live
file; these are the relevant pieces):

- `getNextTailWindowBoundary(tokens, sourceLength, offsetsUnsafe)`: cuts the
  last token; when the last token is `space` and the token before it
  `canContinueAcrossBlankLine` (a list or indented code), pulls that token
  into the tail; when the tokens end `list|indented code, space,
paragraph` and the paragraph is a partial ordered marker
  (`PARTIAL_ORDERED_MARKER_RE = /^ {0,3}\d{1,9}$/`), pulls the list and the
  blank line into the tail. It inspects at most three tokens.
- `parseSource` / `parseFullSource`: every parse result carries
  `hasLengthMismatch`; `updateCachedState` stores it as
  `prevHasLengthMismatch`, which empties the next boundary.
- The tail is lexed seeded with `knownLinks` (plan 003); definitions are
  compared from `def` tokens when the tail contains `]:`.

Tests that must keep passing unchanged in spirit:
`describe('Streaming Bookkeeping Performance')` and the dev stream counters
(per-update work must not scan the document), the task-list test
"keeps tail-window reparsing enabled for task lists without definitions",
every case in `incremental-parser.parity.test.ts` and
`SvelteMarkdown.parity.test.ts`, and the core-block guard in the fuzz file.

Performance context the fix must respect: the benchmark scenario
`large-closed-block` streams a 2 KB tail after a 20 KB closed nested list.
A rule that keeps the previous block in the tail WHENEVER a block follows it
would re-lex that 20 KB list on every frame. Rules here must only hold a
block while the stream is actually sitting on the ambiguous boundary.

Conventions: TypeScript strict; arrow-function class members; JSDoc on
non-trivial helpers; Vitest; Trunk for lint/format; never `eslint-disable`;
cyclomatic complexity limit 15 per function; conventional commits.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose                | Command                                                                                                                                                                                               | Expected                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Fuzz, real failures    | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.fuzz.test.ts`                                                                                                                       | 13 failing documents before, 0 after      |
| Parser + parity suites | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts src/lib/utils/incremental-parser.nested-html.test.ts` | all pass                                  |
| Full tests             | `pnpm test`                                                                                                                                                                                           | all pass, 0 expected fail, coverage ≥ 90% |
| Typecheck              | `pnpm check`                                                                                                                                                                                          | 0 errors                                  |
| Lint + format          | `trunk fmt && trunk check --fix`                                                                                                                                                                      | `✔ No issues`                             |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`;
`src/lib/utils/incremental-parser.fuzz.test.ts` (flip the `red(` case to
`it(`; you may ADD blocks or cases, never remove them);
`src/lib/utils/incremental-parser.test.ts` and
`src/lib/utils/incremental-parser.parity.test.ts` (new tests, and the
implementation-pinning allowance in Step 3).

**Out of scope**: `token-cleanup.ts`, `SvelteMarkdown.svelte`,
`streaming-token-reuse.ts`, `render-metadata.ts`; the `reuseMode` /
`divergeAt` / `reusedPrefixCount` contract.

## Steps

### Step 1: Confirm the red state and group the failures

Run the fuzz with `PARITY_STRICT=1`. For each failing document record the
streamed and fresh shapes and assign it to mechanism 1, 2 or 3 above. If a
failure fits none of them, record it as mechanism 4 and describe it; do not
fix it blind (see STOP conditions).

### Step 2: Definition followed by its title line (mechanism 1)

Add targeted red tests to `incremental-parser.parity.test.ts` first
(bucket B): `['[d]: /d\n', '"Title"\n']`, the same with single quotes and
with parentheses, character-by-character streaming of
`'See [d].\n\n[d]: /d\n"Long title here"\n\nAfter.\n'`, and a guard where
the line after the definition is ordinary prose (the definition must then
join the prefix as soon as another block follows).

Fix in `getNextTailWindowBoundary`: when the tokens end `def, paragraph`
(the paragraph being the cut last token) and the paragraph's raw, after at
most three leading spaces, starts with `"`, `'` or `(`, pull the `def`
into the tail as well. Inspect tokens only; do not scan.

**Verify**: the new tests pass; all parity and parser suites pass.

### Step 3: Length mismatch on a fast path re-lexes this update (mechanism 3)

When a tail-window or targeted parse reports `hasLengthMismatch`, discard it
and produce this update's tokens with a full re-lex, so the result is
byte-identical to a one-shot parse. This costs one full lex on the rare
update where marked drops or rewrites source.

Plan 001's executor avoided this because an existing test pins the targeted
path's lexer inputs for duplicate definitions ("keeps the first of duplicate
definitions, in one chunk and across chunks"). That test pins
IMPLEMENTATION. You may update assertions about WHICH source was lexed when
the new behavior is parity-correct; assertions about OUTPUT (tokens, hrefs,
`reuseMode`, `divergeAt`) must not change. Keep the test's name honest and
list every changed assertion in your report.

Add a parity test: `'Intro.\n\n[two]: /2 "Two"\n\n'` then
`'[two]: /2 "Two"\n'` then `'\nAfter.\n'`, parity after every chunk.

**Verify**: the new test passes; the fuzz failures assigned to mechanism 3
are gone.

### Step 4: Whitespace-only last line (mechanism 2)

Add targeted red tests first: `['# Heading one\n ', '   indented\n']`,
`['[a]: /x\n  ', '  code\n']`, `['Para.\n\n   ', ' more\n']`, each with
parity after every chunk.

Fix in `getNextTailWindowBoundary`: when the last token is `space` and its
raw does not end with a line break (the stream is inside a whitespace-only
line), pull the token before it into the tail too, whatever its type. The
existing rule for a trailing `space` that DOES end a line (lists and
indented code only) stays as it is — widening that one would re-lex every
block once more and is not needed.

**Verify**: the new tests pass; the task-list test and the bookkeeping tests
pass unchanged.

### Step 5: Turn the fuzz green and widen it

Run the fuzz with `PARITY_STRICT=1`. When it reports 0 failing documents,
flip its `red(` case to `it(`. Then add at least six more gap blocks of
your own choosing that pair blocks in ways not yet covered (for example: a
setext heading, a table directly followed by text, a blockquote followed by
an indented line, an ordered list starting at 9 with a two-digit successor,
a fence with a tilde marker, an autolink line). The fuzz must stay green
with them. If a new block exposes a further mechanism, STOP and report it.

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.fuzz.test.ts`
→ 2 passed, 0 expected fail.

### Step 6: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- Red anchors: the fuzz gap case (13 failing documents at plan time) and the
  targeted tests written first in Steps 2–4.
- Guards: prose after a definition still lets it join the prefix; the
  task-list and bookkeeping tests; the core-block fuzz.

## Done criteria

- [ ] `grep -rn "red(" src/lib/utils/incremental-parser.fuzz.test.ts src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts` → no matches
- [ ] `PARITY_STRICT=1` run of the fuzz and both parity files is fully green
- [ ] `pnpm test` exits 0 with 0 expected fail; `pnpm check` 0 errors; `trunk check` clean
- [ ] Bookkeeping performance tests pass unchanged
- [ ] The fuzz contains at least six additional gap blocks
- [ ] Report lists every implementation-pinning assertion that changed
- [ ] No files outside scope modified

## STOP conditions

- A fuzz failure fits none of the three mechanisms (before or after the
  fixes): report the document seed, chunking seed, source tail, and shapes.
- An OUTPUT-pinning assertion would have to change.
- A rule would need to scan the token array or hold a block in the tail for
  as long as any block follows it.
- The task-list test or a bookkeeping performance test fails.

## Maintenance notes

- The boundary rules are now: never freeze the last token; hold the previous
  block while the stream sits on a whitespace-only line; hold a list or
  indented code across a blank line and across a partial ordered marker;
  hold a definition across a possible title line. Any new rule needs a
  fuzz block that fails without it.
- The generative fuzz is the contract. Add a block to it whenever a parity
  bug is reported.
