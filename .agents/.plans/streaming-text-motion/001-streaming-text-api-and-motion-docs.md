# Plan 001: Expose headless streaming text segments and document Motion presets

> Executor instructions: Read this entire plan before implementation. Run each
> verification gate. Honor STOP conditions; do not silently weaken guarantees.
> Update the adjacent README status after completion. This is a single selected
> feature plan, not a general repository audit.
>
> Drift check: `git diff --stat c2ca115..HEAD -- src/lib src/routes tests docs/src README.md scripts/tree-shaking.mjs`
> Compare the excerpts below with live code if any scoped file changed.

> Revision 2026-10-05: Operator approved expanding the investigation to parser
> and HTML cleanup provenance after Sol reproduced the `**a` → `**a** a`
> counterexample. Add a read-only provenance design checkpoint before Step 1.
> Common-prefix/suffix matching is not an approved complete arrival algorithm.
> Default behavior, headless control, optional presets and verification gates
> remain unchanged. Implementation awaits parent review of the proposed design.

## Status

- Priority: P1
- Effort: L
- Risk: HIGH (stream identity, Unicode segmentation, SSR, parser performance)
- Depends on: none
- Category: direction
- Planned at: commit `c2ca115`, 2026-10-05

## Why this matters

Consumers want words or letters to animate as markdown streams, with complete
control over presentation. Supply a headless Svelte API that tracks segments and
arrival metadata; consumers render them with @humanspeak/svelte-motion or their
own markup. Supply predefined renderers as optional package imports, with several effects
to choose from, plus copyable docs examples that explicitly install Motion. The core renderer must retain ordinary, unwrapped text and carry
no Motion dependency when this feature is not enabled.

## Current state and conventions

- `src/lib/SvelteMarkdown.svelte`: owns per-instance streaming buffers, reset,
  batching, parser and render metadata. `writeChunk()` supports append strings
  and offset patches; `resetStream(nextSource = '')` is public. `streamId` resets
  synchronously before an imperative write as well as through the prop effect.
- `src/lib/Parser.svelte:215`: `inlineTextOk` only allows default text/rawtext
  renderers and no corresponding snippet override. Keep that fast path.
- `src/lib/Parser.svelte:601`: the general renderer's children recurse through
  tokens or invoke `<renderers.rawtext text={sanitizedRest.raw} {...sanitizedRest} />`.
  There is another rawtext leaf path for HTML at line 573. Trace both and the
  inline shortcut; do not assume a rawtext snippet is currently called at these
  fallback sites merely because its type exists.
- `src/lib/types.ts`: `RawTextSnippetProps` currently has `text: string`;
  `SnippetOverrides` includes rawtext. Extend this additively.
- `src/lib/utils/render-metadata.ts:237` assigns keys approximately as follows:

```ts
const spanLength = getNodeSourceLength(node)
const nodeOffset = absoluteOffset + cursor
const key = spanLength === 0 ? `src:${nodeOffset}:zero:${index}` : `src:${nodeOffset}`
cursor += spanLength
setRenderKey(node, key)
assignSourceKeysToChildren(node, nodeOffset)
```

Children start at the parent offset (line 354), including nested inline token
lists. These are reconciliation keys, NOT an exact mapping from rendered
characters to markdown source characters. Do not use them as exact provenance.

- `src/lib/renderers/RawText.svelte` demonstrates the component convention:

```svelte
<script lang="ts">
    interface Props {
        text?: string
    }
    const { text }: Props = $props()
</script>

{text}
```

Use Svelte 5 runes, TypeScript and named `Snippet` types. Preserve escaped text
interpolation; never inject rendered segment text through {@html}.

- `src/lib/index.ts` exports the component and public types, with .js imports.
- `src/lib/SvelteMarkdown.stream-id.test.ts` uses Testing Library, act(),
  `useStreamingTestHarness()` and `flushStreamingBatch()` from
  `src/lib/test/streaming/harness.ts`. Match that deterministic batching pattern.
- `src/lib/snippet-props.test.ts` and `src/lib/test/snippets/` check actual props
  reaching consumer snippets; follow them for metadata delivery tests.
- `docs/src/lib/examples/llm-streaming/demos/StreamingConsole.svelte` is the
  existing streaming simulator. Leave it intact; add a separate animation demo.
- `docs/src/routes/examples/llm-streaming/+page.svelte` uses ExampleV2,
  CodeReferenceV2 and demoCodeSample. Reuse this structure to expose actual source.
- `docs/src/routes/docs/advanced/llm-streaming/+page.svx` is the prose guide.
- `docs/package.json` already has @humanspeak/svelte-motion ^1.2.1; existing
  examples import MotionSpan/MotionDiv. Use the installed version's exports and
  types instead of assuming website examples reflect the installed version.
- Trunk is the formatting/lint authority. No raw prettier/eslint, no lint script
  additions, no eslint-disable comments. Keep existing sanitizer behavior.
- No additional ADR/CONTEXT/DESIGN/PRODUCT document was found in focused recon.
  Full DOM sanitization, document fetching and editor features are out of scope.

## Public API contract

The default is strictly unchanged: merely upgrading or importing the core library
must not add wrappers, tracking, animation, Motion imports, or altered streaming
behavior. Users may choose either the headless API or explicitly imported presets.

Use these names unless a documented type/name collision is found:

1. Add `streamingText?: boolean` to SvelteMarkdownProps, default false. It enables
   arrival bookkeeping, not animation. Effective only when the synchronous
   streaming path is active. Enabling mid-stream baselines existing content.
2. Add optional `streamingText?: StreamingTextMetadata` to leaf renderer and
   rawtext snippet props. This is reserved metadata: user passthrough props must
   not overwrite it. Do not forward it onto DOM elements.
3. Export `StreamingText` and its types from the package root. This headless
   helper receives `text`, optional `metadata`, `granularity` (word or grapheme,
   default word), optional `locale`, optional custom `segmenter`, and optional
   `segment: Snippet<[StreamingTextSegment]>`. Without a segment snippet, render
   plain escaped text without wrappers. Outside enabled streaming, produce stable
   segments with isNew=false; this is not an independent animation engine.
4. A custom segmenter receives text and returns ordered `{ text, start, end }`
   spans in UTF-16 offsets, covering it exactly once. Validate coverage, ordering
   and content; throw a descriptive error for invalid output rather than dropping
   text. Cache Intl.Segmenter by locale/granularity. Feature-detect it; document
   that grapheme/locale-aware words require Intl.Segmenter or a custom segmenter,
   and report missing support clearly rather than splitting surrogate pairs.
5. Segment snippet fields: `id` (stable within stream epoch), `text`, `index`,
   `start`, `end` (leaf-local UTF-16 offsets), `isNew`, `batchId`, `batchIndex`,
   and `isWhitespace`. Metadata carries epoch, leaf identity, render batch and
   arrival ranges sufficient for the helper to derive these fields. Document
   exact exported types with readonly fields; do not expose mutable token objects.
6. isNew describes eligibility for an entrance on creation, not a timer. Retain
   segment creation metadata across unrelated updates. New segment ids should
   mount once in the helper's keyed each; updates to an unfinished word retain
   its id and update text without replay. Whitespace remains literal; docs render
   it outside motion spans. batchIndex is leaf-local within the arrival batch,
   not a promise of global stagger across the document.
7. First supplied content and reset seeds are baseline (isNew=false). Appends
   after baseline are arrivals. A changed streamId/resetStream creates a fresh
   epoch even for identical text. Isolation is per component, with no singleton.
8. Unchanged visible text that moves under a new markdown wrapper is already
   revealed. Its DOM may necessarily remount; its initial state must be false.
   New ids must not imply new arrivals. Example: an incomplete link's label
   becoming a complete link must not replay its previously displayed letters.
9. Offset replacements/revisions: unchanged prefix/suffix retain revealed
   eligibility; changed interior is classified as revised, not a new arrival by
   default. Expose a segment `change: 'baseline' | 'append' | 'revision'` so the
   consumer can elect to animate revisions. Do not search by string value alone:
   repeated words must have distinct identities. Shrink clears removed records.
10. Turning streamingText off discards its ledger. streamId, reset, source
    replacement and streaming/async mode switches must never retain stale
    arrival state. No hooks alter writeChunk transport batching or input-mode locks.

### Optional predefined renderers

Add a dedicated package subpath `@humanspeak/svelte-markdown/streaming/motion`
exporting three rawtext renderer components:

- `FadeWords`: word-level opacity entrance.
- `RiseWords`: word-level opacity and small vertical translation entrance.
- `FadeCharacters`: grapheme-level opacity entrance (letters/emoji intact).

These are actual reusable library exports, not just snippets living in docs.
Do not re-export them from the core index, and do not import their module from
SvelteMarkdown or StreamingText. Each renderer composes StreamingText and Motion
with conservative documented preset defaults, accepts the same text/streamingText
metadata as a rawtext renderer, and exposes optional `initial`, `animate`,
`transition`, `variants`, `custom`, locale and segmenter customization with types
from the installed Motion API. Add `enabled` (default true) and `animateRevisions`
(default false) to make disabling/revision choices explicit. Accept a consumer
segment snippet for complete markup control; that snippet replaces preset markup.

When disabled, render plain escaped text without segment wrappers. Consumers
manage reduced motion explicitly through enabled; show a reactive media-query
example with SSR-safe setup and listener cleanup. Keep preset animation
eligibility separate from consumer Motion props: baseline uses initial=false,
unless an explicit animateInitialContent option is chosen (default false).
Never let the default initial prop replay baseline text on structural remounts.
Only transform presets need inline-block spans; whitespace stays plain text.
Default stagger is batch-local and capped; no timer queues or global delays.

Declare @humanspeak/svelte-motion as an OPTIONAL peer dependency with a range
verified against the installed compatible version, plus a root devDependency for
preset tests/build. It must be explicitly installed by consumers choosing this
subpath. Package installation/core use without that optional peer must succeed;
importing the preset subpath without it should fail through normal module
resolution, not silently use a different effect. Keep package dependencies free
of Motion and never make this peer mandatory. Update pnpm-lock.yaml minimally.

The simple consumer path must compile and run:

```svelte
<script lang="ts">
    import SvelteMarkdown from '@humanspeak/svelte-markdown'
    import { FadeWords } from '@humanspeak/svelte-markdown/streaming/motion'
    let source = $state('')
</script>

<SvelteMarkdown {source} streaming streamingText renderers={{ rawtext: FadeWords }} />
```

Document equivalent RiseWords/FadeCharacters selection and a configured wrapper
component forwarding metadata and supplying custom Motion props. Do not require
consumers to copy an entire animation implementation to use a preset.

### Fully custom consumer integration

Consumer integration to make compile and run:

```svelte
<script lang="ts">
    import SvelteMarkdown, { StreamingText } from '@humanspeak/svelte-markdown'
    import { MotionSpan } from '@humanspeak/svelte-motion'
    let source = $state('')
</script>

<SvelteMarkdown {source} streaming streamingText>
    {#snippet rawtext({ text, streamingText })}
        <StreamingText {text} metadata={streamingText} granularity="word">
            {#snippet segment(part)}
                {#if part.isWhitespace}
                    {part.text}
                {:else}
                    <MotionSpan
                        initial={part.isNew ? { opacity: 0 } : false}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.18, delay: part.batchIndex * 0.02 }}
                        >{part.text}</MotionSpan
                    >
                {/if}
            {/snippet}
        </StreamingText>
    {/snippet}
</SvelteMarkdown>
```

This sketch must be compiled against installed Motion types; adapt imports to
available equivalents if needed, retaining the headless consumer boundary.

## Scope

Only modify:

- `src/lib/StreamingText.svelte` and `src/lib/StreamingText.test.ts` (new).
- `src/lib/utils/streaming-text.ts`, its test and `streaming-text-context.ts` (new;
  use .svelte.ts instead if runes are required, not a second redundant module).
- `src/lib/SvelteMarkdown.svelte`, `src/lib/Parser.svelte`, `src/lib/types.ts`,
  `src/lib/index.ts`; additive metadata plumbing only.
- `src/lib/utils/render-metadata.ts` and its tests only if required for leaf
  identity plumbing; do not change existing render keys or heading slug behavior.
- `src/lib/SvelteMarkdown.streaming-text.test.ts` and fixtures under
  `src/lib/test/streaming-text/` (new).
- `src/lib/snippet-props.test.ts` and `src/lib/test/snippets/` for rawtext delivery.
- `src/routes/streaming-text/+page.svelte`, `tests/streaming-text.test.ts` (new).
- `src/lib/streaming/motion/index.ts`, `FadeWords.svelte`, `RiseWords.svelte`,
  `FadeCharacters.svelte`, and preset implementation/tests under that folder (new).
- `package.json` for the isolated streaming/motion export, optional Motion peer
  and test-only devDependency; `pnpm-lock.yaml` for these scoped changes only.
- `scripts/tree-shaking.mjs` for core isolation and preset import assertions.
- `docs/src/lib/examples/llm-streaming/demos/StreamingMotionDemo.svelte`,
  `MotionStreamingText.svelte` in that same folder (new).
- Existing example page, existing streaming guide, README.md, and this batch index.

Do not modify the parser algorithm, sanitizer, transport semantics, other docs
pages, generated docs/static files, release workflows or coverage thresholds.
Do not add Motion to regular dependencies or mandatory peers. The operator's
competitive-intel state was restored separately; preserve it and do not edit it
as part of implementation.

## Commands and git workflow

Use Node >=22 and packageManager pnpm@12.6.0. Branch is already
`feat/streaming-text-motion`, from fresh origin/main at c2ca115. Do not create a
second branch, commit, push or open a PR without operator instructions.

| Purpose                | Command                                                                                                                           | Expected success                      |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Dependencies if needed | `pnpm install --frozen-lockfile`                                                                                                  | exit 0; tracked files unchanged       |
| Focused tests          | `pnpm test:only src/lib/utils/streaming-text.test.ts src/lib/StreamingText.test.ts src/lib/SvelteMarkdown.streaming-text.test.ts` | all pass                              |
| Library types          | `pnpm check`                                                                                                                      | exit 0, no errors                     |
| Docs types             | `pnpm --filter docs check`                                                                                                        | exit 0, no errors                     |
| Formatting             | `trunk fmt`                                                                                                                       | exit 0, scoped files only             |
| Lint                   | `trunk check`                                                                                                                     | exit 0                                |
| Full coverage          | `pnpm test`                                                                                                                       | exit 0; existing thresholds unchanged |
| Build                  | `pnpm build`                                                                                                                      | exit 0 including publint              |
| Bundle boundary        | `pnpm test:tree-shaking`                                                                                                          | exit 0                                |
| Focused E2E            | `pnpm test:e2e tests/streaming-text.test.ts --project=chromium`                                                                   | all pass                              |
| Full E2E               | `pnpm test:e2e`                                                                                                                   | all configured projects pass          |

These are repository-defined commands, not a claim that the advisor ran them.
Coverage thresholds in vite.config.ts: statements/functions 95, branches 89,
lines 96. CI's current run-tests workflow uses Node 24. Tests generate only
standard test/build artifacts during implementation, not during this plan pass.

## Steps

### Step 0: Research a provenance design (read-only checkpoint)

Inspect marked tokenization and this repo's parse/HTML cleanup/incremental reuse
pipeline. Return a self-contained design report; do not implement or change the
plan. Investigate narrowly additive provenance metadata in the parsing pipeline,
including exact text-to-source mappings and remount-safe reveal identity. The
operator approved investigating these additional paths:

- `src/lib/utils/markdown-parser.ts` and its tests.
- `src/lib/utils/token-cleanup.ts` and its tests.
- `src/lib/utils/incremental-parser.ts` and parity/nested-HTML/fuzz tests.

This is approval to research these files, not a settled implementation strategy.
Do not fork or edit marked, alter parsed token semantics, or drop correctness
requirements. Parent reviews findings and explicitly specifies implementation
changes before redispatch. Preserve disabled-mode cost and sanitizer behavior.

The report must explain source-offset capture before cleanup, mapping of escaped
or decoded characters and stripped markup, preservation through nested containers
and token reuse, coverage for HTML leaves, behavior for custom extensions without
provenance, SSR determinism, and cost for append-only versus revision updates.
Avoid inferred exact offsets from existing render keys and repeated-string search.
Identify a feasible minimal architecture or provide precise remaining blockers.

Required proof examples: `**a` then appended `** a` (old a remains old, final a
is new); incomplete link completion with repeated label text; entities/escapes;
list/blockquote offsets; HTML normalization; offset replacements; reset epochs;
Unicode grapheme completion. Use read-only executable experiments when useful.
If an exact guarantee is impossible for some extension, describe an explicit
conservative fallback without claiming unsupported provenance is exact.

**Verify:** parent independently reproduces decisive experiments, reads cited
code and accepts a concrete scope/test design before source implementation.

### 1. Prove bookkeeping feasibility before UI work

Implement the pure reconciler with tests in streaming-text.ts and its test.
Keep per-instance records across leaf component remounts. Project ordered rawtext
leaves into visible text ranges, comparing previous and next visible sequences;
reuse common prefix/suffix coverage for wrapper-only changes and revisions.
Keep leaf boundaries to avoid combining separate blocks; do not mistake token
raw lengths for visible character offsets. Include removed/blocked content only
according to the same parser routing that actually renders it. Extension code,
code blocks and codespans are excluded from default word animations.

Prepare this projection once per committed render batch, before snippet rendering;
reading metadata or rendering a snippet must not advance arrival state. Use
per-component WeakMaps/context and bounded live records; release on reset/destroy.
Default disabled mode must skip projection and segmentation entirely. Optimize
stable token subtrees and append tails; do not flatten the full accumulated
source every update. For grammar revisions allow a bounded divergent-block walk.

If the projection cannot match default parser routing without rewriting parsing,
STOP and report the exact limitation. Do not substitute approximate source keys
or a global string-match heuristic. Scope guarantees to supported built-in leaf
paths and document custom renderer responsibility explicitly.

**Verify:** `pnpm test:only src/lib/utils/streaming-text.test.ts` passes cases for
append, unfinished word, repeated words, whitespace, revisions, wrapper changes,
reset epochs and unchanged-prefix work counters. This is a net-new API; no
artificial red test is required for absent exports.

### 2. Implement the headless component and exported types

Add StreamingText using keyed segments and consumer snippet rendering. Segment
Unicode using Intl.Segmenter or validated custom segmentation. When a trailing
word/grapheme extends, preserve its id. Changing locale/segmentation rebaselines
existing text (no automatic replay). Cache segmentation of stable content and
only resegment the unstable tail when valid; grapheme boundaries may change.
Add public types and exports. No Motion import in the headless helper or core;
Motion imports belong exclusively to the optional preset subpath in Step 4.

**Verify:** `pnpm test:only src/lib/StreamingText.test.ts` and `pnpm check` exit 0.
Assert exact textContent, keyed DOM retention, emoji/combining marks, no wrappers
without a snippet, invalid segmenter errors and deterministic initial output.

### 3. Wire metadata through streaming lifecycle and leaf dispatch

Enable bookkeeping with streamingText=true on the effective synchronous stream.
Pass metadata to rawtext component overrides AND rawtext snippet overrides at
both fallback sites, excluding inherited parent raw/text props as current
childRest does. Add no metadata to DOM attributes. Ensure the inline fast path
remains used when neither overrides nor tracking are requested.

If the declared rawtext snippet is currently bypassed, add a failing regression
in snippet-props.test.ts FIRST: a rawtext override rendering a marker must be
called for plain paragraph text. Run `pnpm test:only src/lib/snippet-props.test.ts`
and observe the missing marker failure; then fix dispatch and make it green.

**Verify:** focused tests plus `pnpm test:only src/lib/snippet-props.test.ts
src/lib/SvelteMarkdown.stream-id.test.ts src/lib/SvelteMarkdown.stream-reset.test.ts`
all pass. Include component identity isolation, same-tick streamId/write race,
source snapshots, append strings, offset writes, nested strong/em/link/table/list,
HTML leaf text, empty/reset seeds and async streaming fallback.

### 4. Ship optional preset exports, executable docs and a browser fixture

Implement and test the three predefined rawtext renderers under the isolated
streaming/motion subpath, with optional peer packaging as specified above.
Verify each with streamed metadata, preset selection, consumer overrides,
enabled=false and baseline/remount behavior. No Motion-dependent module may
be reachable from the core module graph.

Create MotionStreamingText.svelte as copyable consumer code, importing
StreamingText from markdown and MotionSpan from @humanspeak/svelte-motion.
Use the packaged FadeWords, RiseWords and FadeCharacters in the demo selector;
also show the fully custom headless path so users can replace all presentation.
Expose consumer-owned duration, stagger and reduced-motion disable choices in
StreamingMotionDemo. No preset silently becomes a core library default.
Use plain whitespace; use inline-block only for transforms and explain wrapping
tradeoffs. Motion initial=false for baseline/revised text unless user opts in.
Cap example stagger to avoid a long queue when a large batch arrives.

Provide installation command `pnpm add @humanspeak/svelte-markdown
@humanspeak/svelte-motion`, complete renderer/snippet registration, imports,
streamId and both prop/imperative examples. Clearly distinguish default core
behavior, optional preset imports and fully custom snippets. Add a comparison
of the three effects and show that installing Motion alone enables nothing. Document exclusion of code renderers,
batch-local stagger, structural remount vs arrival identity, SSR initial state,
custom segmentation and browser support. Explain that reveal pacing is separate
from arrival effects. No AnimatePresence needed for append-only entrances.

Update existing example page with ExampleV2 and actual demo source, and the
streaming guide/README with API reference and link. Add root fixture without
Motion (metadata markers) so root Playwright does not require docs dependencies.

**Verify:** `pnpm --filter docs check` and focused E2E pass. Run the docs dev
server with `pnpm --filter docs dev` and inspect /examples/llm-streaming through
the available collaborative preview. Use consumer controls to exercise both
presets and disabled motion; confirm no hydration errors and visible final text.
Record results in the index; stop the server when finished.

### 5. Verify packaging, performance boundary and regression gates

Extend tree-shaking cases for core component, root import, and StreamingText
import to require @humanspeak/svelte-motion, motion and motion-dom absent. Add a
preset-subpath consumer case that successfully bundles all named exports and
asserts Motion is present. Build a temporary consumer without the optional peer
to verify core/package import works there; do not rely only on tree shaking with
Motion installed. Test missing peer failure only for the isolated preset import.
Do not assert motion UI code absent from the docs bundle that deliberately uses it.
Run formatting then lint, both type checks, full coverage, pnpm build,
tree-shaking and full E2E. Report baseline failures separately; do not weaken
coverage or repair unrelated modules. Check `git diff --check` and
`git diff --name-only` for exact scope. Mark plan DONE only when gates pass.

## Test plan and done criteria

- Reconciler: exact leaf coverage; append versus revision classification;
  repeated identical words; prefix/suffix overlap; removed text; wrapper reparse;
  no bookkeeping churn from repeated reads; records discarded at reset.
- Helper: emoji ZWJ sequences, regional flags, combining marks arriving later,
  spaces/tabs/newlines, CJK locale segmentation, missing Intl.Segmenter with and
  without custom segmenter, invalid spans, unfinished words, batching and rebaseline.
- Integration: partial emphasis and links completing, duplicate messages in
  isolated instances, source replacements, offset patches out of order, toggles,
  SSR/hydration (browser fixture), and default unwrapped text/sanitization retained.
- Performance: deterministic visited-node/segmentation work counters prove that
  appending to a later block does not rescan completed blocks. Avoid timing-only
  assertions and arbitrary speed claims. Segment DOM cost is opt-in and document it.
- Motion docs: consumers can change all effects, disable animation, change
  granularity, restart stream; reduced-motion behavior is explicit and tested.
- All command-table verification gates exit 0, with existing coverage thresholds.
- No Motion import outside src/lib/streaming/motion; core isolation assertions
  pass for all three entry cases, and explicit preset import bundles Motion.
- Optional peer metadata and subpath exports pass publint; no-peer core consumer
  succeeds. All three named preset exports compile and are exercised by tests.
- Existing default-streaming DOM and rendering tests remain unchanged and pass;
  no animation/tracking is activated without explicit consumer selection.
- Both component and snippet rawtext customization receive metadata; exports
  and README API reference agree with compiled examples.
- No tracked edits outside Scope; adjacent index updated with test evidence.

## STOP conditions

- Exact arrival coverage requires guessing source provenance from existing keys.
- Structural changes replay old content, or disabled mode incurs a full text walk.
- Existing code differs materially from excerpts and cannot be reconciled safely.
- Installed Motion types cannot support the documented presets without upgrading;
  report minimal required version instead of changing dependencies unilaterally.
- Two attempts at a verification gate fail, or an out-of-scope edit is required.
- Custom segmenter or SSR support forces silent Unicode corruption or text loss.

## Maintenance notes

Review resets and grammar completion changes whenever parser reuse changes.
Custom renderers that replace or suppress visible text are responsible for their
own segment rendering; metadata guarantees cover built-in leaf routing, not
arbitrary user-generated text. Audit future rawtext dispatch branches for metadata
parity. Do not add timer-based queues or default motion to this feature; pacing
and exit effects can be separately designed later. Maintain preset/subpath
isolation when expanding the available effects.

References: [Svelte Motion repository](https://github.com/humanspeak/svelte-motion) and
[AnimatePresence docs](https://motion.svelte.page/docs/animate-presence) (verified during planning).
Prefer local installed types when online docs describe a newer release.
