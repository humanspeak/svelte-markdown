# Plan 010: A rule made of bullet markers can still become a list item

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits. Do not commit.
>
> **Drift check (run first)**:
> `git diff --stat c6241dd..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/incremental-parser.parity.test.ts`
> No change is expected; anything else: STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 005, 007
- **Category**: bug
- **Planned at**: commit `c6241dd`, 2026-09-29

## Why this matters

A blank line does not end a list: the next line may be another item. Plan
005 added a rule for the ordered case (`1. a`, blank line, `2` is a
paragraph until the `.` arrives: `countBlankLineHolds` rule 3 in
`src/lib/utils/incremental-parser.ts`). The bullet case has one shape the
rule does not know:

```text
'- a\n\n- - -'   => list"- a" space"\n\n" hr"- - -"
'- a\n\n- - -c'  => list"- a\n\n- - -c"            one list, second item "- -c"
```

While the thematic break is the open last line, the list before the blank
line was frozen. When the next character arrives, the stream shows two
lists; a one-shot parse shows one.

## Current state

- `countBlankLineHolds` and `countHeldTokens` in
  `src/lib/utils/incremental-parser.ts`; read their JSDoc first.
- Red tests (fail today), bucket B of
  `src/lib/utils/incremental-parser.parity.test.ts`: "a loose list stays one
  list when its next item first looks like a rule" with three sources.

Conventions: see plan 001.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                    | Expected                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| Red tests     | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.parity.test.ts --coverage.enabled=false` | 3 fail before, 0 after   |
| Parser suites | `pnpm vitest run src/lib/utils/incremental-parser --coverage.enabled=false`                                | all pass                 |
| Full tests    | `pnpm test`                                                                                                | all pass, coverage ≥ 90% |
| Typecheck     | `pnpm check`                                                                                               | 0 errors                 |
| Lint + format | `trunk fmt && trunk check --fix`                                                                           | `✔ No issues`            |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts` (`countBlankLineHolds`,
its helpers and JSDoc); `src/lib/utils/incremental-parser.parity.test.ts`
(flip the red tests, add guards); `src/lib/utils/incremental-parser.test.ts`
(new tests only).

**Out of scope**: everything else.

## Steps

### Step 1: Confirm the red state

Run the red-test command: exactly three failures, the three sources.

### Step 2: Establish from marked which open last lines can still join the list

With `marked.lexer(source, { gfm: true })`, for `list, blank line, X` where
X is the unfinished last line, find every X that is NOT a list or a partial
ordered marker today but becomes an item of the SAME list when more
characters arrive. Check at least: `- - -`, `* * *`, `-  -  -`, `- - -` indented by one space, `- - -` after an ordered list, `* * *` after a `-` list, `_ _ _`,
`---`, `***`, `+ + +`, and the same after indented code instead of a list.
Record the table in your report.

### Step 3: Extend the blank-line hold

Generalize rule 3 so it covers every row of your table that joins the
list. Prefer the simplest rule that is never wrong over the tightest one:
holding the list for one more update costs almost nothing, since the rule
applies only while that line is the last line of the stream. Decide from
the last token's `type` and `raw`; do not re-lex.

**Verify**: red-test command fully green.

### Step 4: Flip, add guards, full gate

Flip the three red tests to `it(`. Add a guard for every row of your table
at chunk sizes 1, 2 and 3, and one guard that a thematic break after a
paragraph and a blank line still lets the paragraph join the reused prefix
(`usedTailWindow` stays true on later appends). Then `pnpm check`,
`trunk fmt && trunk check --fix`, `pnpm test`.

## Done criteria

- [ ] No `red(` call remains in the parity or fuzz files; 0 expected failures
- [ ] Report contains the Step 2 table
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0, coverage ≥ 90%; `trunk check` clean
- [ ] No existing assertion changed; no files outside scope modified; nothing committed

## STOP conditions

- Any existing test would need its assertion changed.
- The fix needs to scan the token array or re-lex.

## Maintenance notes

- Stopping rule for this batch (reviewer's decision, 2026-09-29): this is
  the last fix plan. Independent corpora now find about one diverging
  document in several thousand adversarial ones. Anything the final guard
  run finds after this plan is anchored as a red test and documented as a
  known gap by plan 004, not fixed in this release.
