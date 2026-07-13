# Plan 012: Simplify the source-less root-key matching in render-metadata (investigate-then-shrink)

> **Executor instructions**: This plan has a mandatory **investigation phase**
> before any code change. Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 939f154..HEAD -- src/lib/utils/render-metadata.ts`
> On any change, compare "Current state" excerpts to live code; mismatch ⇒ STOP.

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED
- **Depends on**: recommend after 004 (both touch render-metadata.ts); no hard
  dependency.
- **Category**: tech-debt
- **Planned at**: commit `939f154`, 2026-07-07
- **Absorbs GitHub issue**: #339 (close when this lands or is consciously
  rejected).

## Why this matters

The source-less (pre-parsed token array) render-key path uses a ~90-line
heuristic quartet — the single largest chunk of complexity in
`render-metadata.ts`. It is load-bearing and correct, but likely reducible, and
it retains full-subtree identity `Set`s for the component lifetime (O(total
nodes)), pinning the prior token tree in memory. This plan investigates whether a
representative-identity map or first-descendant key inheritance can replace the
pairwise-overlap matching without regressing the three source-less DOM-identity
tests, and shrinks it if so. It is explicitly allowed to conclude "not worth
changing" and close #339 as rejected.

## Current state

- `src/lib/utils/render-metadata.ts` — the quartet, all only used when
  `Array.isArray(source)` (pre-parsed tokens with no source offsets):
    - `SourceLessRootRecord` interface (lines 39-43)
    - `previousSourceLessRoots` cross-pass state (line 107)
    - `collectSourceLessIdentities` — recursively builds a `Set` of **every**
      descendant object identity per root (lines 158-177)
    - `countIdentityOverlap` — pairwise set-overlap scoring (lines 179-188)
    - `findPreviousSourceLessRoot` — greedy best-match with a `usedPreviousRoots`
      guard (lines 190-214)
    - `assignSourceLessRootKeys` — orchestrates the above (lines 216-245)

Why it exists: when a caller recreates a root wrapper object but reuses nested
token objects (e.g. `listToken([...])` rebuilt with the same item objects), the
wrapper must inherit its prior render key so the container subtree is not
remounted. `getStableNodeKey`'s object-identity fallback (lines 116-123) already
covers "same wrapper object reused"; this quartet covers "new wrapper, reused
children."

The three tests that MUST keep passing (in
`src/lib/SvelteMarkdown.issue-328.test.ts`):

- "keeps a stable root token mounted when a sibling is inserted before it"
- "keeps a stable list item mounted when a sibling is inserted before it"
- "keeps a stable table body row mounted when a sibling row is inserted before it"

## Candidate simplifications (from issue #339 — evaluate in the investigation)

1. **Representative-child identity map.** Index each previous root by a single
   representative descendant identity (e.g. first nested token) in a
   `Map<object, record>`, giving O(1) previous-root lookup and O(roots) retained
   memory. Main edge case: first-child churn.
2. **First-descendant key inheritance.** A source-less root inherits the render
   key of its first descendant that already has a WeakMap key (recurse
   `tokens[0]`/`items[0]`), else its own object identity — O(depth), no Sets, no
   cross-pass root state.
3. Confirm whether any real scenario needs full-subtree overlap scoring at all,
   or whether a single stable representative identity is always sufficient.

## Commands you will need

| Purpose   | Command                                                   | Expected on success |
| --------- | --------------------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                              | exit 0, 0 errors    |
| 328 tests | `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                          | all pass            |
| Lint      | `trunk fmt && trunk check`                                | exit 0              |

## Scope

**In scope**:

- `src/lib/utils/render-metadata.ts` — only the source-less quartet and its
  cross-pass state.
- `src/lib/SvelteMarkdown.issue-328.test.ts` — may add edge-case tests
  (first-child churn, reorder) but must not weaken the three existing ones.

**Out of scope**:

- The source-backed key path (`assignSequentialSourceKeys`,
  `assignSourceKeysToChildren`) — untouched (plan 004 owns `rows` there).
- Heading-id logic (plan 006).
- `getStableNodeKey`'s object-identity fallback — keep it.

## Git workflow

- Branch: `advisor/012-simplify-sourceless-root-keys` (`--no-track origin/main`).
- Commit style: `refactor(render-metadata): shrink source-less root key matching`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Investigation (no code change yet) — add adversarial edge-case tests

Before touching the quartet, add tests that probe its behavior beyond the three
existing ones, so any replacement is held to the real contract:

- First-child churn: a root whose first nested token is replaced but the rest are
  reused — does the wrapper still inherit its key?
- Reorder: two same-type roots swap positions with reused children — does each
  keep its own key (the `usedPreviousRoots` greedy-match behavior)?
- Two structurally identical roots (same child identities) — tie-breaking.

Run these against current code and record the current (correct) behavior as the
baseline. These become the guard for the refactor.

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → all pass
(new edge tests capture current behavior).

### Step 2: Decide — simplify or reject

Based on Step 1, judge whether candidate 1 or 2 can satisfy **all** the tests
(three existing + new edge cases). Reason explicitly about the reorder and
first-child-churn cases, which are where representative-identity approaches tend
to break. If a candidate clearly works, proceed to Step 3. If none preserves the
reorder/tie-break behavior without re-introducing comparable complexity,
**STOP and report a "reject" recommendation** with the reasoning — closing #339
as "considered, not worth it" is a valid, valuable outcome (record it in the
batch README's rejected section).

**Verify**: a written decision (in your report) naming the chosen candidate or
the rejection rationale.

### Step 3 (only if simplifying): Implement the chosen candidate

Replace the quartet with the chosen approach. Reduce retained memory: no
full-subtree identity `Set`s held across passes (that is a core acceptance point
of #339). Keep `assignSourceLessRootKeys`'s external contract (same keys assigned
for the same inputs) so `getStableNodeKey` consumers are unaffected.

**Verify**:

- `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts` → all pass (three
  original + new edge cases).
- `pnpm test:only` → all pass.

### Step 4: Confirm memory reduction + full suite

Confirm `previousSourceLessRoots` no longer retains per-root full-subtree `Set`s
(inspect the new cross-pass state — it should hold representative identities or
nothing, not whole-subtree sets).

**Verify**: `pnpm check` → 0; `pnpm test:only` → all pass; `trunk fmt && trunk check` → 0.

## Test plan

- Guard tests: the three existing source-less DOM-identity tests + the new
  edge-case tests from Step 1.
- Verification: `pnpm test:only` → all pass; behavior for pre-parsed array
  reorders unchanged.

## Done criteria (if simplifying)

- [ ] `pnpm check` exits 0; `pnpm test:only` exits 0; `trunk fmt && trunk check` exits 0.
- [ ] The three existing source-less identity tests still pass, plus the new edge
      cases.
- [ ] `previousSourceLessRoots` no longer retains full-subtree identity `Set`s
      (inspection).
- [ ] `countIdentityOverlap` / `collectSourceLessIdentities` are removed or
      materially shrunk.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 012 is updated.

## Done criteria (if rejecting)

- [ ] A written rationale explaining why no candidate beats the current
      implementation without comparable complexity.
- [ ] The batch `README.md` "Findings considered and rejected" section records
      #339 with the one-line reason.

## STOP conditions

- The quartet doesn't match the excerpts (drift since 939f154).
- A candidate passes the three original tests but fails a reorder/first-child-churn
  edge case — do not ship it; either fix or reject.
- The simplification would change keys for the source-**backed** path — you've
  strayed out of scope; revert.

## Maintenance notes

- This path only runs for `Array.isArray(source)` (pre-parsed tokens). If the
  library later stops supporting pre-parsed sources, the whole quartet can be
  deleted.
- Reviewer should confirm the reorder and tie-break semantics are preserved (or
  consciously accepted as changed) — that is the subtle part of key stability.
