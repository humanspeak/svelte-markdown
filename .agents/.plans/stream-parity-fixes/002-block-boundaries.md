# Plan 002: Do not freeze a block that the next chunk can still continue or enclose

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. The reviewer maintains the batch README and
> commits.
>
> **Drift check (run first)**:
> `git diff --stat 8805f29..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/token-cleanup.ts`
> Plan 001 is EXPECTED to have changed `incremental-parser.ts`. Re-read the
> live code for every excerpt; proceed if the differences are only plan
> 001's; otherwise STOP.

## Status

- **Priority**: P0
- **Effort**: M
- **Risk**: MED
- **Depends on**: 001 (its integrity guard is the safety net for the HTML
  span arithmetic in Part 2)
- **Category**: bug
- **Planned at**: commit `8805f29`, 2026-09-29

## Why this matters

Two everyday shapes of model output render wrongly while streaming and never
heal:

**Numbered lists with blank lines between items.** When a chunk boundary
falls between the number and the dot, the tokens are
`list space paragraph("2")`. The boundary rule only keeps a list open when
the LAST token is a blank line; here the last token is the paragraph, so the
list is frozen and `2. second` becomes a new list:

```text
chunks '1. first\n\n2' | '. second\n\n3' | '. third\n'
  streamed: list"1. first" space list"2. second" space list"3. third\n"   (three lists)
  fresh:    list"1. first\n\n2. second\n\n3. third\n"                     (one loose list)
```

**HTML blocks that contain blank lines** — the normal shape of agent HTML
output. marked emits the opening tag, the content, and the closing tag as
separate root tokens; a one-shot parse pairs them into one `html` token with
children. While streaming, the opening tag is frozen before its closing tag
arrives, so nothing is ever nested, and the rendered output contains no
`<div>` element at all:

```text
chunks '<div>\n\n' | '**b**\n\n' | '</div>\n'
  streamed: html"<div>" space paragraph"**b**" space html"</div>\n"
  fresh:    html"<div>"  (one root, children inside)
  rendered: <p><strong>b</strong></p>   vs   <div><p><strong>b</strong></p></div>
```

The divergence happens at the moment the closing tag arrives; intermediate
frames match a one-shot parse.

## Current state

`src/lib/utils/incremental-parser.ts` (line numbers at `119cc58`; plan 001
shifts them):

```ts
// :871-915 getNextTailWindowBoundary
let cut = tokens.length - 1
let reparseOffset = sourceLength - this.getTokenSourceLength(tokens[cut])
if (cut > 0 && tokens[cut].type === 'space' && this.canContinueAcrossBlankLine(tokens[cut - 1])) {
    cut--
    reparseOffset -= this.getTokenSourceLength(tokens[cut])
}

// :931-935 — list, or indented (fence-less) code
private canContinueAcrossBlankLine = (token: Token): boolean => ...

// :332-339 — the unclosed-HTML detector
private hasHtmlSpanMismatch = (token: Token): boolean => {
    if (token.type !== 'html') return false
    const html = token as HtmlToken
    if (!html.tag) return false                 // <-- a bare, unpaired opening has no `.tag`
    if (html.raw.endsWith('/>')) return false
    if (html.raw.startsWith('</')) return false
    return html.sourceLength == null
}
```

`src/lib/utils/token-cleanup.ts`: `pairFlatHtmlTokens` (`:376-445`) pairs a
flat opening/closing `html` token and everything between them into one token
`{ type: 'html', raw: openingToken.raw, tag, tokens, attributes, sourceLength }`.
Only that paired token (and tokens produced by `expandHtmlBlockNested`)
carries `.tag`; an opening tag still waiting for its closing tag stays a
flat `html` token WITHOUT `.tag`, which is why the detector above returns
`false` for it. `isHtmlOpenTag(raw)` (`:38`, exported) returns
`{ tag, isOpening }` for any tag; `isVoidElement(tagName)` is exported from
`src/lib/utils/void-elements.ts`.

When the detector fires, `getNextTailWindowBoundary` returns the empty
boundary and every update is a full re-lex until the HTML closes (the
existing #291 design). `sourceLength` on the paired token is the sum of the
cleaned `raw` lengths of the opening, the children and the closing token.

Red tests (currently failing, `red = process.env.PARITY_STRICT ? it : it.fails`):

- `src/lib/utils/incremental-parser.parity.test.ts`, `describe('B. block boundaries …')`:
  "a loose ordered list stays one list when a boundary splits the marker",
  "a loose ordered list keeps parity at every chunk size", "an HTML block
  with blank lines nests its children", "an HTML block with blank lines
  keeps parity at every chunk size", "nested HTML blocks with blank lines
  keep parity".
- `src/lib/SvelteMarkdown.parity.test.ts`, `describe('B. block boundaries')`:
  "a loose ordered list renders as one list", "an HTML block with blank
  lines contains its children".

Guards in the same describes pass today and must keep passing (a list
followed by a real paragraph still closes; tight lists; HTML without blank
lines; loose bullet list).

Existing suites that pin HTML streaming: `incremental-parser.nested-html.test.ts`,
`SvelteMarkdown.issue-291*.test.ts` (locate with `grep -rln "291" src/lib`),
`token-cleanup.test.ts`.

Conventions: see plan 001.

## Commands you will need

Prefix every pnpm command with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose                  | Command                                                                                                                                             | Expected                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Red tests, real failures | `PARITY_STRICT=1 pnpm vitest run src/lib/utils/incremental-parser.parity.test.ts src/lib/SvelteMarkdown.parity.test.ts`                             | bucket B fails before, passes after |
| HTML + parser suites     | `pnpm vitest run src/lib/utils/incremental-parser.test.ts src/lib/utils/incremental-parser.nested-html.test.ts src/lib/utils/token-cleanup.test.ts` | all pass                            |
| Full tests               | `pnpm test`                                                                                                                                         | all pass, coverage ≥ 90%            |
| Typecheck                | `pnpm check`                                                                                                                                        | 0 errors                            |
| Lint + format            | `trunk fmt && trunk check --fix`                                                                                                                    | `✔ No issues`                       |

## Scope

**In scope**: `src/lib/utils/incremental-parser.ts`;
`src/lib/utils/token-cleanup.ts` (Part 2 Step 5 only, `sourceLength`);
the two parity test files (flip bucket B `red(` to `it(`, add guards);
`src/lib/utils/incremental-parser.test.ts` and
`src/lib/utils/token-cleanup.test.ts` (new tests only).

**Out of scope**: buckets A and C; `SvelteMarkdown.svelte`; `Parser.svelte`;
how HTML is rendered; changing what `pairFlatHtmlTokens` pairs.

## Steps

### Step 1: Confirm the red state

Run the red-test command; record the bucket B failures. If any bucket B red
test already passes, STOP.

### Part 1 — lists

### Step 2: Look one block further back

In `getNextTailWindowBoundary`, after the last token is cut: when the token
before the cut is `space` and the token before THAT can continue across a
blank line (`canContinueAcrossBlankLine`), pull both into the tail. This is
the same rule as today, applied when an open block follows the blank line
instead of the blank line being last. Inspect at most three tokens; do not
scan. Keep the existing rule for a trailing `space`.

Reasoning to preserve in a comment: the open last token (`paragraph "2"`)
may turn into a list item once its marker completes, so the list before the
blank line is not closed yet. Once the block after the blank line is itself
followed by another token, it is a real separate block and the list joins
the prefix.

**Verify**: red-test command → the two list tests in the parser suite and
the rendered list test pass; guard "a list followed by a real paragraph
still closes" passes.

### Part 2 — HTML

### Step 3: Detect an unpaired opening tag

Make `hasHtmlSpanMismatch` return `true` for a flat `html` root token whose
raw is an opening tag that is still waiting for its closing tag: use
`isHtmlOpenTag(raw)` (`isOpening === true`), exclude self-closed sources and
void elements (`isVoidElement`), and keep returning `false` for paired
tokens that carry `sourceLength`. First inspect what cleanup actually
produces for `'<div>\n\n'` (log the token in a scratch test) and base the
condition on the real shape; record that shape in a comment.

**Verify**: red-test command → "an HTML block with blank lines nests its
children" passes (the document is fully re-lexed while the tag is open, and
the closing tag pairs it).

### Step 4: Nested and mixed HTML

Run the remaining bucket B HTML red tests. If "nested HTML blocks with blank
lines keep parity" still fails, print the diverging chunk and shapes and fix
the detector for the nested case (an inner unclosed tag inside an outer
unclosed tag). Do not change `pairFlatHtmlTokens` pairing rules.

**Verify**: all bucket B tests pass under `PARITY_STRICT=1`.

### Step 5: Give the tail window back after the HTML closes

After a block closes, plan 001's integrity guard decides whether the tail
window may be used. If the paired token's `sourceLength` (sum of CLEANED raw
lengths) differs from the true source span, the guard keeps the document on
the full re-lex path for the rest of the stream. Add a test to
`incremental-parser.test.ts`: stream `'Intro.\n\n<div>\n\n**b**\n\n</div>\n\n'`
then append three paragraphs one at a time; assert parity on every update
AND `usedTailWindow === true` on the last two appends. If it fails, make
`sourceLength` the true source span in `token-cleanup.ts` (compute it from
the ORIGINAL token raws before any formatting), with a `token-cleanup.test.ts`
case pinning `sourceLength === source.length` for that block.

**Verify**: the new test passes; `token-cleanup.test.ts` and
`incremental-parser.nested-html.test.ts` pass unchanged.

### Step 6: Flip bucket B and run the full gate

Change the bucket B `red(` calls to `it(` in both parity files. Then
`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- Red anchors: the seven bucket B tests named above.
- Guards already in the suite stay green; new guard for regaining the tail
  window after a closed HTML block.
- #291 regression suites pass unchanged.

## Done criteria

- [ ] All bucket B tests are `it(` and pass; `PARITY_STRICT=1` shows no bucket B failure
- [ ] After a closed HTML block with blank lines, later appends use the tail window (test asserts `usedTailWindow`)
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0; `trunk check` clean
- [ ] No files outside scope modified

## STOP conditions

- Any #291 / nested-HTML regression test fails.
- The list rule would need to inspect more than three tokens or scan the array.
- Making `sourceLength` the true span changes the output of any existing
  `token-cleanup.test.ts` case.
- A bucket B test still fails after Steps 2–4: report chunk, source, and
  shapes; do not guess at a further block type.

## Maintenance notes

- A document with an HTML tag that is never closed is fully re-lexed on
  every update for the rest of the stream (unchanged design). If that shows
  up in profiles, the fix is a bounded "unclosed since" window, not removing
  the detector.
- The boundary rule now reads: never freeze the last token; never freeze a
  list or indented code block separated from the tail only by a blank line.
  Any new continuable block type belongs in `canContinueAcrossBlankLine`.
