# Adversarial performance review

Reviewed 2026-09-27 against `7dea763`, including the five active plans,
their cited benchmark evidence, and the implementation. Verdict: **do not
dispatch this batch unchanged**. Useful optimization hypotheses are mixed
with unsafe changes, invalid reproductions, and unsupported speed forecasts.

This is a review, not a replacement implementation plan. No runtime source
was changed. Before dispatch, revise the affected steps and verification gates
below; retain the existing correctness, coverage, typecheck, and Trunk gates.

## Blocking findings

### 1. Plan 001 relies on an unsound equality predicate

Evidence: `src/lib/utils/streaming-token-reuse.ts:44–77` compares type,
raw/text, and child arrays, but ignores render-affecting scalar fields such
as link href/title. Plan 001 calls this sufficient for whole-tree reuse.

Reproduced with the installed Marked lexer and the actual comparator loaded
through Node's TypeScript stripping, without writing source:

```text
before: See [ref].\n\n[ref]: https://example.com/a
after:  See [ref].\n\n[ref]: https://example.com/abc
before paragraph link href: https://example.com/a
after paragraph link href:  https://example.com/abc
isSameStableNode(beforeParagraph, afterParagraph): true
```

Reusing this paragraph keeps the old destination. The comparator weakness
already exists; expanding its use requires fixing its semantic contract first.
Do not infer rendered equality from raw source equality when references or
extension callbacks can change interpretation.

Required revision: characterize chunked reference URL/title completion,
reference images, and extension-derived scalar properties. Assert fresh-parse
parity after relevant intermediate chunks, not only at stream completion.
Define conservative semantic reuse; unknown mutable extension values must not
silently qualify. Keep reference invalidation tests as well as identity tests.

**Confidence HIGH; correction effort M; implementation risk HIGH.**

### 2. Plan 005 breaks component ownership during tail promotion

Evidence: Plan 005:166–187 moves newly closed roots from a tail array to a
prefix array rendered by a different keyed each block. Each Svelte each block
owns its own item map (`node_modules/svelte/src/internal/client/dom/blocks/each.js:185`).
Equal keys across two owners do not transfer the existing component.

Ordinary block completion would destroy and recreate the promoted renderer,
losing its local state and potentially focus/selection. This directly violates
the plan's no-remount requirement.

Required revision: redesign around stable ownership, then test an individual
block from open tail through completion and later appends. Persistent segments
are a candidate to investigate, not a proven implementation prescription.
The metadata transaction also needs redesign: `render-metadata.ts:379–390`
resets the slugger when `startIndex` is zero. Passing global indices into
heading assignment alone does not fix the proposed tail reset. Test duplicate
headings across segment boundaries, promotion, resets, and option changes.

**Confidence HIGH; effort L; risk HIGH.**

### 3. Plan 005's validator simplification crashes on ordinary tables

Evidence: Plan 005:213 replaces recursive node-array validation with
`Array.isArray`. The comparator enumerates every field, including a table's
`align` array. Unaligned columns contain null, which is not a token.

An in-memory application of exactly that replacement, followed by comparing
two fresh lexer results for this input, throws
`TypeError: Cannot read properties of null (reading 'type')`:

```markdown
| a   | b   |
| --- | --- |
| c   | d   |
```

Required revision: preserve element validation at traversal boundaries. Add
unaligned/mixed-alignment tables and extension primitive/null array coverage
before changing the validator. Reducing repeated validation is worthwhile;
removing the distinction between data arrays and token arrays is unsafe.

**Confidence HIGH; effort S–M; risk MED.**

### 4. Plan 003's alleged list invalidation is not established

Evidence: `Parser.svelte:249–250` spreads parent props first and child token
props second. Installed Marked produces unchanged `raw` and `text` on both
the first item's text token and its nested inline token for the exact test
in Plan 003:172–177. Those values override the changing parent values.

The prescribed effect reading only text/raw therefore cannot establish the
claimed parent-raw propagation mechanism. Object/spread computations may still
cost time; table rows/header propagation is a different hypothesis. Neither
justifies the promised roughly one-third long-list improvement yet.

Required revision: reproduce actual invalidated computations with the default
renderers first; custom text renderers disable the inline text fast path
(`Parser.svelte:212`). Separate list spread overhead from table propagation,
measure each, and drop changes that do not improve the production path.

**Confidence HIGH in the evidence gap; effort S; investigation risk LOW.**

### 5. Plan 004's exact DOM test contradicts its implementation

Compiled the prescribed each-loop shape with the installed Svelte compiler.
The client controlled-each runtime appends an empty text anchor
(`each.js:194`); three lines do not give exactly three child nodes. Server
output additionally includes each and item comment markers, contradicting
the strict serialized HTML requirement on SSR/hydration.

Every generated line effect also reads `lines.length`, so replacing the split
array invalidates computations across lines. Fewer text writes might help
layout, but the compiler does not establish bounded update work or incremental
browser layout. That remains a browser experiment.

Required revision: keep this as a measured spike. Assert exact text content,
element shape, unchanged completed-line text-node identity, copy fidelity,
SSR/hydration, and replacement behavior. Explicitly decide the marker-node
contract. Do not use an impossible childNodes gate or promise a layout win.

**Confidence HIGH for DOM contradiction; layout benefit unproven; effort S–M;
risk MED.**

## Performance claims that need stronger evidence

1. **Plan 005 cannot provide O(tail) within its scope.**
   `incremental-parser.ts:413` copies the full prefix and `:601–610` scans it
   from zero. `isSameStableNode` lacks a same-object fast path and descends
   into unchanged trees. `SvelteMarkdown.svelte:594` unconditionally invokes
   the default no-op parsed callback with the complete token array, so the
   proposed lazy concatenation still has a consumer every update. Source
   append verification also scans the preceding source. Include these costs
   in the design or narrow the complexity claim. Same-object skips require
   an explicit immutability/extension contract, not blind insertion.
2. **The proxy diagnosis is a hypothesis.** Plan 002 compares Node work with
   a differently bounded browser measure and attributes the difference to
   deep proxies. A one-variable production-browser A/B can establish that.
   Keep the raw-state experiment small; defer the unrelated asyncTokens
   change unless separately justified. Test actual replacement/reset paths.
3. **The flush breakdown excludes major work.**
   `stream-flush-profile.ts:3–9` explicitly excludes the later DOM commit.
   Metadata is prepared in a derived (`SvelteMarkdown.svelte:552`), outside
   that synchronous measure. Parse/reuse/assignment stamps will not explain
   metadata, component updates, style/layout, paint, or GC. Collect a browser
   trace before assigning the remaining cost to any one subsystem.
4. **The existing comparison does not prove semantic parity.**
   `scripts/stream-compare-bench.mjs:122–131` accepts text lengths within 5%.
   A stale href has identical text length and can look faster. Compare semantic
   output against fresh parsing for our before/after runs: text, links/images,
   headings, table shape, code whitespace, and relevant intermediate states.
   Define intentional competitor differences separately.
5. **The target silently retreats from the stated goal.** The index says beat
   every scenario without dropped frames, then permits slower code rendering
   and persistent long-list over-budget frames. Plan 001 even forecasts
   3,300–3,800 ms for citations versus the recorded competitor 1,716–1,769 ms.
   These are intermediate milestones, not completion criteria.

For these measurement/design revisions: confidence HIGH in the missing
evidence or work; effort M–L; risk LOW for instrumentation, HIGH for changing
parser boundaries. No new end-to-end timing was collected in this review.

## Revised execution order and acceptance contract

1. Establish a paired baseline and phase attribution. Keep identical build,
   corpus, chunks, viewport, and browser; alternate before/after and renderer
   order, use warmups and at least five measured iterations, retain raw results.
   Repeat noisy results. Archived milliseconds are context, not a new baseline.
2. Run the minimal raw-stream-state A/B. Keep it only for measured benefit
   with reset, offset replacement, options, HTML collapse, and renderer parity.
3. Fix semantic equality and reference-update coverage, then assess whole-tree
   reuse with a real renderer-work observable. A new `reuseMode` field is not
   a performance regression test. Revisit reference re-lexing if it remains
   material; the plans have not proved it cheap enough to defer permanently.
4. Measure list and table work separately. Prefer proven reductions in visits,
   allocations, and renderer updates over stripping fields speculatively.
5. Redesign bounded prefix work with stable component ownership, parser
   boundaries, callback costs, and heading metadata treated together. Do not
   implement the current two-each split or shallow-only array validator.
6. Run the code-line experiment independently, accepting only a repeatable
   end-to-end win with correctness and SSR/hydration intact.

Retain the current 24 KB cases and add increasing prefix sizes (for example
24/96/384 KB) with an identical short appended tail. Include many short roots,
a large closed nested block, an open list/table/fence, and citations. Measure
both cumulative-source input and writeChunk input. Count stable-prefix visits
and key evaluations to demonstrate bounded work, not merely a low growth ratio
from heterogeneous first/last fifths of one corpus.

Track total CPU work, p95/p99 update work, input-to-visible latency, layout/paint,
allocation/GC, and frame cadence. The current rAF/forced-layout metric is useful
but does not include paint or directly count displayed dropped frames. An
initial investigation budget of 8 ms p95 renderer work leaves room within a
60 Hz frame; label it a target, not a measured result or universal guarantee.

The batch is complete only when the agreed workloads meet both semantic parity
and measured performance targets. Beating a competitor while hundreds of frames
remain over budget is an intermediate result. Do not mark the whole initiative
done on that basis; do not hide latency by skipping/coalescing additional updates.

## Review limits

Reviewed streaming plans and their direct runtime/benchmark dependencies.
Executed focused lexer/comparator probes and Svelte compiler checks. No source
edits, full test suite, fresh production benchmark, extension performance audit,
or broader security audit was performed. The separate Shiki spike report and
historical closed implementation batches were not re-audited.
