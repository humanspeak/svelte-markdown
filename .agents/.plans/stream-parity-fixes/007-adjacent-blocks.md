# Plan 007: Do not freeze a block that is adjacent to the open last block

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits.
>
> **Drift check (run first)**:
> `git diff --stat c259df8..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/incremental-parser.fuzz.test.ts`
> If either changed since this plan was written, compare the "Current state"
> excerpts against the live code; on a mismatch, STOP.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001, 002, 003, 005, 006
- **Category**: bug
- **Planned at**: commit `c259df8`, 2026-09-29

## Why this matters

After plan 006 the reviewer ran a third independent corpus (now
`ADJACENT_BLOCKS` in `src/lib/utils/incremental-parser.fuzz.test.ts`, red
with 17 failing documents of 120). Every failure is one idea: a block is
frozen into the reused prefix although NO BLANK LINE separates it from the
still-open last block, and the last block then merges into it.

```text
source ends '1.\n2.'                (empty list item, then the next marker)
  streamed: list"1.\n" list"2."
  fresh:    list"1.\n2."
  -> after '1.\n2' the tokens were list"1.\n" paragraph"2"; the list was frozen.

source ends 'Line\\\n#N'             (a line that only LOOKS like a heading)
  streamed: paragraph"Line\\\n" paragraph"#N"
  fresh:    paragraph"Line\\\n#N"
  -> after 'Line\\\n#' the tokens were paragraph + heading"#"; the paragraph was
     frozen; '#N' is not a heading, so it is a lazy continuation line.
```

The existing rules hold a list across a blank line and a partial ordered
marker, and a definition across a title line. Those are special cases of the
same principle. In CommonMark, a line that turns out to be paragraph text
continues the previous paragraph, list item or blockquote (lazy
continuation); a line can turn a paragraph into a setext heading; a line
after a table is another row. None of that can happen across a blank line.

## Current state

`src/lib/utils/incremental-parser.ts` after plans 001–006 (read the live
file). The boundary is decided in `getNextTailWindowBoundary`:

1. The last token is never frozen.
2. `countHeldTokens` holds up to two tokens before it:
   whitespace-only last line → the block before it; trailing blank line
   after a list or indented code → that block; `list|indented code, space,
paragraph(partial ordered marker)` → the list and the blank line;
   `def, block opening like a title` → the definition.
3. `isUnsafeCut(tokens, cut)` refuses the boundary (full re-lex next update)
   when the cut falls inside one HTML block that cleanup split into several
   roots, or after a root that leaves marked's inline state non-default.
4. Unclosed HTML constructs and a source-length mismatch empty the boundary.

All of this inspects a fixed number of tokens. The "Streaming Bookkeeping
Performance" tests and the dev stream counters pin that no per-update work
scans the document; the task-list test "keeps tail-window reparsing enabled
for task lists without definitions" pins that an ordinary list followed by a
blank line and a paragraph still uses the tail window.

Performance constraint: the `large-closed-block` benchmark streams a 2 KB
tail after a 20 KB closed list, with a blank line between them. A rule keyed
on ADJACENCY (no blank line) does not touch that case: the list is followed
by a `space` token.

Conventions: TypeScript strict; arrow-function class members; JSDoc on
non-trivial helpers; Vitest; Trunk for lint/format; never `eslint-disable`;
cyclomatic complexity limit 15 per function; conventional commits.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose                     | Command                                                                                                                                                                                               | Expected                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Fuzz, real failures         | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.fuzz.test.ts`                                                                                                                       | 17 failing documents before, 0 after      |
| Parser, parity, HTML suites | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts src/lib/utils/incremental-parser.nested-html.test.ts` | all pass                                  |
| Full tests                  | `pnpm test`                                                                                                                                                                                           | all pass, 0 expected fail, coverage ≥ 90% |
| Typecheck                   | `pnpm check`                                                                                                                                                                                          | 0 errors                                  |
| Lint + format               | `trunk fmt && trunk check --fix`                                                                                                                                                                      | `✔ No issues`                             |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`;
`src/lib/utils/incremental-parser.fuzz.test.ts` (flip the `red(` case; add
blocks and cases, never remove them);
`src/lib/utils/incremental-parser.parity.test.ts`,
`src/lib/utils/incremental-parser.test.ts`,
`src/lib/SvelteMarkdown.parity.test.ts` (new tests; implementation-pinning
allowance: an assertion about WHICH source was lexed or whether the tail
window was used may change when the new behavior is parity-correct; OUTPUT
assertions may not).

**Out of scope**: `token-cleanup.ts`, `SvelteMarkdown.svelte`,
`streaming-token-reuse.ts`, `render-metadata.ts`; the `reuseMode` /
`divergeAt` contract.

## Steps

### Step 1: Confirm the red state and group the failures

Run the fuzz with `PARITY_STRICT=1`. Group the 17 failing documents. Expect
two groups (empty list item followed by a marker; a look-alike block start
that becomes a lazy continuation line). Write the minimal chunk sequence for
each group, and for any further group you find.

### Step 2: Targeted red tests

In `incremental-parser.parity.test.ts`, parity after every chunk, written
BEFORE the fix; each document also at chunk sizes 1, 2 and 3:

- `'1.\n2. after empty ordered\n\n'` and `'-\n- after empty item\n\n'`
- `'Line\\\n#NotAHeading\n\n'`
- `'Para\n#NotAHeading\n\n'` and `'- item\n#NotAHeading\n\n'` and
  `'> quote\n#NotAHeading\n\n'` (lazy continuation into each container)
- `'Paragraph then setext?\n---\n\n'` and `'Title\n===\n\n'`
- `'| a | b |\n|---|---|\n| c | d |\nrow without pipes\n\n'`
- `'Para\n\`\`\n\n'` (two backticks: not a fence)
- Guards that must stay green: a heading directly followed by a list; a
  closed fence directly followed by a paragraph; a paragraph, a blank line,
  then a heading (the paragraph must join the prefix once the heading is
  followed by another token — assert `usedTailWindow` on a later append).

Record which are red.

### Step 3: One adjacency rule

In the boundary decision, hold the token before the cut when it is ADJACENT
to the last token — no `space` token between them — unless its type can
never absorb or be changed by a following line: `heading` (ATX), `hr`,
`space`, and a CLOSED fenced code block. Everything else (paragraph, list,
blockquote, table, def, html, indented code, and any token type you do not
recognize) is held. Apply it after the existing holds, inspecting a fixed
number of tokens.

Then simplify: the partial-ordered-marker rule and the definition-title rule
are instances of adjacency or of "separated only by a blank line". Remove
the ones the new rule makes redundant ONLY if every test still passes
without them; keep the ones that cover the blank-line case (a list or
indented code continues across a blank line; adjacency does not cover that).

**Verify**: Step 2 tests pass; the task-list test and the bookkeeping
performance tests pass unchanged.

### Step 4: Turn the fuzz green, then attack it yourself

Run the fuzz with `PARITY_STRICT=1`; at 0 failing documents flip the
`red(` case to `it(`.

Then write your OWN corpus of at least 40 new blocks that are not in the
file, aimed at breaking the parser: pairs and triples of blocks without
blank lines, every block type directly followed by every other, partial
markers of every kind (a lone hash, dash, double dash, equals sign,
greater-than, pipe, backtick, tilde, digit, digit plus dot, less-than,
opening bracket, and exclamation mark), nested containers three deep, and the
blocks the three existing corpora use, combined. Add it as a fifth case and
run 200 documents × 8 chunkings.

For every failure: state the mechanism, write a minimal red test, and fix it
if the rule is a per-token or fixed-window check. Repeat until that case is
green. Report every mechanism you found this way.

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.fuzz.test.ts`
→ 5 passed, 0 expected fail.

### Step 5: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- Red anchors: the fuzz adjacency case (17 failing documents) and the
  targeted tests from Step 2.
- Guards: closed blocks still join the prefix; task-list and bookkeeping
  tests unchanged.
- The executor's own corpus is a fifth permanent fuzz case.

## Done criteria

- [ ] `grep -rn "red(" src/lib/utils/incremental-parser.fuzz.test.ts src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts` → no matches
- [ ] The fuzz has five cases, all `it(`, all green; the fifth has at least 40 blocks written by the executor
- [ ] `PARITY_STRICT=1` run of the fuzz and both parity files is fully green
- [ ] `pnpm test` exits 0 with 0 expected fail; `pnpm check` 0 errors; `trunk check` clean
- [ ] Bookkeeping performance tests and the task-list test pass unchanged
- [ ] Report lists every mechanism found, its minimal reproduction, the rule that fixes it, and the final boundary rules in one place
- [ ] No files outside scope modified

## STOP conditions

- A mechanism can only be fixed by scanning the token array per update, or by
  holding a block in the tail although a blank line separates it from
  everything after it (other than the existing list / indented-code rule).
- An OUTPUT-pinning assertion would have to change.
- The task-list test or a bookkeeping performance test fails.
- After three fix iterations on your own corpus it still reports failures:
  stop, report the remaining mechanisms with reproductions, and leave that
  case `red(`.

## Maintenance notes

- The boundary principle is now: the reused prefix ends at the last blank
  line that closes a block, not at the last token boundary. Lists and
  indented code are the two blocks a blank line does not close.
- Any new parity report gets a block in the generative fuzz first.
