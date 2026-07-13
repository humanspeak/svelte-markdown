# Plan 001: Add an automated redraw-regression harness (Parser-count + DOM-identity tripwires)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/redraw-hardening/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat eed2e08..HEAD -- src/lib/Parser.svelte src/lib/SvelteMarkdown.svelte src/lib/SvelteMarkdown.stream-id.test.ts`
> If any of these changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S–M
- **Risk**: LOW (adds tests only; no source changes)
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `eed2e08`, 2026-07-13

## Why this matters

This library's streaming render path has accumulated significant
anti-redraw machinery: source-offset stable keys on every `{#each}` block,
streaming prefix reuse by object identity, recursive tail-token reuse, and
inline fast paths that skip Parser instantiation for text/space/default-HTML
tokens. **None of it is guarded by an automated test.** A dev-only
instantiation counter exists (`window.__svmParserCount`) and a manual bench
page reads it, but no unit or E2E test asserts instantiation counts or DOM
node identity across streaming flushes. The existing
`tests/performance.test.ts` only asserts wall-clock timings, which are far
too noisy to catch a keying regression. History shows these regressions are
subtle (issues #291, #328, #339). This plan converts the existing counter
into permanent CI tripwires, and is a prerequisite for safely executing the
higher-risk refactor in plan 011 of this batch.

## Current state

- `src/lib/Parser.svelte` — recursive render engine. Contains a **dev-only
  instantiation counter** (lines 155–165) that increments once per Parser
  component instantiation:

    ```ts
    if (import.meta.env.DEV && typeof window !== 'undefined') {
        interface SVMWindow extends Window {
            __svmParserCount?: number
            __svmParserByType?: Record<string, number>
        }
        const w = window as SVMWindow
        const initialType: string = type ?? '<root>'
        w.__svmParserCount = (w.__svmParserCount ?? 0) + 1
        const byType = (w.__svmParserByType = w.__svmParserByType ?? {})
        byType[initialType] = (byType[initialType] ?? 0) + 1
    }
    ```

    Under Vitest, `import.meta.env.DEV` is `true` and the JSDOM environment
    provides `window`, so this counter is live in unit tests. It is
    **cumulative across all tests in a file** — always assert deltas from a
    snapshot, never absolute values.

- `src/lib/Parser.svelte:276` — the root keyed each block:

    ```svelte
    {#each tokens as token, index (renderMetadata.getStableNodeKey(token, index))}
    ```

    Keys come from source offsets (`src/lib/utils/render-metadata.ts`), so a
    token whose text grows in place keeps its key, and unchanged prefix tokens
    keep both key and (in streaming mode) object identity.

- `src/lib/SvelteMarkdown.svelte:184-186` — streaming token assignment with
  prefix reuse:

    ```ts
    streamTokens = canReuse
        ? reuseStableStreamingTokens(streamTokens, newTokens, divergeAt)
        : newTokens
    ```

- Counter semantics you will rely on (verified against current code):
    - The root `<Parser>` inside `SvelteMarkdown.svelte` counts as 1 instance
      of type `<root>`.
    - Each non-inlined token (paragraph, heading, strong, em, link, …) spawns
      exactly one Parser instance when first mounted.
    - Plain leaf `text` tokens, `space` tokens, and default-renderer HTML tags
      are **inlined** in `Parser.svelte`'s `dispatch` snippet and spawn **no**
      Parser instance (issue #286 optimization).
    - A keyed each item whose key is stable is **updated, not remounted** —
      the counter must not increase for it.

- Test conventions: unit tests live in `src/lib/**/*.test.ts`, run under
  Vitest with JSDOM and `@testing-library/svelte`. The streaming test
  exemplar to model after is `src/lib/SvelteMarkdown.stream-id.test.ts`,
  whose setup (lines 27–49) is the proven pattern for driving the rAF-batched
  streaming flush deterministically:

    ```ts
    beforeEach(() => {
        tokenCache.clearAllTokens()
        vi.useFakeTimers()
        vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
            return setTimeout(() => cb(performance.now()), 16) as unknown as number
        })
        vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id))
    })

    afterEach(() => {
        vi.unstubAllGlobals()
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    const flushStreamingBatch = async () => {
        await act(async () => {
            await vi.advanceTimersByTimeAsync(50)
        })
    }
    ```

    Imperative writes go through the exported component method:
    `await act(() => component.writeChunk('...'))` where `component` comes from
    `render(SvelteMarkdown, { props: { source: '', streaming: true } })`.

- Lint suppressions, if ever needed, use Trunk syntax
  (`// trunk-ignore(eslint/rule-name)`) — **never** `eslint-disable`
  comments. This repo forbids them (CLAUDE.md).

## Commands you will need

| Purpose        | Command                                                           | Expected on success      |
| -------------- | ----------------------------------------------------------------- | ------------------------ |
| Typecheck      | `pnpm check`                                                      | exit 0, 0 errors         |
| New tests only | `pnpm test:only src/lib/SvelteMarkdown.redraw-regression.test.ts` | all pass                 |
| Full unit      | `pnpm test:only`                                                  | all pass                 |
| Coverage gate  | `pnpm test`                                                       | all pass, thresholds met |
| Lint/format    | `trunk fmt && trunk check`                                        | exit 0                   |

(Trunk is the lint authority here — do not invoke prettier/eslint directly.)

## Scope

**In scope** (the only files you should create or modify):

- `src/lib/SvelteMarkdown.redraw-regression.test.ts` (create)

**Out of scope** (do NOT touch, even though they look related):

- `src/lib/Parser.svelte`, `src/lib/SvelteMarkdown.svelte`,
  `src/lib/utils/render-metadata.ts`, `src/lib/utils/streaming-token-reuse.ts`
  — this plan **measures** current behavior; it must not change it. If a
  test can only pass by editing source, that is a STOP condition.
- `src/routes/test/perf-bench/**` — the manual bench page stays as-is.
- `tests/**` (Playwright) — the unit-level counter is cheaper and more
  precise; no E2E addition in this plan.

## Git workflow

- Branch: `advisor/001-redraw-regression-harness`, created with
  `git checkout -b advisor/001-redraw-regression-harness --no-track` from the
  batch branch (never track `origin/main`).
- Commit style: conventional commits, e.g.
  `test(redraw): pin Parser-count and DOM-identity across streaming flushes`.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

(No red-first reproduction test: this plan adds net-new regression tests for
behavior that is currently believed correct. The "red" equivalent is Step 1's
calibration, which distinguishes harness bugs from real redraw bugs.)

### Step 1: Scaffold the file and calibrate the counter

Create `src/lib/SvelteMarkdown.redraw-regression.test.ts` with the
`beforeEach`/`afterEach`/`flushStreamingBatch` setup copied from
`src/lib/SvelteMarkdown.stream-id.test.ts:27-49` (shown above), plus a
counter reader:

```ts
interface SVMWindow extends Window {
    __svmParserCount?: number
    __svmParserByType?: Record<string, number>
}
const readParserCount = () => (window as SVMWindow).__svmParserCount ?? 0
const readParserByType = () => (window as SVMWindow).__svmParserByType ?? {}
```

Write one calibration test: render
`{ source: '', streaming: true }`, `writeChunk('# Title\n\nFirst paragraph.\n\nSecond para')`,
flush, and assert the DOM contains one `h1` and two `p` elements. Then
assert `readParserCount()` is greater than 0 (proves the DEV counter is
live under Vitest). Log `readParserByType()` with `console.info` once so
you can see the shape while calibrating; remove the log before finishing.

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.redraw-regression.test.ts`
→ 1 test passes. If `readParserCount()` is 0/undefined after render, STOP
(see STOP conditions).

### Step 2: Tripwire — growing the tail block spawns zero new Parsers

In the same rendered stream as Step 1's scenario (fresh `render` inside the
test), after the initial flush:

```ts
const before = readParserCount()
await act(() => component.writeChunk(' grows in place with more text'))
await flushStreamingBatch()
expect(screen.getByText(/grows in place/)).toBeInTheDocument() // content landed
expect(readParserCount() - before).toBe(0)
```

The appended text extends the open second paragraph; its token is replaced
but its source-offset key is stable, so the keyed each block must update in
place — zero new Parser instantiations.

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.redraw-regression.test.ts`
→ passes with delta exactly 0.

### Step 3: Tripwire — a new block costs O(1) Parsers, not O(document)

Continue the stream: snapshot the counter, then
`writeChunk('\n\nThird paragraph.\n\n')`, flush, assert three `p` elements
exist, and assert the delta:

```ts
expect(delta).toBeGreaterThanOrEqual(1) // the new paragraph itself
expect(delta).toBeLessThanOrEqual(3) // small constant, never O(blocks)
```

(Expected today: exactly 1 — the paragraph token; its leaf text child is
inlined. The ≤3 ceiling leaves headroom for benign structural changes while
still catching whole-document redraws, which would be ≥ the block count.)

**Verify**: test passes; note the actual delta in the test as a comment
(e.g. `// current: 1`).

### Step 4: Tripwire — DOM node identity survives streaming flushes

New test: stream `'# Title\n\nFirst paragraph.\n\nSecond para'`, flush,
capture element references:

```ts
const h1 = container.querySelector('h1')
const firstP = container.querySelectorAll('p')[0]
```

Then append twice (one in-place growth, one new block), flushing each, and
assert the captured nodes are the same objects:

```ts
expect(container.querySelector('h1')).toBe(h1)
expect(container.querySelectorAll('p')[0]).toBe(firstP)
```

**Verify**: test passes — prefix DOM nodes are never recreated during
append-only streaming.

### Step 5: Tripwire — non-streaming source replacement preserves prefix DOM

New test, **no** `streaming` prop: render
`{ source: '# Title\n\nPara one.\n\nPara two.' }`, capture `h1` and first
`p` references and a counter snapshot, then
`rerender({ source: '# Title\n\nPara one.\n\nPara two.\n\nPara three.' })`
inside `act`. Assert:

- `container.querySelector('h1')` is the same node (`toBe(h1)`), same for
  the first `p`;
- three `p` elements exist;
- Parser-count delta is ≥1 and ≤3.

This pins the non-streaming guarantee: a full re-parse produces all-new
token objects, but source-offset keys keep the unchanged prefix's keyed
blocks (and therefore DOM nodes and component instances) alive.

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.redraw-regression.test.ts`
→ all tests pass.

### Step 6: Full gate

Remove any calibration `console.info` left from Step 1. Run the full gate.

**Verify**:

- `pnpm check` → exit 0
- `pnpm test` → all pass, coverage thresholds met (this plan only adds
  tests, so coverage can only rise)
- `trunk fmt && trunk check` → exit 0
- `git status` → only `src/lib/SvelteMarkdown.redraw-regression.test.ts`
  added; nothing else modified

## Test plan

- No red-first test: net-new regression coverage for currently-correct
  behavior. The calibration step (Step 1) plays the equivalent role — it
  validates the harness itself before any tripwire is trusted.
- New file `src/lib/SvelteMarkdown.redraw-regression.test.ts`, modeled
  structurally on `src/lib/SvelteMarkdown.stream-id.test.ts`, covering:
    1. counter liveness under Vitest (calibration);
    2. in-place tail growth → Parser delta 0;
    3. new appended block → Parser delta in [1, 3];
    4. DOM node identity across streaming flushes (h1 + first p);
    5. DOM node identity + bounded delta across a non-streaming source
       replacement.
- Verification: `pnpm test:only src/lib/SvelteMarkdown.redraw-regression.test.ts`
  → 5+ tests pass; `pnpm test` → suite green with thresholds met.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm check` exits 0
- [ ] `pnpm test` exits 0 with coverage thresholds met;
      `src/lib/SvelteMarkdown.redraw-regression.test.ts` exists and passes
- [ ] The delta assertions are exact/bounded as specified (0 for in-place
      growth; [1, 3] for a new block) — not loosened
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `.agents/.plans/redraw-hardening/README.md` status row for 001 updated

## STOP conditions

Stop and report back (do not improvise) if:

- `window.__svmParserCount` is `undefined`/0 after a successful render in
  Step 1 — the `import.meta.env.DEV` guard is not active under this Vitest
  config; the harness approach needs an advisor decision, not a workaround.
- Step 2's delta is **greater than 0**, or Step 4/5's node-identity
  assertions fail. This is not a test bug to absorb — it is a live redraw
  regression the audit said should not exist. Report the delta and the
  `__svmParserByType` breakdown; do not loosen the assertion to make it pass.
- Any test can only be made to pass by editing files in the out-of-scope
  list.
- The `render(...)` return value has no `writeChunk` method — the component's
  exported API drifted; re-check the drift diff.

## Maintenance notes

- These tests are the tripwire for plan 011 in this batch (the token-reuse
  identity refactor): 011 must land with this file green and unmodified.
- If a future change legitimately alters Parser instantiation counts (e.g.
  a new inline fast path removes instances), update the expected deltas in
  the same PR with a comment explaining the new baseline — the point is that
  changes to these numbers are always deliberate and reviewed.
- If `Parser.svelte`'s dev counter is ever removed or renamed, this file is
  the only consumer outside the manual bench page
  (`src/routes/test/perf-bench/+page.svelte`) — update both together.
- Deliberately deferred: an E2E (Playwright) variant against a production
  build. The counter is compiled out in production, so an E2E version would
  need MutationObserver-based assertions instead — only worth it if a
  regression ever slips past the unit harness.
