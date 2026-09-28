# Plan 011 design: bounding the root `{#each}` without a second owner

Status: **DECIDED — implemented as option (c), offset-bucket root segments
under one owner.** Numbers: `evidence/011/README.md`.

## The cost being designed away

Step 1 attribution, `prefix-384kb` (12,940 root tokens; each streamed frame
changes only the last one or two), ours, one traced run, ms per frame:

| Where (production bundle)                                                   | Before Steps 2–4 | After Steps 2–4 |
| --------------------------------------------------------------------------- | ---------------- | --------------- |
| Svelte each-block body: key per root, item-map lookups (`2:4085` + inlined) | 1.4 + 4.7¹       | 5.7             |
| Keyed reconcile `ta` / `ea` (second pass over every root)                   | 2.8 + 0.9        | 2.9 + 0.9       |
| Batch effect-tree traversal `#v` (visits every item effect)                 | 4.0              | 3.1             |
| `update_effect` `qr`, key lookup `getRenderKey`/`getStableNodeKey`          | < 0.01 + 0.5     | 1.1 + 0.7       |
| **Root keyed each, total**                                                  | **≈ 14.3**       | **≈ 14.3**      |
| Library flush (parse + diff + state write)                                  | 0.95             | 0.16            |

¹ Before Steps 2–4, 313.9 ms of self time sat in `update_reaction` (`Ur`)
called straight from the traversal; after, `Ur` self is 9 ms and the each
body's self time rose by the same amount (95 → 380 ms). Read as V8 inlining
the body into `Ur` in the first build (an inference from the profiles; the
sum is unchanged either way).

Dev counters (vitest harness, mean per update): `keyEvaluations` 5,162 /
19,946 / 77,642 at 24 / 96 / 384 KB — about six key calls per root per update
in dev (the body, the reconcile, and Svelte's dev-only key validation; two in
production).

Steps 2–4 do not touch this cost; it is ≈ 14.3 ms/frame at 384 KB, far above
the plan's 0.5 ms "material" threshold and the 0.3 ms "do nothing" bound.

## Options

### (a) Do nothing — rejected

14.3 ms/frame is 45% of the frame at 384 KB and the reason every frame there
was over budget.

### Two `{#each}` blocks, stable prefix + open tail — forbidden

Svelte each blocks own their items (`each.js`: items live in the block's own
`state.items` map; a key that leaves one block is destroyed there and created
in the other). Promoting a closed block from the tail array to the prefix
array remounts it. Not considered further.

### (b) Chunked segments by root INDEX, as sketched in the plan — rejected in favour of (c)

`{#each segments (segment.id)}{#each segment.tokens (key)}` with a new segment
started every K roots. Two problems found while designing it:

1. **A root can move between owners.** A root's key is its source offset, but
   its index can change while the key is kept: an earlier token split that
   preserves the offset (`'Intro\n-  \n\nMore'` → `'Intro\n- T\n\nMore'`: the
   setext heading becomes heading + list, `More` keeps offset 12 but moves from
   index 1 to index 2; existing test "keeps a downstream paragraph mounted when
   an earlier token split preserves its source offset"). If that index crosses
   a K boundary the root changes inner `{#each}` and remounts. Making the
   layout "sticky" (remembering which segment a key was born in) avoids that
   but makes the layout depend on streaming history.
2. **History-dependent layout.** A sticky layout differs between a streamed
   render and a one-shot render of the same source (segment sizes depend on
   when roots arrived), so the rendered markup (each-block anchors) differs,
   SSR/hydration markers can disagree, and "streamed output equals one-shot
   output" stops being a byte comparison.

### (c) Chunked segments by source OFFSET — chosen

Same two-level structure, but a root's segment is
`Math.floor(rootStartOffset / ROOT_SEGMENT_SPAN)` (`ROOT_SEGMENT_SPAN = 4096`
source characters); a segment is the run of consecutive roots whose start
offsets fall in one bucket, keyed by the bucket index.

- **Single owner for life.** The render key of a source-backed root is
  `src:<offset>` (or `src:<offset>:zero:<index>` for zero-length roots, which
  changes whenever the index does anyway). The segment is a pure function of
  that offset, so while a root's key lives it is always in the same bucket,
  i.e. under the same inner `{#each}`. A root is created, updated and
  destroyed by exactly one owner — the ownership rule the plan requires,
  without any history. The index-shift case above keeps its bucket.
- **Deterministic.** The layout is a pure function of the final root array,
  so streamed and one-shot renders produce identical markup (tested:
  `innerHTML` equality after streaming across several segment boundaries).
- **Bounded per update.** `prepareRootSegments` (render-metadata.ts) keeps
  every segment that ends at or before the metadata start index (the first
  root that may have changed — the parser's `divergeAt`) as the same object
  and rebuilds from the segment containing it: O(one segment + the changed
  tail), plus an O(#segments) slice of the outer array. A rebuilt segment
  whose roots are all the previous objects keeps its previous object. The
  outer `{#each}` then sees the same item for every untouched segment
  (Svelte's item source is `===`-equal, nothing below it is dirtied, and the
  batch traversal skips the clean branch effects), and only the touched
  segment's inner `{#each}` re-diffs its ≈ 140 prose roots.
- **Heading ids and keys are untouched.** Segmenting is a render-only
  grouping: `prepareTokensForRender` still walks the one global root array,
  heading ids still use global root indices, and the heading undo log still
  rewinds from the global start index — no `rootIndexBase` per segment is
  needed because no metadata is computed per segment. Render keys stay source
  offsets.
- **Fallback.** Caller-supplied token arrays (no source, keys by object
  identity) and Parsers without render-metadata context render the flat
  `{#each}` as before. `getRootSegments(tokens)` returns segments only for the
  exact array that was prepared, so a nested root-mode Parser never picks up
  another array's segments. Switching a component between string and token
  array sources changes the key space anyway (offsets vs identities).
- **No DOM change.** Each blocks add no elements; the only markup difference
  is Svelte's anchor comments, identical for streamed and one-shot renders.
  Layout cost is therefore unchanged (see "What this does not fix").

### Guard added with (c): metadata start index across unrendered updates

Found while writing the ownership tests: `SvelteMarkdown` overwrote the
metadata start index on every parser update. When two updates land before one
render (two `writeChunk` calls that each flush, or an offset edit followed by
an append), the second update's start index skipped roots the first one
changed. With the flat `{#each}` that only left those roots without source
keys (object-identity fallback); with segments it would keep a segment
holding the pre-edit roots and render stale text. The start index now only
decreases until the `tokens` derived consumes it
(`streamRenderMetadataConsumed`). Red → green: "an edit and an append applied
before one render re-prepare from the edit" rendered `Closed paragraph 0`
instead of `Edited paragraph 0` without the guard. `prepareRootSegments` also
refuses to keep segments when the supplied start offset disagrees with its
own bookkeeping or the start index lies past the previous array.

### Span choice

4096 characters ≈ 140 roots of the bench's closed prose (≈ 29 chars per
root), 94 segments at 384 KB: per update ≈ 94 outer items + ≤ 140 inner roots
instead of 12,940. A span is a character bucket, so a pathological source of
tiny roots (one-character paragraphs) gives larger segments, and a single huge
root (a 100 KB fence) is one root in one segment followed by empty (absent)
buckets — no worse than today. Not tuned further; the remaining per-frame cost
at 384 KB is layout, not the each blocks.

## Acceptance tests (all in `src/lib/SvelteMarkdown.bounded-prefix.test.ts`

unless noted)

- A `TrackedParagraph` streamed open in 7-character chunks just before a
  segment boundary, closed, then followed by 100 appended paragraphs (crossing
  more boundaries) is mounted exactly once and never destroyed; no paragraph
  in the document remounts; final `innerHTML` equals a one-shot render.
- `# Intro` three times with > 4096 characters between them, streamed in 32
  character chunks: ids `intro`, `intro-1`, `intro-2`, identical to a
  non-streaming render, and identical markup.
- `resetStream(other)` and a `headerPrefix` option change on a multi-segment
  document re-render to exactly the one-shot output.
- Two updates before one render (grow-then-close and edit-then-append) render
  current content.
- `keyEvaluations` per update does not grow with the prefix (300 vs 20
  paragraphs); red with the flat each (4,829 > 588).
- `render-metadata.test.ts` › "root segments (plan 011)": bucket layout, kept
  segments identical by object after a partial pass, a new bucket on append,
  streamed layout equals one-shot layout after 150 incremental passes, full
  rebuild on an inconsistent start offset, no segments for caller arrays.
- Existing #291/#328 suites (including the offset-preserving split above) and
  heading parity stay green.

## What this does not fix

The page's forced layout (`getBoundingClientRect` after each frame) costs
0.94 / 2.64 / 11.2 ms per frame at 24 / 96 / 384 KB of rendered DOM (19,489
elements at 384 KB) before and after this plan; paint grows with it once
frames overrun. That is proportional to the size of the rendered document,
not to anything the renderer does per update (Streamdown pays it too), and
bounding it needs DOM-level containment (e.g. `content-visibility` on closed
blocks), which changes consumers' markup/CSS and is out of this plan's scope.
It is why `prefix-384kb` cannot land within 15% of `prefix-24kb` on this
bench; see the evidence README for the measured split.
