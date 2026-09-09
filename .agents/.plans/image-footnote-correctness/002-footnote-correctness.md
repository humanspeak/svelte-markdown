# Plan 002: Preserve document content and make footnote navigation deterministic

> **Executor instructions:** Read this entire plan, then follow its gates in
> order. Stop on the listed conditions. Update the adjacent README status and
> evidence when finished unless a reviewer owns those updates.
>
> **Drift check first:** `git diff --stat 415df2e..HEAD -- src/lib/extensions/footnote src/lib/utils/footnote-render-metadata.ts src/lib/utils/footnote-render-metadata.test.ts src/lib/SvelteMarkdown.svelte src/lib/Parser.svelte src/lib/SvelteMarkdown.footnotes.test.ts src/lib/test/footnotes/FootnoteSnippetProbe.svelte README.md`
> Inspect uncommitted changes to the same paths. Compare runtime excerpts before
> proceeding. README drift from Plan 001 is expected; preserve its image edits.

> Revision 2026-09-09: Rebased the plan onto freshly fetched main (`db41ab0`)
> at the operator's request. In-scope runtime files match the original baseline;
> package version is now 1.9.0 and current Trunk configuration remains authoritative.

> Revision 2026-09-09: Preflight after image snapshot `415df2e` found only the
> expected image paragraph change in this plan's README scope; runtime files are
> unchanged. Rebased the drift anchor to preserve that work. The companion cannot
> run pnpm because native binary identity verification fails before execution;
> use the installed `node_modules/.bin/vitest` for red/green tests, which the image
> executor verified works. Do not install or create dependency workarounds. Guard
> owns pnpm, Trunk, typecheck, coverage, build, commits, and plan status updates.

> Revision 2026-09-09: Full coverage uses `--maxWorkers=2` on this machine.
> Plan 001 proved the identical full suite and unchanged timeout/coverage gates
> pass with bounded workers after default concurrency timed out an existing
> heading test. This changes scheduling only; no assertions or thresholds change. The same
> worker limit applies to focused/streaming gates after a guard focused run
> lost a worker (72 assertions passed, no assertion failure). Bounded retries
> passed all 80 footnote and 100 streaming tests.

## Status

- **Priority:** P1
- **Effort:** L (multiple days including parser, integration, and compatibility tests)
- **Risk:** MED — definition boundaries and generated anchor IDs are observable behavior
- **Depends on:** none; recommended after Plan 001 for review order
- **Category:** bug
- **Confidence:** HIGH for content loss and duplicate reference IDs; duplicate
  definition entries are confirmed, but the renderer exception was not executed
- **Planned at:** commit `415df2e`, 2026-09-09

## Why this matters

A footnote definition can consume and silently discard all subsequent normal
paragraphs and headings. Repeated references create duplicate DOM IDs, and
repeated definitions produce duplicate keyed list entries. Fix these together
with tests of the actual SvelteMarkdown rendering path, including streaming,
cache reuse, and completion. This plan does not add a complete footnote Markdown
standard or change the generic streaming/keying architecture.

## Current state

The repo is `@humanspeak/svelte-markdown` 1.9.0, using Svelte 5 runes,
strict TypeScript, Marked 18, pnpm 11, and Node >=22 (CI 22/24). The output is
an npm Svelte package; SvelteKit hosts development/testing routes.

`src/lib/extensions/footnote/markedFootnote.ts:42` returns references with only
`{ type: 'footnoteRef', raw, id }`. At lines 59–64, the section tokenizer uses
incompatible consumption/extraction boundaries:

```ts
const match = src.match(/^(?:\[\^([^\]\s]+)\]:\s*([^\n]*(?:\n(?!\[\^)[^\n]*)*)(?:\n|$))+/)
// ...
const defRegex = /\[\^([^\]\s]+)\]:\s*([^\n]*(?:\n(?!\[\^|\n)[^\n]*)*)/g
```

The audit executed the current tokenizer through `new Marked(markedFootnote())`:

```text
Input: [^n]: Note.\n\nAfter paragraph.\n\n# Heading
Result: one footnoteSection whose raw consumes the WHOLE input,
        but whose footnotes is only [{ id: 'n', text: 'Note.' }].
```

Thus Marked never gets to render the trailing paragraph/heading. Another direct
probe confirmed duplicate definitions produce two entries with the same id.

`src/lib/extensions/footnote/FootnoteRef.svelte:9`:

```svelte
<sup class="footnote-ref"><a href="#fn-{id}" id="fnref-{id}">{id}</a></sup>
```

`src/lib/extensions/footnote/FootnoteSection.svelte:16`:

```svelte
{#each footnotes as { id, text } (id)}
    <li id="fn-{id}">
        <p>
            {text}
            <a href="#fnref-{id}" class="footnote-backref" role="doc-backlink">&#8617;</a>
        </p>
    </li>
{/each}
```

Existing tests directly invoke tokenizer definitions or render each component
alone. They pin simple anchors such as `fn-1`, `fnref-1`, and `fn-my-note`.
The audit ran the image/footnote suites: 4 files / 41 tests pass. No new regression
tests were written during planning. `src/lib/utils/incremental-parser.test.ts:993`
explicitly requires footnotes to use full reparsing, but checks lexer invocation,
not rendered content.

Important integration facts:

- `src/lib/utils/parse-and-cache.ts:40` uses `new Lexer({ ...options })`, followed
  by `lexer.lex`/`inlineTokens`; a Marked `processAllTokens` hook will not run here.
- `parse-and-cache.ts:89` walks only root tokens on the sync path. Do not use
  `walkTokens` or tokenizer closure counters to count reference occurrences.
- `src/lib/utils/streaming-token-reuse.ts:63` compares raw/text and child identity,
  not every scalar field. Adding mutable occurrence numbers to parsed tokens can
  therefore retain stale values. Cached and caller-supplied tokens must not change.
- `src/lib/utils/render-metadata.ts:603` already prepares per-instance WeakMap
  metadata without modifying tokens. Its existing stable keys must be preserved.
- `src/lib/SvelteMarkdown.svelte:541` prepares metadata in `$derived.by` before
  Parser renders. `Parser.svelte:231` spreads extra heading props after token
  props; use that dispatch pattern for additive footnote props.
- A WeakMap mutated in place is not a Svelte reactive dependency. Later refs
  must update backlinks in an earlier, reused definition token. Pass a new
  immutable metadata snapshot as an internal reactive prop; do not write rune
  state from inside `$derived.by` or rely on an effect running after rendering.

Match four-space indentation, no semicolons, camelCase, strict typed helper
interfaces, and `.js` import suffixes. Existing component tests use
`render(Component, { props: ... })`, DOM assertions, and Vitest. For streaming,
follow `src/lib/SvelteMarkdown.issue-328.test.ts`:

```ts
useStreamingTestHarness()
const { component, container } = render(SvelteMarkdown, {
    props: { source: '', streaming: true }
})
await act(() => component.writeChunk('# Title\n\n'))
await flushStreamingBatch()
```

Import the harness from `src/lib/test/streaming/harness.ts`; it handles token-cache
clearing, fake timers, rAF, and cleanup. Add extensions/renderers to these props
for footnote tests. There is no `finishStream` API.

## Commands you will need

Commands run at repo root with installed dependencies. In a fresh executor
checkout only, use `pnpm install --frozen-lockfile` if needed; keep the lockfile
unchanged. Trunk is the format/lint authority, not raw ESLint/Prettier.

| Purpose          | Command                                                                                                                                                                                                                    | Expected on success                   |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Footnote tests   | `pnpm test:only src/lib/extensions/footnote src/lib/SvelteMarkdown.footnotes.test.ts src/lib/utils/footnote-render-metadata.test.ts --reporter=dot --maxWorkers=2`                                                         | All pass except specified red gates   |
| Streaming guards | `pnpm test:only src/lib/utils/incremental-parser.test.ts src/lib/SvelteMarkdown.issue-328.test.ts src/lib/SvelteMarkdown.redraw-regression.test.ts src/lib/SvelteMarkdown.stream-id.test.ts --reporter=dot --maxWorkers=2` | All pass                              |
| Typecheck        | `pnpm check`                                                                                                                                                                                                               | Exit 0, zero errors                   |
| Format           | `trunk fmt`                                                                                                                                                                                                                | Only intended changed files formatted |
| Lint             | `trunk check`                                                                                                                                                                                                              | Exit 0                                |
| Full coverage    | `pnpm test --reporter=dot --maxWorkers=2`                                                                                                                                                                                  | Exit 0                                |
| Build/package    | `pnpm build`                                                                                                                                                                                                               | Exit 0, including package validation  |

The actual `vite.config.ts` thresholds are statements 95%, branches 89%,
functions 95%, lines 96%; do not lower any threshold. Tests use jsdom.
Use Trunk inline ignores rather than `eslint-disable`. README updates are
required for changed public component behavior. Do not edit generated docs.

## Scope

**Only modify:**

- `src/lib/extensions/footnote/markedFootnote.ts`
- `src/lib/extensions/footnote/markedFootnote.test.ts`
- `src/lib/extensions/footnote/FootnoteRef.svelte`
- `src/lib/extensions/footnote/FootnoteRef.test.ts`
- `src/lib/extensions/footnote/FootnoteSection.svelte`
- `src/lib/extensions/footnote/FootnoteSection.test.ts`
- `src/lib/utils/footnote-render-metadata.ts` (create; internal, no barrel export)
- `src/lib/utils/footnote-render-metadata.test.ts` (create)
- `src/lib/SvelteMarkdown.svelte` (metadata derivation and root Parser prop only)
- `src/lib/Parser.svelte` (internal metadata prop, forwarding, and footnote extras only)
- `src/lib/SvelteMarkdown.footnotes.test.ts` (create)
- `src/lib/test/footnotes/FootnoteSnippetProbe.svelte` (create if needed)
- `README.md` (footnote section only)
- This batch's status row and execution notes

**Out of scope:** changing Marked, parse-and-cache, incremental-parser,
streaming-token-reuse, render-metadata stable keys, heading behavior, tail safety,
cache policy, sanitizers, other extensions, dependencies, public root props,
image work, generated docs, competitive-intel state. Do not rework those systems
to simplify this plan.

Also deferred: automatic namespaces across separate Markdown instances,
automatic numeric relabeling, moving definitions to a global end-of-document
section, rich Markdown inside definition bodies, and unresolved-reference
policy. A pending `[^n]` may continue pointing to a definition that arrives later.
Independent rendered documents with the same labels retain legacy anchor overlap;
this batch fixes correctness within each document and isolates computation state.
Navigation guarantees assume default child rendering; custom renderers that hide
or reinterpret children must maintain their own navigation semantics.

## Behavior contract

### Definition boundaries

Support a definition at a block-line start with zero to three leading spaces,
`[^label]:` followed by optional horizontal whitespace and a plain-text body.
Label matching stays case-sensitive. Adjacent definitions may share a section.
Additional body lines must be indented by at least four spaces or one tab;
remove one continuation indentation unit from their rendered text. Blank lines
belong to a body only when followed by an indented continuation. An unindented
following line, paragraph, heading, list, fence, or HTML block belongs to the
surrounding document. In particular, `\s*` after the colon must not consume
unrelated newlines. Support empty bodies without swallowing the next block.
Preserve exact consumed source in `raw`; do not normalize it or fabricate text
that changes source-offset accounting. Handle LF and CRLF at the actual lexer
boundary. This deliberately narrows the old accidental unindented continuation
behavior; document that continuation text requires indentation.

Duplicate labels use **first-definition-wins in document order**, including
sections separated by normal content. Consume duplicate definition source, but
render only the first definition and never emit duplicate keyed entries.
Standalone FootnoteSection must also safely deduplicate its own input list.

### IDs and backlinks

Keep labels and displayed text unchanged. Preserve existing DOM IDs for labels
containing only ASCII letters/digits, underscore, and hyphen, e.g. `1`, `my-note`.
Use a deterministic injective label encoding for other characters so fragment
syntax, occurrence suffixes, and malformed UTF-16 cannot cause collisions or
throw during partial Unicode streaming. A concrete small encoding is: preserve
`[A-Za-z0-9_-]`; encode every other UTF-16 code unit as `~` plus four lowercase hex
digits (encode literal `~` too). This reserves `:` exclusively for occurrence
suffixes and makes labels such as `x`, `x-2`, `x:ref:2`, and `x~003a` distinct.
Use one shared helper for both renderer components and metadata.

Definition ID is `fn-${encodedLabel}`. First reference ID is
`fnref-${encodedLabel}`; later occurrences are
`fnref-${encodedLabel}:ref:2`, `:ref:3`, etc. Ref href targets its definition;
backlink href targets each occurrence. Construct href by URI-encoding the full
DOM ID for fragment navigation; assertions should decode the fragment to find
its target rather than assuming raw string equality for punctuation.

FootnoteRef accepts additive optional `referenceId?: string` (prepared DOM ID),
falling back to its legacy first-reference ID via the shared encoding helper.
FootnoteSection's per-footnote record keeps `{ id, text }` and gains optional
`backrefs?: string[]` (prepared reference DOM IDs). Omitted backrefs preserves
standalone legacy one-backlink behavior; explicit `[]` means no known refs.
Give repeated backlinks distinguishable accessible labels, preserving
`role="doc-backlink"` and `footnote-backref` class. Do not change visible labels
into auto-numbered citations. Snippet/custom renderer props get the same
additive information as default components.

## Git workflow

Use the assigned executor branch, or `fix/footnote-correctness`. Preserve user
changes; planning started with modified `.competitive-intel/config.json` and
`state.json`. If asked to commit, use conventional messages, e.g.
`fix(footnotes): preserve following blocks and disambiguate references`.
Do not push, publish, or open a PR without instruction.

## Steps

### Step 1: Add failing real-parser and rendering regressions

Extend `markedFootnote.test.ts` with a real `new Marked(markedFootnote()).lexer`
case named `preserves blocks after a footnote definition`. Input:
`Body[^n].\n\n[^n]: Note.\n\nAfter paragraph.\n\n# Heading`.
Assert separate trailing paragraph and heading tokens exist, note text is
`Note.`, and section raw does not contain `After paragraph` or `# Heading`.
Do not just call the tokenizer function with a fake `this`.

Create `SvelteMarkdown.footnotes.test.ts` with an integration test
`assigns unique anchors to repeated footnote references`: render
`First[^n], second[^n].\n\n[^n]: Note.` using the built-in extension/renderers.
Assert two distinct reference IDs, two backlinks resolving to those references,
and both refs resolving to the single definition.

Add `renders the first duplicate definition without duplicate keys`, using
`[^n]: First.\n[^n]: Second.`; assert one definition with First text and no
rendering exception. Test failures must describe the current bug, not import or
harness errors.

**Verify:** `pnpm test:only src/lib/extensions/footnote/markedFootnote.test.ts src/lib/SvelteMarkdown.footnotes.test.ts --reporter=dot`
→ new content-preservation and repeated-reference tests fail. Duplicate-definition
case fails either by duplicate-key error or incorrect duplicate DOM. Record the
specific observed failures; all legacy footnote tests remain passing.

### Step 2: Consume only supported definition text

Replace the competing outer/inner regexes in `markedFootnote.ts` with a single
boundary-aware line scanner following the contract. Keep the two existing
extension names and `{id,text}` token data shape. `start()` must identify line
starts, not a definition-looking substring in the middle of prose. Do not
consume trailing unrelated blocks. Deduplicate adjacent labels in a section
first-wins, preserving raw spans for all consumed definitions. Global duplicate
suppression across sections belongs to Step 3's render snapshot.

Add parser tests for plain blocks after definitions, empty bodies, adjacent
definitions, indented continuations, blank lines, CRLF, and definition-looking
text inside prose/code. For direct tokenizer tests, assert the unconsumed suffix;
for lexer tests, assert semantic token contents. Marked may normalize raw line
endings before tokenization; compare spans against the string actually supplied
to the tokenizer.

**Verify:** `pnpm test:only src/lib/extensions/footnote/markedFootnote.test.ts --reporter=dot`
→ all parser cases pass, including the Step 1 data-loss reproduction. Navigation
cases may remain red until Step 3; do not delete or weaken them.

### Step 3: Prepare immutable occurrence metadata and connect rendering

Create the internal typed helper `footnote-render-metadata.ts`. Its pure function
accepts the complete current token tree and returns a fresh snapshot containing
WeakMaps from reference token to reference props and section token to a cloned,
deduplicated footnotes array. Traverse document order through `tokens`, `items`,
`header`, and `rows`, including nested lists, blockquotes, and table-cell tokens.
Handle nested arrays deliberately. Match the stock rendered tree: skip image
`tokens` (Marked parses alt text into children, but Image does not render them),
and do not descend into code/codespan leaf contents or attribute strings. Ignore
unrelated fields. First gather reference occurrences and first definitions, then
construct section backrefs;
a reference may occur after its definition. Use Map/Set, never prototype-backed
label objects; handle labels such as `__proto__`. No global counters, DOM queries,
mutation of tokens, async work, or repeated document scans per component.

In SvelteMarkdown, compute a separate `$derived` snapshot from the complete
prepared `tokens`. Enable the scan only when extensionTokenNames includes
`footnoteRef`/`footnoteSection`, or source is a pre-parsed token array; otherwise
pass `undefined` without traversing the tree. Footnote scans must not start at
`divergeAt`: the stable prefix contributes occurrences and may need new backlinks.
Do not change existing heading/key preparation.

Add an internal `footnoteMetadata` prop to Parser, destructure it so it does not
leak into user renderer props, and forward it through the recursive Parser in
`dispatch`. Look up token extras from the current snapshot in `dispatch`, spread
them after token props like heading extras, and keep keys unchanged. This makes
snapshot replacement a reactive dependency even for reused tokens; a mutable
WeakMap hidden in context alone is insufficient. Avoid `$state` writes inside a
`$derived` computation.

Update FootnoteRef/FootnoteSection with the additive props and shared ID helpers
in the contract. Standalone sections deduplicate repeated labels locally; an
empty prepared section should render nothing, not an empty footnotes landmark.
Rendered definition body stays escaped plain text. Do not import renderer
components from core helpers or add a public package export.

Add pure-helper tests on deeply frozen token trees, nesting, repeated IDs,
separated duplicate sections, backward references, special labels, and fresh
snapshots. Assert source/token objects remain unchanged, per-document occurrence
count starts at one on every preparation, and no lookup is keyed only by label
when a token occurrence is required.

**Verify:** `pnpm test:only src/lib/extensions/footnote src/lib/utils/footnote-render-metadata.test.ts src/lib/SvelteMarkdown.footnotes.test.ts --reporter=dot`
→ all Step 1 regressions and new unit tests pass. `pnpm check` → zero errors.

### Step 4: Prove streaming, caching, and override behavior

Extend the integration suite using the shared streaming harness. The complete
matrix below is required. When testing stream completion, first flush queued
chunks, then rerender with both the accumulated final `source` and
`streaming:false`; toggling streaming off while leaving source empty is not a
valid completion test. Exercise `resetStream()` and `streamId` replacement using
existing API patterns, not an invented finish API.

Create FootnoteSnippetProbe.svelte if needed to prove snippet overrides receive
`referenceId` and per-definition `backrefs`, and that internal metadata does not
leak as an extra user prop. Use container-scoped queries in multiple-instance
cases: automatic cross-document ID namespaces are intentionally not promised.
When comparing completed static vs streaming DOM, compare semantic content,
reference IDs, href targets, and backlinks. DOM identity assertions apply to
nodes whose source location remains unchanged during append; replacements of
arbitrary earlier source are allowed to remount changed content.

**Verify:** run the footnote test command and streaming guard command from the
command table → all pass. Specifically, an existing definition node must gain a
backlink when a later reference is appended without relying on its token changing.

### Step 5: Document compatibility and run full verification

Update README's footnote section: indentation rules, first-definition-wins,
repeated occurrence backlinks, ID encoding/suffix examples, additive renderer
props, and the existing separate-document namespace limitation. Ordinary simple
single-reference examples stay unchanged. Do not advertise full CommonMark/GFM
footnote compatibility or Markdown rendering in bodies.

Run `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test --reporter=dot --maxWorkers=2`, and
`pnpm build` → all exit 0, coverage thresholds unchanged. `git diff --check` must
exit 0. Compare `git status --short` against the recorded initial state and
allowlist. Record actual red/green evidence and gates in the batch README.

## Test plan

- Data-loss red case: paragraph/heading after definition, including streaming.
- Definition followed by list, fence, HTML, another definition, and empty body.
- Four-space/tab continuations; blank followed by indented continuation;
  blank followed by normal prose; LF/CRLF and accurate consumed raw.
- Same label used twice/thrice, nested refs in emphasis/list/blockquote/table,
  a ref before its definition and a ref appended after it.
- Image alt text containing `[^n]` does not count as a rendered reference. With
  `![image[^n]](https://example.com/img.png) text[^n].\n\n[^n]: Note.`, the
  body reference gets the first ID and exactly one backlink. With only the alt
  reference and a definition, there are no prepared backlinks. Cover both the
  helper and component integration.
- Adjacent/separated duplicate definitions: first wins, no duplicate-key error
  or duplicate definition IDs, no disappearance of intervening prose.
- Special labels: `x`, `x-2`, `x:ref:2`, `x~003a`, Unicode, `__proto__`, and a
  lone surrogate. ID generation is injective/nonthrowing and fragments resolve.
- Stream one character at a time and in awkward chunks splitting `[^`, `]:`,
  newlines, and Unicode; completed output equals static output. Pending syntax
  must not throw or permanently swallow following content.
- Retain existing reference/definition DOM nodes across append-preserved content;
  backlinks in reused prefix definitions update when later refs arrive.
- Completion with final source and streaming=false has matching DOM semantics.
- resetStream, streamId change, replacement by shorter source, re-render from
  cache, and rendering the same frozen pre-parsed tokens in two instances:
  no counter drift, stale backlinks, token mutation, or cross-instance state leak.
- Components/snippets get additive navigation props; no-footnote documents keep
  the fast path. Existing heading, redraw, streamId and tail-safety tests pass.

## Done criteria

- [ ] Step 1 content-loss, duplicate-reference, and duplicate-definition failures
      were recorded and now pass without weakening assertions.
- [ ] Complete footnote matrix and streaming guard commands exit 0.
- [ ] `trunk check`, `pnpm check`, `pnpm test --reporter=dot --maxWorkers=2`, `pnpm build`, and
      `git diff --check` exit 0; coverage thresholds and dependencies unchanged.
- [ ] No edits outside the allowlist beyond pre-existing user changes.
- [ ] README documents the actual supported contract; batch status/evidence updated.

## STOP conditions

- Baseline runtime excerpts no longer match or red reproductions unexpectedly pass.
- Correctness requires changing generic token reuse, parser hooks, heading keys,
  sanitizer behavior, or footnote full-reparse safety.
- Any proposed approach mutates cached/caller tokens or depends on component
  mount order for occurrence allocation.
- The metadata prop cannot update a stable prefix definition without remounting
  it, or no-footnote rendering regresses existing allocation/identity tests.
- A verification gate fails twice after a reasonable fix attempt.
- An existing documented compatibility contract contradicts the definition
  continuation or ID policy; report it rather than silently expanding scope.

## Maintenance notes

Footnote navigation is document-level data: computing it in individual component
mount callbacks will break cache hits, nesting, and streaming. Keep metadata
preparation synchronous and pure, and propagate a reactive snapshot rather than
relying on hidden mutation. Maintain the distinction between token source data,
source-based render keys, visible labels, DOM IDs, and URI fragments. Shared
encoding must stay injective. Future namespace or rich-body work needs its own
API decision and tests. Full reparsing for this extension is intentional.
