# Plan 009: An autolink does not clear marked's inline link state

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits. Do not commit.
>
> **Drift check (run first)**:
> `git diff --stat 988b8e8..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/incremental-parser.parity.test.ts`
> No change is expected; anything else: STOP.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 006, 008
- **Category**: bug
- **Planned at**: commit `988b8e8`, 2026-09-29

## Why this matters

marked's inline lexer keeps a flag, `inLink`, that is shared by every block
of one lex. An unclosed `<a>` tag sets it; while it is set, bare URLs are
not turned into links. Plan 006 taught the streaming parser to track that
state (`stepInlineState` in `src/lib/utils/incremental-parser.ts`) so the
tail is never lexed with a different state than a one-shot parse has.

The tracker clears the state after ANY `link` token. marked does not:

```text
'<a href="x">open [t](/u)\n\nhttps://a.example'            bracket link: state cleared, URL is a link
'<a href="x">open ![i](/u)\n\nhttps://a.example'           image: state cleared, URL is a link
'<a href="x">open <https://b.example>\n\nhttps://a.example' autolink: state KEPT, URL is plain text
```

So after an autolink the stream believes the state is back to default,
accepts the boundary, and lexes the tail with the default state: the bare
URL becomes a link in the stream and stays text in a one-shot parse.

## Current state

```ts
// stepInlineState, src/lib/utils/incremental-parser.ts
if (inline.type === 'link') return stepInlineTokens(inline.tokens, state | IN_LINK) & ~IN_LINK
```

Red test (fails today): `src/lib/utils/incremental-parser.parity.test.ts`,
bucket B, "inline link state after an unclosed anchor and an autolink
matches". Three guards next to it (bare URL, image, bracket link) pass
today and must keep passing.

Conventions: see plan 001.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                    | Expected                 |
| ------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------ |
| Red test      | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.parity.test.ts --coverage.enabled=false` | 1 fails before, 0 after  |
| Parser suites | `pnpm vitest run src/lib/utils/incremental-parser --coverage.enabled=false`                                | all pass                 |
| Full tests    | `pnpm test`                                                                                                | all pass, coverage ≥ 90% |
| Typecheck     | `pnpm check`                                                                                               | 0 errors                 |
| Lint + format | `trunk fmt && trunk check --fix`                                                                           | `✔ No issues`            |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts` (`stepInlineState` and
its JSDoc only); `src/lib/utils/incremental-parser.parity.test.ts` (flip the
red test, add guards); `src/lib/utils/incremental-parser.test.ts` (new tests
only).

**Out of scope**: everything else.

## Steps

### Step 1: Confirm the red state

Run the red-test command: exactly one failure, the autolink test.

### Step 2: Establish what marked does, from marked

Do not guess. With `marked.lexer(source, { gfm: true })`, check for each
link-producing construct whether a bare URL in the NEXT paragraph is linked
after an unclosed `<a href="x">`: bracket link, reference link (with its
definition), image, reference image, autolink with a URL, autolink with an
email address, bare URL, bare `www.` address, bare email address. Also
check the same list for `inRawBlock` after an unclosed `<code>` (the second
paragraph contains `**bold**`; it is emphasis only when the state is
clear). Record the table in your report.

### Step 3: Make the tracker match

Change `stepInlineState` so a token clears a state exactly when marked
does, per your Step 2 table. Decide from fields the token already has
(`type`, `raw`); do not re-lex. Update the JSDoc sentence "A link clears
`inLink` once its text is lexed" to say which links do.

**Verify**: red-test command fully green.

### Step 4: Flip, add guards, full gate

Flip the red test to `it(`. Add one parity guard per row of your Step 2
table that is not covered yet (two chunkings each: the URL directly after,
and after one more paragraph). Then `pnpm check`,
`trunk fmt && trunk check --fix`, `pnpm test`.

## Done criteria

- [ ] No `red(` call remains in the parity or fuzz files; 0 expected failures
- [ ] Report contains the Step 2 table
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0, coverage ≥ 90%; `trunk check` clean
- [ ] No existing assertion changed; no files outside scope modified; nothing committed

## STOP conditions

- The Step 2 table shows a case that cannot be decided from the token's own
  fields: report it, fix the rest.
- Any existing test would need its assertion changed.

## Maintenance notes

- The tracker mirrors marked's internals. A marked upgrade that changes when
  `inLink` or `inRawBlock` is reset will show up in the guards added here.
