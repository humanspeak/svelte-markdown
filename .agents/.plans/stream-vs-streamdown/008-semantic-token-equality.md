# Plan 008: Make streaming token equality semantic (all render-affecting fields), with a same-object fast path

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat f470a91..HEAD -- src/lib/utils/streaming-token-reuse.ts src/lib/utils/streaming-token-reuse.test.ts src/lib/utils/incremental-parser.ts`
> On any change, compare the "Current state" excerpts against the live
> code before proceeding; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (prerequisite for 009 and 011)
- **Category**: bug / perf-enabler
- **Planned at**: commit `f470a91`, 2026-09-28 (amended; original `7dea763`)

## Why this matters

`isSameStableNode` in `src/lib/utils/streaming-token-reuse.ts` decides whether
a previously rendered token object can stand in for a freshly parsed one. It
compares `type`, `raw` (or `text`), and nested token arrays — and nothing
else. Reproduced against the installed marked lexer (2026-09-28):

```text
before: See [ref].\n\n[ref]: https://example.com/a
after:  See [ref].\n\n[ref]: https://example.com/abc
paragraph link href: /a  →  /abc
isSameStableNode(beforeParagraph, afterParagraph) === true   // wrong
```

Today this hole is masked because reference-sensitive updates disable reuse
entirely (`canReuse = false` → the whole tree is replaced). Any plan that
widens reuse (Plan 009's whole-tree reuse after a definition, Plan 011's
bounded prefix work) is unsound until equality covers every render-affecting
field: link/image `href`, `title`, `text`; heading `depth`; list `ordered`,
`start`, `loose`; list item `task`, `checked`; table `align` (array of
`'left'|'center'|'right'|null`); code `lang`; html `tag`, `attributes`
(object); extension scalar fields (katex `displayMode`, alert `variant`, …).

A primitive-aware comparator was probed on the same inputs: it returns
`false` for the href case, `true` for a table compared with its own re-parse
(`align: [null, null]`), and produces zero false diffs on the closed prefix of
an append-only prose document. This plan ships that comparator with
characterization tests, plus a same-object fast path (`a === b` → equal,
trivially sound for a pure comparator) so identical prefix objects are not
deep-walked every frame.

## Current state

`src/lib/utils/streaming-token-reuse.ts`:

```ts
// :10-17 — recursive validator run before every child comparison
const isReusableStreamingNodeArray = (value: unknown): value is ReusableStreamingNodeArray =>
    Array.isArray(value) &&
    value.every((item) =>
        Array.isArray(item) ? isReusableStreamingNodeArray(item) : isReusableStreamingNode(item)
    )

// :40-60 — compares only nested token arrays; ignores every other key
const haveSameStableChildIdentity = (previousNode, nextNode): boolean => {
    const keys = new Set([...Object.keys(previousNode), ...Object.keys(nextNode)])
    for (const key of keys) {
        const previousIsChildArray = isReusableStreamingNodeArray(previousValue)
        const nextIsChildArray = isReusableStreamingNodeArray(nextValue)
        if (!previousIsChildArray && !nextIsChildArray) continue   // <-- scalars skipped
        ...
    }
    return true
}

// :63-77
export const isSameStableNode = (previousNode, nextNode): boolean => {
    if (previousNode.type !== nextNode.type) return false
    if (typeof previousNode.raw === 'string' || typeof nextNode.raw === 'string') {
        if (previousNode.raw !== nextNode.raw) return false
    } else if (typeof previousNode.text === 'string' || typeof nextNode.text === 'string') {
        if (previousNode.text !== nextNode.text) return false
    } else {
        return false
    }
    return haveSameStableChildIdentity(previousNode, nextNode)
}
```

Callers: `reuseStableNode`/`reuseStableNodeArray`/`reuseStableTokenArray` in
the same file; `IncrementalParser.update()` divergence loop
(`src/lib/utils/incremental-parser.ts:~605-612`, `if (!isSameStableNode(prev, next)) break`).

Note on data arrays: a table token's `align` is an array whose elements are
strings or `null`; the validator above correctly classifies it as NOT a token
array today. The new comparator must handle arrays of primitives/nulls
element-wise and must NOT assume array elements are objects (a naive
`Array.isArray`-only shortcut crashes with `Cannot read properties of null
(reading 'type')` on an unaligned table — reproduced by the adversarial
review).

Existing tests: `src/lib/utils/streaming-token-reuse.test.ts` (9 cases on
`reuseStableTokenArray`, e.g. "does not over-reuse a token when a child under
a custom key changes"), `src/lib/utils/streaming-reuse-repro.test.ts`,
`src/lib/utils/incremental-parser.test.ts` (reference cases at lines ~120–240
and ~330–480).

Conventions: TypeScript strict; JSDoc (`@param`/`@returns`/`@example`) on
exported helpers; Vitest `describe`/`it`; Trunk for lint/format; no
`eslint-disable`; conventional commits.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                            | Expected                 |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Typecheck     | `pnpm check`                                                                                                                                       | 0 errors                 |
| Focused tests | `pnpm vitest run src/lib/utils/streaming-token-reuse.test.ts src/lib/utils/incremental-parser.test.ts src/lib/utils/streaming-reuse-repro.test.ts` | pass                     |
| Full tests    | `pnpm test`                                                                                                                                        | all pass, coverage ≥ 90% |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                   | `✔ No issues`            |

## Scope

**In scope**:

- `src/lib/utils/streaming-token-reuse.ts`
- `src/lib/utils/streaming-token-reuse.test.ts`
- `src/lib/utils/incremental-parser.test.ts` (parity characterization tests only)
- `src/lib/utils/incremental-parser.ts` (Step 2b only — the definition-extension fix; added by the 2026-09-28 revision)
- `.agents/.plans/stream-vs-streamdown/README.md` (status row)

**Out of scope**: any `incremental-parser.ts` change beyond Step 2b (Plan 011 owns the rest), `SvelteMarkdown.svelte`,
`render-metadata.ts`, any widening of WHERE reuse happens (Plan 009).

## Git workflow

- Branch: `fix/semantic-token-equality` off `main`.
- Commit: `fix(streaming): compare every render-affecting token field before reuse`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Failing characterization tests

In `src/lib/utils/streaming-token-reuse.test.ts` add a `describe('isSameStableNode semantics')`
with cases built from real lexer output (`new Lexer({ gfm: true }).lex(...)`
from `marked`, as `incremental-parser.test.ts` does) — each asserting
`isSameStableNode(a, b) === false` where today it is `true`:

1. Reference link href changes (`/a` → `/abc`), raw identical.
2. Reference link title appears (`[ref]: /a "Title"`), raw identical.
3. Reference image src changes (`![alt][img]` with two definitions).
4. Heading `depth` differs with identical `text` (construct tokens by hand).
5. List `ordered`/`start` differ with identical items (hand-built).
6. Task list item `checked` differs (`- [ ] a` vs `- [x] a` — raw differs here,
   so use hand-built tokens with equal raw to isolate the scalar).
7. Code `lang` differs with identical `text` (hand-built).
8. html `attributes` object differs (`{ class: 'a' }` vs `{ class: 'b' }`).
9. Extension scalar: a hand-built `{ type: 'blockKatex', raw: '$$x$$', text: 'x', displayMode: true }`
   vs `displayMode: false`.

And cases that must remain `true`:

10. Table compared with its own re-parse, including `align: [null, null]`
    and mixed `['left', null, 'right']`.
11. Same object (`isSameStableNode(a, a)`).
12. Two independent parses of identical prose (bold, links, code spans).

Also add, in `incremental-parser.test.ts`, a streamed-parity test: stream
`See [ref].\n\n[ref]: https://example.com/a` then `bc` (completing `/abc`) in
chunks of 4 characters; after EVERY chunk assert the streamed tokens are
semantically equal to a fresh one-shot lex of the same cumulative source
(write a small `expectSemanticParity(streamed, fresh)` helper using the new
comparator once it exists — until then, a local deep-equal ignoring nothing).

**Verify**: focused test run → cases 1–9 FAIL (`expected false, received true`);
10–12 pass.

### Step 2: Implement the semantic comparator

Replace `isSameStableNode`/`haveSameStableChildIdentity` with a single
recursive `isSemanticallyEqual(a, b)` and keep the exported name
`isSameStableNode` as its public alias (callers unchanged):

- `a === b` → `true` (same-object fast path; covers reused prefix objects).
- Exactly one is `null`/non-object → `a === b`.
- Arrays: same length and element-wise `isSemanticallyEqual` (elements may be
  `null`, primitives, arrays, or objects — never assume `.type`).
- Objects: union of own enumerable keys; for each key: functions → `false`
  (unknown callable state can never be assumed equal); otherwise recurse.
- Keep the early `type`/`raw` inequality checks first for speed.

Keep `isReusableStreamingNodeArray` ONLY where structural recursion in
`reuseStableNodeArray`/`reuseStableNode` needs to know whether to descend
(children merging); do not remove element validation there. Add JSDoc
explaining the contract: "equal iff a renderer given either object would
produce identical output; conservative on unknowns".

**Verify**: focused tests → all pass, including the nine former failures and
the existing nine `reuseStableTokenArray` cases.

### Step 2b (added 2026-09-28): Treat an append that extends a definition as reference-sensitive

State at this step: Steps 1–2 are done and committed at `f470a91`; the only
red test is "keeps semantic parity after every chunk while a reference URL
completes" in `incremental-parser.test.ts`, failing with
`root 0 for "See [ref].\n\n[ref]: https": expected false to be true`.

Mechanism: `update()` computes
`appendAddsDefinition = isAppendOnly && this.appendIntroducesMatch(source, this.hasReferenceDefinition)`.
`appendIntroducesMatch` (`incremental-parser.ts:276-286`) returns `false` when
the boundary line ALREADY matched before the append ("already present ⇒ not
new"). So while a definition line is still being streamed, every chunk after
the one that completed `]:` is treated as a plain append: the tail window
re-lexes only the `def` token and the prefix paragraph keeps the `href` from
the first full re-lex (`"h"`).

Fix (in `update()`, next to `appendAddsDefinition`): also detect
"append touches a definition line":

```ts
// A definition whose URL/title is still streaming changes how prefix
// references resolve on every chunk, not only on the chunk that completed
// `]:`. Treat any append whose boundary line is a definition as adding one.
const boundaryLineStart = this.prevSource.lastIndexOf('\n') + 1
const appendTouchesDefinition =
    isAppendOnly && this.hasReferenceDefinition(source.slice(boundaryLineStart))
const appendAddsDefinition =
    isAppendOnly &&
    (appendTouchesDefinition || this.appendIntroducesMatch(source, this.hasReferenceDefinition))
```

`source.slice(boundaryLineStart)` is the boundary line plus the appended
text; when the appended chunk contains a newline the slice spans into the
next line, which is acceptable (one extra conservative full re-lex when a
definition line closes). The existing downstream logic
(`referenceInvalidatesTail = prevHasPotentialReferenceUse && appendAddsDefinition`)
then forces the full re-lex and `canReuse: false` only when the prefix has a
potential use — a stream with no `[x]` uses stays on the tail window.

Also update the JSDoc of `appendIntroducesMatch` to say it detects NEW
matches only and that callers needing "touches a definition" must check the
boundary line themselves (as `update` now does).

Existing tests that pin scan counts ("scans the definition boundary at most
once per append", "does not scan the full previous source…") must still
pass: the new check is one regex over the boundary line, not the prefix. If
one of them fails, adjust the implementation (e.g. reuse the single
`lineStart` computation), NOT the test.

**Verify**: `pnpm vitest run src/lib/utils/incremental-parser.test.ts` → the
parity test PASSES; all other cases unchanged (90 → 91 passing).

### Step 3: Guard against false diffs in the streaming path

Add a test in `streaming-token-reuse.test.ts` that lexes a 30-root mixed
prose document (headings, paragraphs with links/bold/code, a list, a table,
a fence) twice — once as-is and once with a paragraph appended — and asserts
every root before the last is `isSameStableNode` under the new comparator
(no false diffs). Then run the whole suite.

**Verify**: `pnpm test` → all pass; coverage ≥ 90%.

### Step 4: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- Red anchors: nine scalar-field cases that return `true` today.
- Parity-after-every-chunk test for chunked reference URL completion.
- Must-stay-true cases: table align nulls, same object, independent identical
  parses; no-false-diff prose case.
- All existing reuse/parser tests unchanged and green.

## Done criteria

- [ ] `pnpm check` 0 errors; `pnpm test` exits 0 with the new tests passing
- [ ] The chunked reference-URL parity test in `incremental-parser.test.ts` passes (red at `f470a91`)
- [ ] `grep -n "if (a === b) return true\|previousNode === nextNode" src/lib/utils/streaming-token-reuse.ts` matches (fast path present)
- [ ] `grep -n "typeof .* === 'function'" src/lib/utils/streaming-token-reuse.ts` matches (functions never equal)
- [ ] No files outside scope modified

## STOP conditions

- The no-false-diff test (Step 3) fails: some field differs between two
  parses of identical source (e.g. a non-deterministic or positional field).
  Report the field; do not special-case it silently.
- Any `incremental-parser.test.ts` case changes outcome (this plan must not
  change divergence results on existing fixtures).
- Coverage falls below 90%.

## Maintenance notes

- New token fields from marked or extensions are compared automatically; a
  field that legitimately differs without affecting render (none known) would
  need an explicit allowlist here — add it with a test.
- Plans 009 and 011 depend on this contract; a reviewer should reject any
  later change that weakens it "for speed".
