# Plan 006: Heading-id dedup snapshots slugger occurrences instead of replaying every prior heading

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- src/lib/utils/render-metadata.ts`
> On any change, compare "Current state" excerpts to live code; mismatch ⇒ STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: none (independent of 004, though both touch render-metadata.ts)
- **Category**: perf
- **Planned at**: commit `939f154`, 2026-07-07
- **Absorbs GitHub issue**: #337 (close #337 when this lands)

## Why this matters

`assignPreparedHeadingIds` makes per-flush **key assignment** linear (via the
`startOffset` prefix skip), but **heading-id dedup** stays O(N²) for
heading-dense streams: to dedupe a new heading (`intro`, `intro-1`, …) it
re-seeds a fresh `github-slugger` by replaying `slugger.slug(text)` over **every
prior heading** before `startOffset` on **every** flush. For a stream with H
headings over N flushes that is O(H·N). Measured impact is low for realistic docs
(~100ms across a 4000-token stream at one heading per 50 tokens) but pathological
for heading-dense mega-documents (~600ms at one heading per 8 tokens). Snapshotting
github-slugger's mutable `occurrences` map at the divergence boundary and
restoring it — instead of replaying — makes heading-id assignment O(tail),
matching the key-assignment path. This is a **pure performance** change: output
must be identical.

## Current state

- `src/lib/utils/render-metadata.ts` — render metadata; heading-id logic.

The replay loop, `src/lib/utils/render-metadata.ts:294-316`:

```ts
const assignPreparedHeadingIds = (nodes, options, preparation?) => {
    const slugger = new Slugger()
    const nextHeadingNodes: RenderMetadataNode[] = []

    if (preparation?.source !== undefined && preparation.startOffset !== undefined) {
        for (const heading of preparedHeadingNodes) {
            const headingOffset = getSourceOffset(heading)
            if (headingOffset === undefined || headingOffset >= preparation.startOffset) {
                continue
            }
            seedHeadingSlugger(heading, options, slugger) // <-- replays every prior heading
            nextHeadingNodes.push(heading)
        }
    }

    assignHeadingIds(nodes, options, slugger, nextHeadingNodes, preparation?.startIndex ?? 0)
    preparedHeadingNodes = nextHeadingNodes
}
```

`seedHeadingSlugger` (lines 281-292) calls `slugger.slug(node.text)` and stores
the id in the `headingIds` WeakMap. `slugger.slug(text)` both returns the deduped
slug **and** mutates `slugger.occurrences`. github-slugger exposes a mutable
`.occurrences` object (a plain record of `slug → count`), so a shallow clone can
snapshot/restore dedup state cheaply.

`preparedHeadingNodes` (module-closure state, line 106) is the ordered list of
heading nodes from the previous pass. `assignHeadingIds` (lines 253-279) walks
the token tree in document order, calling `seedHeadingSlugger` for each heading
and pushing it to `nextHeadingNodes`.

## The optimization

Maintain a saved `occurrences` snapshot associated with the stable-prefix
boundary. On an append-only pass (`startOffset` provided and > 0):

1. Restore the slugger's `occurrences` to the snapshot taken at/around
   `startOffset` (a shallow clone assigned to `slugger.occurrences`), instead of
   replaying every prior heading via `seedHeadingSlugger`.
2. Still push the prior in-prefix headings onto `nextHeadingNodes` (their ids are
   already in the `headingIds` WeakMap from the previous pass and don't need
   recomputpution — do **not** re-slug them).
3. Slug only the divergent tail (the `assignHeadingIds` call from `startIndex`).
4. Re-snapshot `occurrences` at the new boundary for the next pass.

Because the prefix headings keep their previously-computed ids and the tail is
slugged against the restored occurrences, output is identical to the replay
approach — but O(tail) instead of O(H).

**Correctness caveat**: the snapshot must be taken at the exact boundary whose
`occurrences` state corresponds to "all headings strictly before `startOffset`
have been slugged." The safest implementation stores, alongside
`preparedHeadingNodes`, a parallel snapshot of `occurrences` captured right after
the prefix headings were slugged on the previous pass. On the next append-only
pass, if the boundary matches, restore that snapshot; if the boundary does not
line up (e.g. `startOffset` moved backward, or a non-append pass), fall back to
the current replay path. **When in doubt, fall back to replay** — never emit a
wrong id to save time.

## Commands you will need

| Purpose   | Command                                                   | Expected on success |
| --------- | --------------------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                              | exit 0, 0 errors    |
| 328 tests | `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                          | all pass            |
| Lint      | `trunk fmt && trunk check`                                | exit 0              |

## Scope

**In scope**:

- `src/lib/utils/render-metadata.ts` — `assignPreparedHeadingIds` and new
  snapshot state.
- `src/lib/utils/render-metadata.test.ts` if it exists, else
  `src/lib/SvelteMarkdown.issue-328.test.ts` — add a heading-id-stability test
  and (optionally) a scan-count guard.

**Out of scope**:

- `getSourceOffset`, `assignSequentialSourceKeys`, source-key logic — untouched.
- Source-less root keys (plan 012).

## Git workflow

- Branch: `advisor/006-heading-id-slugger-snapshot` (`--no-track origin/main`).
- Commit style: `perf(render-metadata): snapshot heading slugger occurrences`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Lock in output-equivalence with tests (must stay green)

The existing #328 heading tests (drift, dedup order, `headerPrefix`,
custom-renderer id) are your equivalence guard. Run them first and confirm green
at baseline. Then add one explicit test: stream a document with duplicate heading
texts (`## Intro` appearing 3 times) across several appends and assert the final
ids are `intro`, `intro-1`, `intro-2` regardless of how the stream was chunked
(i.e. identical to a single-shot parse of the full source).

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → all pass
(the new duplicate-heading test passes against current replay code — it is an
equivalence guard, not a failing-first test).

### Step 2: Implement snapshot/restore

Add module-closure state for the occurrences snapshot and its boundary marker.
Replace the replay loop with: restore-snapshot-when-valid, else fall back to the
existing replay. Slug only the tail. Re-snapshot at the new boundary. Keep
`seedHeadingSlugger` for the tail and the fallback path.

Reference for reading/writing github-slugger occurrences: `new Slugger()` exposes
`.occurrences` (a mutable object). Snapshot with `{ ...slugger.occurrences }`;
restore with `slugger.occurrences = { ...snapshot }`. Confirm the field name in
`node_modules/github-slugger` before relying on it; if the installed version
names it differently, **STOP and report** rather than guessing.

**Verify**:

- `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → all pass (identical
  ids to Step 1).
- `pnpm test:only` → all pass.

### Step 3: (Optional) scan-count / scaling guard

If a microbench or scan-count harness pattern exists (issue #337 references an
in-process microbench of `prepareTokensForRender`), add a lightweight assertion
that the number of `slug()` calls per flush is proportional to the tail, not the
full heading count. If no such harness exists, skip this step — do not build a
timing-based test (flaky).

**Verify**: `pnpm check` → 0; `trunk fmt && trunk check` → 0; `pnpm test:only` → all pass.

## Test plan

- Equivalence test (Step 1) is the core guard: chunked stream ⇒ same heading ids
  as single-shot. Plus existing #328 heading tests must stay green.
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0.
- [ ] `pnpm test:only` exits 0; existing #328 heading tests + new equivalence
      test pass.
- [ ] Heading ids for a chunked duplicate-heading stream are byte-identical to a
      single-shot parse (asserted by test).
- [ ] The replay `for (const heading of preparedHeadingNodes)` loop no longer
      re-slugs every prior heading on the fast path (grep/inspection).
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 006 is updated; issue #337 noted as
      resolved-pending-merge.

## STOP conditions

- `assignPreparedHeadingIds` doesn't match the excerpt (drift).
- The installed github-slugger does not expose a mutable `occurrences` object
  under a name you can confirm — report; do not guess the internal API.
- Any existing #328 heading test changes its expected ids — output must be
  identical; a changed expectation means the snapshot boundary is wrong. Report.

## Maintenance notes

- This relies on a github-slugger internal (`occurrences`). If github-slugger is
  upgraded, re-verify the field exists and has the same semantics; the fallback
  replay path is the safety net if it ever disappears.
- Reviewer should confirm the fallback-to-replay triggers on any non-append or
  boundary-mismatch pass, so correctness never depends on the snapshot being
  valid.
