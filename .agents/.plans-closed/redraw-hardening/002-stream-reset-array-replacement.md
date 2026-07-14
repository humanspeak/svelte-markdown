# Plan 002: Stream resets replace the token array instead of mutating `length`

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/redraw-hardening/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat eed2e08..HEAD -- src/lib/SvelteMarkdown.svelte`
> If it changed since this plan was written, compare the "Current state"
> excerpts against the live code before proceeding; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt (consistency; latent stale-DOM edge)
- **Planned at**: commit `eed2e08`, 2026-07-13

## Why this matters

Issue #291 established that shrinking the reactive `streamTokens` array via
mutation (`per-index assignment + length = N`, and even `splice()`) did not
reliably dispatch unmount signals to the keyed each block, leaving stale
snippets in the DOM. The fix — documented in a load-bearing comment in
`SvelteMarkdown.svelte` — was to **replace the array reference**. Yet three
reset sites still use the mutation pattern (`streamTokens.length = 0`).
Shrink-to-zero appears to work in current Svelte 5, but it is the same class
of operation the codebase itself deprecated, and it is a trap for future
maintainers ("why is replacement required here but mutation fine there?").
This plan unifies all writes to reference replacement and pins reset-to-empty
behavior with a test.

## Current state

All excerpts from `src/lib/SvelteMarkdown.svelte` at `eed2e08`.

- The rationale comment (lines 174–183), attached to the streaming
  assignment in `applyStreamingSource`:

    ```ts
    // Replace the array reference rather than mutating per-index +
    // length. Under Svelte 5's reactive proxy, shrinking the array
    // via per-index assignment + `length = N` (and even `splice()`)
    // didn't consistently dispatch the unmount signal to the each
    // block, leaving stale snippets in the DOM whenever a streamed
    // `</details>` collapsed several siblings into one nested token.
    // See #291.
    ```

- The three mutation sites to change:

    1. `resetStreamingState` (line 259):

        ```ts
        if (nextSource === '') {
            clearStreamingParser()
            streamTokens.length = 0
            return
        }
        ```

    2. `syncStreamingSourceFromProp` (line 301):

        ```ts
        if (nextStr === '') {
            clearStreamingParser()
            streamTokens.length = 0
            return
        }
        ```

    3. The streaming `$effect`'s config-change branch (line 463):

        ```ts
        if (streamSourceBuffer === '') {
            clearStreamingParser()
            streamTokens.length = 0
            return
        }
        ```

- `streamTokens` is declared as `let streamTokens = $state<Token[]>([])`
  (line 133), so plain reassignment (`streamTokens = []`) is valid and is
  already the pattern used at lines 184–186 and 272.

- Existing coverage touching reset-to-empty:
  `src/lib/SvelteMarkdown.stream-id.test.ts` asserts an empty container
  after a `streamId` change with `source: ''` (which routes through
  `resetStreamingSession` → `resetStreamingState('')` → site 1). The
  imperative `resetStream('')` path (also site 1) and the prop-driven
  empty-string path (site 2) may or may not have direct unit assertions —
  Step 1 checks.

## Commands you will need

| Purpose     | Command                                                                                                                                | Expected on success      |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Typecheck   | `pnpm check`                                                                                                                           | exit 0, 0 errors         |
| Streaming   | `pnpm test:only src/lib/SvelteMarkdown.test.ts src/lib/SvelteMarkdown.stream-id.test.ts src/lib/SvelteMarkdown.streaming-html.test.ts` | all pass                 |
| Full unit   | `pnpm test:only`                                                                                                                       | all pass                 |
| Coverage    | `pnpm test`                                                                                                                            | all pass, thresholds met |
| Lint/format | `trunk fmt && trunk check`                                                                                                             | exit 0                   |

(Trunk is the lint authority — do not invoke prettier/eslint directly.)

## Scope

**In scope** (the only files you should modify or create):

- `src/lib/SvelteMarkdown.svelte` — the three `streamTokens.length = 0`
  sites only (plus, optionally, a one-line addition to the #291 comment).
- `src/lib/SvelteMarkdown.stream-reset.test.ts` (create, only if Step 1
  finds a coverage gap).

**Out of scope** (do NOT touch):

- `applyStreamingSource`'s assignment (lines 184–189) — already correct.
- Any other streaming state handling (`teardownStreamingBuffers`,
  `clearStreamingParser`, buffers, flush scheduling).
- `src/lib/utils/**` — no parser or reuse logic changes.

## Git workflow

- Branch: `advisor/002-stream-reset-array-replacement`, created with
  `git checkout -b advisor/002-stream-reset-array-replacement --no-track`
  from the batch branch (never track `origin/main`).
- Commit style: conventional commits, e.g.
  `refactor(streaming): reset streamTokens by reference replacement (#291 consistency)`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Check existing reset-to-empty coverage

Run `grep -rn "resetStream(" src/lib --include="*.test.ts"` and
`grep -rn "source: ''" src/lib/SvelteMarkdown*.test.ts`. Determine whether a
unit test already renders streamed content into the DOM and then asserts an
**empty container** after (a) imperative `resetStream('')` and (b) a
prop-driven `source` change to `''` while streaming.

If both are covered, skip Step 2. If either is missing, do Step 2.

**Verify**: you can name the covering test(s) by file and test title, or
you have a concrete list of the missing case(s).

### Step 2 (conditional): Pin reset-to-empty behavior BEFORE the change

Create `src/lib/SvelteMarkdown.stream-reset.test.ts` modeled on
`src/lib/SvelteMarkdown.stream-id.test.ts` (copy its
`beforeEach`/`afterEach`/`flushStreamingBatch` setup at lines 27–49). For
each missing case from Step 1: stream multi-block content (e.g.
`'# Title\n\nOne.\n\nTwo.'`), flush, assert the blocks are in the DOM, then
trigger the reset (`component.resetStream('')` inside `act`, or
`rerender({ source: '', streaming: true })`), and assert
`container.textContent?.trim()` is `''` and
`container.querySelectorAll('h1, p')` has length 0.

Run it against the **unchanged** code first: it must pass (current
behavior is believed correct — this is a characterization test, not a red
test; see Test plan).

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.stream-reset.test.ts`
→ passes against unchanged source.

### Step 3: Replace the three mutation sites

In `src/lib/SvelteMarkdown.svelte`, change each of the three excerpts in
"Current state" from `streamTokens.length = 0` to `streamTokens = []`.
Optionally append one line to the #291 comment block (lines 174–183):
`// Resets below follow the same rule: always replace, never shrink.`

**Verify**:

- `grep -n "streamTokens.length" src/lib/SvelteMarkdown.svelte` → no matches
- `pnpm test:only src/lib/SvelteMarkdown.test.ts src/lib/SvelteMarkdown.stream-id.test.ts src/lib/SvelteMarkdown.streaming-html.test.ts`
  → all pass (plus the Step 2 file if created)

### Step 4: Full gate

**Verify**:

- `pnpm check` → exit 0
- `pnpm test` → all pass, coverage thresholds met
- `trunk fmt && trunk check` → exit 0
- `git status` → only in-scope files changed

## Test plan

- **Red-test exemption**: this is a behavior-preserving consistency refactor.
  Current `length = 0` resets are not observably broken in today's Svelte 5,
  so no failing reproduction exists to write; the risk being closed is
  divergence from the #291-mandated pattern and fragility against future
  Svelte reactivity changes. Instead, Step 2 adds _characterization_ tests
  (green before and after) pinning reset-to-empty DOM behavior, if Step 1
  finds gaps.
- Cases: imperative `resetStream('')` empties the DOM; prop-driven
  `source: ''` while streaming empties the DOM.
- Pattern: `src/lib/SvelteMarkdown.stream-id.test.ts`.
- Verification: `pnpm test` → all green.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "streamTokens.length" src/lib/` returns no matches
- [ ] `pnpm check` exits 0
- [ ] `pnpm test` exits 0 with coverage thresholds met
- [ ] Reset-to-empty is covered by a named unit test (pre-existing or added
      in Step 2) that passes
- [ ] `git status` shows no files changed outside the in-scope list
- [ ] `.agents/.plans/redraw-hardening/README.md` status row for 002 updated

## STOP conditions

Stop and report back (do not improvise) if:

- The three excerpts don't match the live code (drift since `eed2e08`).
- Step 2's characterization test **fails against unchanged code** — that
  means reset-to-empty is already broken (a real #291-class bug), which is a
  bigger finding than this plan; report it instead of fixing it here.
- After Step 3, any existing streaming test fails — reference replacement at
  a reset site should be strictly equivalent; a failure means something
  depends on mutation semantics and needs an advisor decision.

## Maintenance notes

- After this lands, the invariant is simple and greppable: `streamTokens` is
  only ever **assigned**, never structurally mutated. A reviewer seeing any
  future `streamTokens.push/splice/length` write should reject it and point
  at the #291 comment.
- Interacts with plan 011 in this batch (token-reuse identity refactor),
  which touches the same assignment region of `SvelteMarkdown.svelte` —
  land this small plan first to avoid merge churn.
