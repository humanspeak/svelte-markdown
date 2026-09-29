# Plan 008: Close the three mechanisms left after plan 007

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits. Do not commit.
>
> **Drift check (run first)**:
> `git diff --stat bf29d08..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/token-cleanup.ts src/lib/utils/incremental-parser.parity.test.ts`
> No change is expected; anything else: STOP.

## Status

- **Priority**: P0
- **Effort**: S–M
- **Risk**: MED
- **Depends on**: 001, 002, 003, 005, 006, 007
- **Category**: bug
- **Planned at**: commit `bf29d08`, 2026-09-29

## Why this matters

Plan 007 fixed adjacency. Three narrow mechanisms remain, each anchored by a
`red(` test in `src/lib/utils/incremental-parser.parity.test.ts`. They are
the last known cases where a streamed parse differs from a one-shot parse.
Independent corpora now find almost nothing else (1 of 400 random documents
and 11 of 3826 upstream-derived documents, all through these three), so this
plan is deliberately small: three fixes, no new corpus.

## Current state

Run `PARITY_STRICT=1` (see commands) to see the three failures.

### M1. A block-level tag name directly followed by a line break

Red test: "a tag cut before its closing bracket stays open across a blank
line" (bucket B). This is marked's own behavior, not cleanup's:

```text
marked.lexer('<div\n\ns')   => html"<div\n\ns"                    one root
marked.lexer('<div>\n\ns')  => html"<div>" space paragraph"s"
marked.lexer('</div\n\ns')  => html"</div\n\ns"                   one root
marked.lexer('<div\n\ns>\n\nafter') => html"<div\n\ns>" space paragraph"after"
marked.lexer('<span\n\ns')  => paragraph"<span" space paragraph"s"  (not block-level)
marked.lexer('<div class="a\n\nb">') => html"<div class=\"a" space paragraph ...
```

For a block-level tag name followed immediately by a line break, marked's
HTML rule consumes that line break as the delimiter after the name, so the
blank line that follows is not seen as a blank line and the block runs on
to the NEXT blank line or the end of input. The stream sees
`html"<div" space"\n\n"` at the moment the blank line arrives and freezes
`<div`.

### M2. An unclosed comment or processing instruction that contains a tag

Red test: "an unclosed HTML construct containing a tag stays open across a
blank line" (bucket B). `isUnterminatedHtmlBlock` (plan 006) recognizes the
unclosed opener from the root's raw. Once the block contains a tag,
`token-cleanup.ts` expands the block into several roots
(`<?pi\n<li>x</li>\n\n` => text `x` + space) and none of them carries the
opener any more, so the boundary moves past the blank line.

### M3. Two length errors that cancel out

Red test: "two cancelling length errors do not pass the integrity check"
(bucket A). Plan 001's guard compares the SUM of root source lengths with
the source length. CRLF makes one root a character shorter than its span;
marked's blockquote raw can gain a line break the source does not have
(source `> - q\n` + backtick => raw ends in backtick + `\n`). The sum
matches although the offsets are wrong. A second reproduction from the
reviewer's corpus: `'\r\n\n\n\n> - list in quote\n> - second\nlazy\n'`
streamed one character at a time yields an extra `space"\n"` root.

Conventions: see plan 001. `token-cleanup.ts` records true source spans via
`sourceLength` (plan 002) and `getSourceSpan`; read how before changing it.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose                  | Command                                                                                                                                                                                        | Expected                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Red tests, real failures | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.parity.test.ts src/lib/utils/incremental-parser.fuzz.test.ts src/lib/SvelteMarkdown.parity.test.ts --coverage.enabled=false` | 3 fail before, 0 after   |
| Parser + cleanup suites  | `pnpm vitest run src/lib/utils/incremental-parser src/lib/utils/token-cleanup --coverage.enabled=false`                                                                                        | all pass                 |
| Full tests               | `pnpm test`                                                                                                                                                                                    | all pass, coverage ≥ 90% |
| Typecheck                | `pnpm check`                                                                                                                                                                                   | 0 errors                 |
| Lint + format            | `trunk fmt && trunk check --fix`                                                                                                                                                               | `✔ No issues`            |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`;
`src/lib/utils/token-cleanup.ts` (ONLY to record, on the roots it produces,
that they came from an unterminated construct — no change to what it
renders); `src/lib/utils/incremental-parser.parity.test.ts` (flip the three
`red(` to `it(`, add guards); `src/lib/utils/incremental-parser.test.ts` and
`src/lib/utils/token-cleanup.test.ts` (new tests only).

**Out of scope**: `SvelteMarkdown.svelte`, `streaming-token-reuse.ts`,
`render-metadata.ts`, the fuzz corpora, docs, any repair of unfinished
markdown, normalizing line endings in the component's buffer.

## Steps

### Step 1: Confirm the red state

Run the red-test command; record the three failures. If any of the three
already passes, STOP.

### Step 2: M1 — hold a tag that has no closing bracket yet

Rule: an `html` root whose raw contains no `>` is still open; refuse the
boundary (or keep the root in the tail) while that is true. Put it next to
`isUnterminatedHtmlBlock` and reuse the same path; do not list tag names —
marked decides which names are block-level, and a root that marked lexed as
`paragraph` (`<span`) is already covered by the existing rules.

**Verify**: the M1 red test passes under `PARITY_STRICT=1`; add a guard
that `<div>` + blank line + prose still reports `usedTailWindow: true` on
later appends.

### Step 3: M2 — keep the unterminated marker through cleanup

When cleanup expands a block whose raw is unterminated in the sense of
`isUnterminatedHtmlBlock`, the produced roots must let the parser know. Use
a non-enumerable marker or a `WeakSet`/`WeakMap` keyed by token (the file
already uses `unresolvedSourceSpans` this way) so rendered output and
semantic equality do not change. The parser then treats a marked root like
an unterminated HTML block.

**Verify**: the M2 red test passes; `token-cleanup` tests pass unchanged;
a one-shot parse of both reproductions is deep-equal before and after your
change (add this as a test).

### Step 4: M3 — make the integrity check positional

The sum check cannot see errors that cancel. Make it fail whenever any
single root's recorded length is known to differ from its span. Two
acceptable designs; pick the simpler one that passes:

- (a) If the source contains `\r`, the tail window is not used (one
  `includes('\r')` on the APPENDED slice per update plus a sticky flag;
  never rescan the whole source). CRLF documents are already fully re-lexed
  in practice, so this costs nothing new.
- (b) Verify, for the roots of the tail only, that `source.startsWith` of
  each root's raw at its running offset holds where raw is expected to be
  verbatim.

Whichever you choose, the second reproduction in "Current state" must pass
too; add it to the M3 test.

**Verify**: the M3 red test passes; the plan 001 guard "an LF-only document
still reports `usedTailWindow: true`" passes unchanged.

### Step 5: Flip the three tests; full gate

Change the three `red(` to `it(`. Keep the `red` helper and its comment.
Then `pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

**Verify**: `grep -n "red(" src/lib/utils/incremental-parser.parity.test.ts src/lib/utils/incremental-parser.fuzz.test.ts src/lib/SvelteMarkdown.parity.test.ts`
→ no matches; `pnpm test` reports 0 expected fail.

## Test plan

- Red anchors: the three tests named above.
- Guards: fast path kept for a complete tag; one-shot output unchanged by
  the cleanup marker; LF documents keep the tail window.
- All five fuzz cases and the "Streaming Bookkeeping Performance" tests pass
  unchanged.

## Done criteria

- [ ] No `red(` call remains; `pnpm test` shows 0 expected failures
- [ ] `PARITY_STRICT=1` run fully green
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0, coverage ≥ 90%; `trunk check` clean
- [ ] No existing assertion changed; rendered output of a one-shot parse unchanged
- [ ] Report states, per mechanism, the rule and where it lives
- [ ] No files outside scope modified; nothing committed

## STOP conditions

- A fix needs an O(document) pass per update on the tail-window path.
- Any existing test would need its assertion changed.
- A mechanism cannot be fixed within two attempts: leave its `red(` anchor,
  fix the others, and report. Do not start a new corpus.
- Cleanup would have to change what it renders.

## Maintenance notes

- Documents that end inside an unfinished tag, or contain `\r`, are fully
  re-lexed per update. That is the accepted trade: correct first, fast for
  the common case.
