# Plan 011: Fold streaming token reuse into IncrementalParser under one identity rule and a generic child walk

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. This is the highest-risk plan in the batch — its STOP conditions are
> load-bearing. Update this plan's row in
> `.agents/.plans/redraw-hardening/README.md` when done.
>
> **Drift check (run first)**:
> `git diff --stat e8940c5..HEAD -- src/lib/utils/incremental-parser.ts src/lib/utils/streaming-token-reuse.ts src/lib/SvelteMarkdown.svelte`
> On any change, compare "Current state" excerpts to live code; mismatch ⇒ STOP.
>
> Revision 2026-07-13 (guard, operator-approved): re-baselined the drift check
> from `eed2e08` to `e8940c5` after plans 001/002 of this batch landed on main
> (PRs #365/#364). Guard verified all "Current state" excerpts against
> `e8940c5`: `incremental-parser.ts` and `streaming-token-reuse.ts` are
> byte-identical since `eed2e08`; in `SvelteMarkdown.svelte` only plan 002's
> reset-site swaps and two invariant comments landed, shifting the streaming
> assignment excerpt from lines 184-186 to 188-190 (refs updated below).
> Note for the executor: the reset sites now use `streamTokens = []` — your
> collapsed assignment must follow the same replace-never-shrink invariant
> documented at the `streamTokens` declaration (`SvelteMarkdown.svelte:133`).
>
> **Carried over 2026-07-13**: this plan was authored in the (now closed)
> `streaming-component-hardening` batch at `939f154` and never executed. It was
> moved here and its line references, excerpts, and drift baseline were
> refreshed against `eed2e08` (the code drifted meaningfully in between: #359
> added tail-window incremental lexing to `incremental-parser.ts`). The plan
> number 011 is preserved for traceability with issues #331/#333 and the
> original batch's guard reports.

## Status

- **Priority**: P2
- **Effort**: L
- **Risk**: HIGH
- **Depends on**: 001-redraw-regression-harness.md (soft but strongly
  recommended — its Parser-count and DOM-identity tripwires must be green and
  unmodified when this refactor lands). Land 002 first too; it touches the
  same region of `SvelteMarkdown.svelte` and avoids merge churn. (The original
  003/005/007 prerequisites from the source batch all landed already.)
- **Category**: tech-debt (structural correctness hardening)
- **Planned at**: commit `939f154`, 2026-07-07; refreshed against `eed2e08`,
  2026-07-13; re-baselined against `e8940c5` (post-001/002), 2026-07-13
- **Absorbs GitHub issues**: #331 (single identity rule) and #333 (generic child
  walk). Close both when this lands.

## Why this matters

"Are these the same stable streaming node?" is encoded in **two** places that
disagree:

- The parser's divergence loop (`incremental-parser.ts:585-596`) keys on `raw`
  plus an HTML shape check.
- `hasSameStableNodeIdentity` (`streaming-token-reuse.ts:13-35`) adds a `type`
  equality check **and** a `text` fallback on top of the same HTML shape check.

Because they disagree, a token the parser calls "diverged" can still be
resurrected wholesale by the reuse module — the mechanism behind stale-render
bugs (the archived repro cases in issue #331). Separately, the reuse walk only
recurses into four hard-coded child keys (`tokens`/`items`/`header`/`rows`) and
applies its structural check only to `type === 'html'` — a per-type allowlist on
shared infra that will silently mis-reuse any nested token shape it doesn't know
(issue #333). Folding reuse into `IncrementalParser.update()` so it returns an
already-reused token array governed by a **single** identity rule eliminates the
divergence structurally: the component assignment collapses to
`streamTokens = newTokens`, and `reuseStableStreamingTokens` / `divergeAt` /
`canReuse` drop off the public surface.

The user-visible staleness is **already gated** by the shipped `canReuse` flag
(append-only ∧ ¬referenceSensitive ∧ non-empty prevSource), so this plan's value
is maintainability + regression-prevention (one owner, one rule), not an urgent
bug. Treat it as a careful refactor with its own tests, per #331's own guidance.

## Current state

### The two identity encodings

Parser divergence loop, `src/lib/utils/incremental-parser.ts:581-618` (at
`eed2e08`; identity checks at 590-596, interleaved since #359 with
tail-window `divergeOffset` accounting that this plan must preserve exactly):

```ts
let divergeAt = 0
let divergeOffset: number | undefined = parseResult.usedTailWindow ? boundary.reparseOffset : 0
if (!referenceSensitive) {
    const minLen = Math.min(this.prevTokens.length, newTokens.length)
    while (divergeAt < minLen) {
        const prev = this.prevTokens[divergeAt]
        const next = newTokens[divergeAt]
        if (prev.raw !== next.raw) break
        if (prev.type === 'html' && next.type === 'html') {
            const prevKids = (prev as HtmlToken).tokens
            const nextKids = (next as HtmlToken).tokens
            if ((prevKids === undefined) !== (nextKids === undefined)) break
            if (prevKids && nextKids && prevKids.length !== nextKids.length) break
        }
        // ... divergeOffset accounting: tail-window path sums past
        // boundary.prefixCount; full-reparse path sums from 0 and nulls
        // the offset on an html span mismatch (lines 597-615) ...
        divergeAt++
    }
}
```

`update()` returns `{ tokens, divergeAt, divergeOffset, canReuse, usedTailWindow }`
(`incremental-parser.ts:620-627`). `usedTailWindow` and `divergeOffset` are
consumed by the render-metadata prefix skip and must survive this refactor
unchanged.

Reuse module, `src/lib/utils/streaming-token-reuse.ts:13-35` (`hasSameStableNodeIdentity`)
and `:80-107` (`reuseStableNode` with the enumerated `tokens`/`items`/`header`/
`rows` walk). The module is consumed at `src/lib/SvelteMarkdown.svelte:188-190`:

```ts
streamTokens = canReuse ? reuseStableStreamingTokens(streamTokens, newTokens, divergeAt) : newTokens
```

### The archived repro tests (acceptance guards — port these first)

Issue #331 preserves a `streaming-reuse-repro.test.ts` with 2 happy-path cases
and 3 "suspected bug" cases (reference definition arriving later; offset-mode
edit inside a closed html block; parser reset with different options). **Recreate
that test file verbatim from the issue #331 body** as the first step — it is the
behavioral contract this refactor must satisfy by construction. The three
suspected-bug cases exercise the module _without_ the `canReuse` gate to prove the
identity rule is correct on its own.

## Commands you will need

| Purpose   | Command                                                                                                                                | Expected on success |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck | `pnpm check`                                                                                                                           | exit 0, 0 errors    |
| Reuse     | `pnpm test:only src/lib/utils/streaming-token-reuse.test.ts`                                                                           | all pass            |
| Parser    | `pnpm test:only src/lib/utils/incremental-parser.test.ts src/lib/utils/incremental-parser.nested-html.test.ts`                         | all pass            |
| Streaming | `pnpm test:only src/lib/SvelteMarkdown.test.ts src/lib/SvelteMarkdown.streaming-html.test.ts src/lib/SvelteMarkdown.issue-328.test.ts` | all pass            |
| All unit  | `pnpm test:only`                                                                                                                       | all pass            |
| Lint      | `trunk fmt && trunk check`                                                                                                             | exit 0              |

## Scope

**In scope**:

- `src/lib/utils/incremental-parser.ts` — extend `update()` to return an
  already-reused token array under one identity predicate.
- `src/lib/utils/streaming-token-reuse.ts` — either fold its logic into the parser
  and delete it, or reduce it to a single shared identity predicate the parser
  imports. Generic child walk (all array-of-nodes own-properties) replaces the
  enumerated keys.
- `src/lib/SvelteMarkdown.svelte` — collapse the `canReuse` branch at 188-190.
- Test files: recreate `streaming-reuse-repro.test.ts`; update
  `streaming-token-reuse.test.ts` and `incremental-parser.test.ts` to match the
  new surface.

**Out of scope**:

- Reference-sensitivity logic (`referenceSensitive`, `canUseTailWindow`, the
  reference-syntax helpers) — keep semantics identical; this plan unifies node
  identity, not reference safety.
- The `divergeOffset` source-offset accounting (used by render-metadata prefix
  skip) — preserve it exactly.
- The tail-window machinery added by #359 (`src/lib/utils/tail-window.ts`,
  `getTailWindowBoundary`, `usedTailWindow`, `boundary.prefixCount` /
  `reparseOffset` seeding) — preserve behavior byte-identically; the identity
  predicate is the only thing being unified.
- `src/lib/SvelteMarkdown.redraw-regression.test.ts` (added by plan 001) —
  must stay green **unmodified**; if this refactor changes its measured
  deltas, that is a STOP condition, not a baseline update.
- render-metadata source-less keys — plan 012 of the closed
  `streaming-component-hardening` batch (REJECTED; do not revisit).

## Git workflow

- Branch: `advisor/011-unify-token-reuse-identity` (`--no-track origin/main`).
- Commit style: `refactor(parser): single identity rule for streaming token reuse`.
  Commit in stages: (1) port repro tests, (2) generic child walk under one
  predicate, (3) fold into update() + collapse component, (4) delete dead surface.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Port the acceptance repro tests (they define correctness)

Recreate `src/lib/utils/streaming-reuse-repro.test.ts` from the issue #331 body
exactly (2 happy-path + 3 suspected-bug cases). Run against current code to see
the baseline: the happy-path cases pass; note which suspected-bug cases pass/fail
today (some may already pass because of the shipped `canReuse` gate at the
component level, but these tests call the module directly without the gate).

**Verify**: `pnpm test:only src/lib/utils/streaming-reuse-repro.test.ts` runs;
record which cases pass/fail as your baseline.

### Step 2: Define ONE identity predicate, and a generic child walk

Create a single `isSameStableNode(prev, next)` predicate that is the union of the
two current encodings' _safe_ checks: same `type`, same `raw` (with the `text`
fallback only when neither has `raw`), and the HTML children-shape check
generalized. Replace the enumerated `tokens`/`items`/`header`/`rows` recursion
with a generic walk over **all array-valued own-properties** (iterate
`Object.keys`, recurse into arrays-of-nodes and arrays-of-arrays uniformly), so no
token shape is silently treated as a leaf. Derive the structural comparison from
the child walk rather than a per-`type` allowlist.

Keep this as a shared function both the parser divergence loop and the reuse
merge use — that is the "one rule" requirement. Do not yet move it into
`update()`; first make both call sites use the same predicate and confirm green.

**Verify**:

- `pnpm test:only src/lib/utils/streaming-reuse-repro.test.ts` → all 5 cases pass
  (the 3 suspected-bug cases are now correct by construction).
- `pnpm test:only src/lib/utils/streaming-token-reuse.test.ts src/lib/utils/incremental-parser.test.ts`
  → all pass.

### Step 3: Fold reuse into `update()` and collapse the component

Make `update()` return `tokens` that are **already the reused array** (splice the
stable prefix from `prevTokens`, deep-merge the boundary token via the shared
predicate/walk). Then change `SvelteMarkdown.svelte:188-190` to
`streamTokens = newTokens` unconditionally. Remove `reuseStableStreamingTokens`,
`divergeAt`, and `canReuse` from the public surface **only after** all callers are
migrated. Preserve `divergeOffset` and `streamRenderMetadataStartIndex/Offset`
behavior exactly (render-metadata depends on it).

**Verify**:

- `pnpm test:only src/lib/SvelteMarkdown.test.ts src/lib/SvelteMarkdown.streaming-html.test.ts src/lib/SvelteMarkdown.issue-328.test.ts`
  → all pass.
- `pnpm test:only` → all pass.

### Step 4: Delete dead surface, typecheck, lint

Remove now-unused exports. Confirm nothing in `src/lib/index.ts` exported the
removed symbols (they are internal — verify with grep).

**Verify**: `pnpm check` → 0; `pnpm test:only` → all pass; `trunk fmt && trunk check` → 0;
`grep -rn "reuseStableStreamingTokens\|canReuse\|divergeAt" src/lib` shows no
stale references (except any intentionally kept internal usage you documented).

## Test plan

- Acceptance: the 5 ported repro cases (Step 1) — the 3 suspected-bug cases are
  the regression guards this refactor must satisfy by construction.
- Regression: full existing streaming suites
  (`incremental-parser*`, `streaming-token-reuse`, `SvelteMarkdown*`) stay green.
- Add at least one new case per #333: a nested token type under a **non**-enumerated
  key (e.g. simulate an extension token carrying children under a custom key) that
  must NOT be over-reused when its nested child changed.
- Verification: `pnpm test:only` → all pass.

## Done criteria

ALL must hold:

- [ ] `pnpm check` exits 0; `pnpm test:only` exits 0; `trunk fmt && trunk check` exits 0.
- [ ] The 5 repro cases from issue #331 exist and pass.
- [ ] A single identity predicate governs both the parser divergence and the node
      merge (one function, both call sites).
- [ ] The child walk is generic (no hard-coded `tokens`/`items`/`header`/`rows`
      allowlist gating recursion) — asserted by the new #333 test.
- [ ] `SvelteMarkdown.svelte` streaming assignment is unconditional
      (`streamTokens = newTokens`), or the `canReuse` branch is gone.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 011 is updated; issues #331 and #333
      noted as resolved-pending-merge.

## STOP conditions

- Any in-scope file drifted from the excerpts since e8940c5.
- Plan 001's redraw-regression tests fail or need their delta baselines
  changed to pass — that means this refactor altered render identity; report
  the failing assertion and the `__svmParserByType` breakdown.
- Folding reuse into `update()` changes `divergeOffset` or the render-metadata
  prefix-skip behavior (an #328 test fails) — the offset accounting is subtle;
  report rather than adjusting expectations.
- The generic child walk causes a real regression in an existing streaming test
  that the enumerated walk didn't — that means a token shape needs special
  handling; report the specific token/test.
- You cannot make all 5 repro cases pass without weakening the reference-sensitivity
  gate — reference safety is out of scope; report the conflict.

## Maintenance notes

- After this lands, there is exactly one place to reason about "same stable
  streaming node." Any future token type is handled by the generic walk without
  edits here.
- Reviewer must scrutinize: `divergeOffset` preservation, the reference-sensitive
  path staying byte-identical, and that the generic walk doesn't over-reuse
  (structural check still fires when a nested child changed).
- Plan 007 of the source batch already landed (its single-pass reuse array is
  the current shape of `streaming-token-reuse.ts:131-170`); deleting
  `reuseStableStreamingTokens` here supersedes that optimization, which is
  expected and fine.
