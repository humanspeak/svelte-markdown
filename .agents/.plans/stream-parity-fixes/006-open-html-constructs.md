# Plan 006: Do not freeze an HTML construct that is still open

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits.
>
> **Drift check (run first)**:
> `git diff --stat 436eb28..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/token-cleanup.ts src/lib/utils/incremental-parser.fuzz.test.ts`
> If any changed since this plan was written, compare the "Current state"
> excerpts against the live code; on a mismatch, STOP.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001, 002, 003, 005
- **Category**: bug
- **Planned at**: commit `436eb28`, 2026-09-29

## Why this matters

After plan 005 turned the generative fuzz green, the reviewer ran a second
independent corpus of blocks (now `EDGE_BLOCKS` in
`src/lib/utils/incremental-parser.fuzz.test.ts`). Seven of 100 random
documents diverge from a one-shot parse. Six are one mechanism:

```text
chunks '<!-- a comment\n\n' | 'sp'
  streamed: html"<!-- a comment" space"\n\n" paragraph"sp"
  fresh:    html"<!-- a comment\n\nsp"

... and when the terminator arrives later:
  streamed: html"<!-- a comment" space paragraph"spanning -->" space paragraph"After.\n"
  fresh:    html"<!-- a comment\n\nspanning -->" space paragraph"After.\n"
```

So the text of a comment that contains a blank line is rendered as visible
paragraphs. CommonMark HTML blocks of types 1–5 (`<pre>`, `<script>`,
`<style>`, `<textarea>`, `<!-- -->`, `<? ?>`, `<!DECL>`, `<![CDATA[ ]]>`)
are not ended by a blank line; they run to their own terminator, or to the
end of the input while unclosed. The parser's unclosed-HTML detector only
knows about tags.

The seventh is a different shape and needs diagnosing:

```text
  streamed: html"<li>" space"\n" paragraph"</u"
  fresh:    html"<li>"
```

This is agent-output territory (the library's headline use case), so it is
fixed on this PR.

## Current state

`src/lib/utils/incremental-parser.ts` after plans 001–005 (read the live
file):

- `hasHtmlSpanMismatch(token)`: true for an `html` root token that is a
  non-void OPENING TAG still waiting for its closing tag (paired tokens carry
  `sourceLength` and count as closed). When any root token mismatches,
  `getNextTailWindowBoundary` returns the empty boundary and every update is
  a full re-lex until it closes.
- `countHeldTokens` holds up to two tokens before the cut last token (rules
  listed in plan 005's guard report).
- Plan 001's length check discards a fast-path result whose roots do not add
  up to the source length and re-lexes in full.

Guard's probe of the shapes cleanup produces (at `436eb28`):

```text
'<!-- a comment\n\n'      -> html{ block:true, raw:"<!-- a comment", pre:false, text:"<!-- a comment" } space"\n\n"
'<pre>\nkeep\n\n  this\n</pre>\n\nAfter'  -> html{ raw:"<pre>", tag:"pre", sourceLength:25, tokens:[text] } space paragraph   (parity holds at that boundary)
'<style>…\n\n</style>\n\nAfter'           -> html{ raw:"<style>", tag:"style", sourceLength:34 } …                         (parity holds at that boundary)
```

An unclosed comment token has `block: true`, no `tag`, no `sourceLength`,
and its raw starts with `<!--` without containing `-->`.

The fuzz file: `CORE_BLOCKS` guard (green), gap case (green, `it`), and
`red('documents with HTML and edge blocks keep parity')` with 7 failing
documents. `PARITY_STRICT=1` prints them.

Performance constraint carried from plan 005: no rule may scan the token
array per update or hold a block in the tail for as long as any block follows
it. The unclosed-HTML flag (`prevHasHtmlSpanMismatch`) is the existing,
accepted mechanism for "this document is fully re-lexed until the construct
closes".

Conventions: TypeScript strict; arrow-function class members; JSDoc on
non-trivial helpers; Vitest; Trunk for lint/format; never `eslint-disable`;
cyclomatic complexity limit 15 per function; conventional commits.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose                     | Command                                                                                                                                                                                                                                   | Expected                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Fuzz, real failures         | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.fuzz.test.ts`                                                                                                                                                           | 7 failing documents before, 0 after       |
| Parser, parity, HTML suites | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts src/lib/utils/incremental-parser.nested-html.test.ts src/lib/utils/token-cleanup.test.ts` | all pass                                  |
| Full tests                  | `pnpm test`                                                                                                                                                                                                                               | all pass, 0 expected fail, coverage ≥ 90% |
| Typecheck                   | `pnpm check`                                                                                                                                                                                                                              | 0 errors                                  |
| Lint + format               | `trunk fmt && trunk check --fix`                                                                                                                                                                                                          | `✔ No issues`                             |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`;
`src/lib/utils/token-cleanup.ts` (only if an HTML construct's open/closed
state or source length must be recorded there);
`src/lib/utils/incremental-parser.fuzz.test.ts` (flip the `red(` case; add
blocks, never remove them); `src/lib/utils/incremental-parser.parity.test.ts`,
`src/lib/utils/incremental-parser.test.ts`,
`src/lib/utils/token-cleanup.test.ts`, `src/lib/SvelteMarkdown.parity.test.ts`
(new tests; implementation-pinning allowance as in plan 005).

**Out of scope**: how HTML is rendered or sanitized; `Parser.svelte`;
`SvelteMarkdown.svelte`; the `reuseMode` / `divergeAt` contract.

## Steps

### Step 1: Confirm the red state and group the failures

Run the fuzz with `PARITY_STRICT=1`. Group the 7 failing documents by
mechanism. Expect "unclosed HTML construct that a blank line does not end"
and the `<li>` / `</u` case; write down the minimal chunk sequence that
reproduces each.

### Step 2: Targeted red tests

In `incremental-parser.parity.test.ts` (bucket B), parity after every
chunk, written BEFORE the fix:

- `['<!-- a comment\n\n', 'sp', 'anning -->\n\n', 'After.\n']` and the
  same document at chunk sizes 1, 3 and 7.
- One case each for `<pre>`, `<script>`, `<style>`, `<textarea>` with a
  blank line inside, at chunk sizes 1, 3 and 7.
- `<?php echo 1;\n\n ?>`, `<!DOCTYPE html>`, `<![CDATA[ a\n\nb ]]>`.
- The minimal reproduction of the `<li>` / `</u` case from Step 1.
- Guards: a CLOSED comment followed by three appended paragraphs uses the
  tail window on the last two (`usedTailWindow`); a comment that is never
  closed keeps parity to the end of the stream.

In `SvelteMarkdown.parity.test.ts`: a comment containing a blank line
renders no visible text, streamed and one-shot.

Record which are red.

### Step 3: Recognize every unclosed HTML construct

Extend the unclosed-HTML detection so an `html` root token that opens a
type 1–5 block and does not contain its terminator counts as unclosed:

| Opens with                                                  | Terminator                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------- |
| `<pre`, `<script`, `<style`, `<textarea` (case-insensitive) | the matching `</pre>`, `</script>`, `</style>`, `</textarea>` |
| `<!--`                                                      | `-->`                                                         |
| `<?`                                                        | `?>`                                                          |
| `<!` + letter                                               | `>`                                                           |
| `<![CDATA[`                                                 | `]]>`                                                         |

Base the condition on the token shapes cleanup actually produces (log them
in a scratch test, record them in a comment). Keep it a per-token check, O(1)
per token inspected; it runs on the re-lexed tail on the fast path and on the
whole array only after a full re-lex, like the existing detector.

**Verify**: the Step 2 tests for these constructs pass; the #291 and
nested-HTML suites pass unchanged.

### Step 4: The remaining case(s)

Diagnose the `<li>` / `</u` reproduction. State the mechanism in one
paragraph in your report before changing code. If it is a further instance
of "an HTML construct opened in the prefix is still open" (for example an
inline opening tag inside a paragraph whose closing tag arrives in a later
root), extend the detector accordingly. If it is a different mechanism, fix
it only if the rule is a per-token or fixed-window check and you can write a
minimal red test for it first; otherwise STOP.

**Verify**: every targeted test passes.

### Step 5: Turn the fuzz green and widen it

Run the fuzz with `PARITY_STRICT=1`; at 0 failing documents flip the
`red(` case to `it(`. Add at least six more edge blocks of your own
(suggestions: `<details open>` with attributes and blank lines, an HTML
comment directly followed by a list, `<svg>` with nested elements and blank
lines, a `<video>` with `<source>` children, inline `<span>` opened in one
paragraph and closed in the next, `<br>` between list items). The fuzz must
stay green.

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.fuzz.test.ts`
→ 3 passed, 0 expected fail.

### Step 6: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- Red anchors: the fuzz edge case (7 failing documents) and the targeted
  tests from Step 2.
- Guards: closed comments regain the tail window; never-closed comments keep
  parity; #291 and nested-HTML suites unchanged.

## Done criteria

- [ ] `grep -rn "red(" src/lib/utils/incremental-parser.fuzz.test.ts src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts` → no matches
- [ ] `PARITY_STRICT=1` run of the fuzz and both parity files is fully green
- [ ] `pnpm test` exits 0 with 0 expected fail; `pnpm check` 0 errors; `trunk check` clean
- [ ] Bookkeeping performance tests and the task-list test pass unchanged
- [ ] The fuzz contains at least six additional edge blocks
- [ ] Report states each mechanism found, its minimal reproduction, and the rule that fixes it
- [ ] No files outside scope modified

## STOP conditions

- A mechanism can only be fixed by scanning the token array per update, or by
  holding a block in the tail for as long as any block follows it.
- An OUTPUT-pinning assertion would have to change.
- A #291 / nested-HTML regression test fails.
- After Steps 3–4 the fuzz still reports failures you cannot assign to a
  mechanism: report document seed, chunking seed, source tail, and shapes.

## Maintenance notes

- A document with an HTML construct that never closes is fully re-lexed on
  every update. That is the accepted price for correctness; the benchmark
  plan records it in the docs.
- Any new parity report gets a block in the generative fuzz first.
