# Plan 010: Enforce coverage thresholds, declare supported Node, and cover the rAF-absent streaming fallback

> **Executor instructions**: Follow step by step; verify each step; obey STOP
> conditions. Update this plan's row in
> `.agents/.plans/streaming-component-hardening/README.md` when done.
>
> **Drift check (run first)**: `git diff --stat 7a64121..HEAD -- vite.config.ts package.json src/lib/SvelteMarkdown.svelte`
> On any change, compare "Current state" facts to live code; mismatch ⇒ STOP.
>
> Revision 2026-07-09: (1) corrected the stale `scheduleAppendFlush` /
> `flushPendingAppendChunks` excerpt — plans 007–009 renamed these to
> `scheduleStreamFlush` / `flushPendingStreamChanges` after this plan was first
> written, so the original excerpt tripped the drift STOP for a purely cosmetic
> reason; (2) Step 1 now requires ≥1 point of slack under measured coverage
> rather than a bare integer round-down, because `functions: 96` against a
> measured 96.19% left only one uncovered function of headroom. Re-stamped
> `Planned at` to `fbc1ea5`.
>
> Revision 2026-07-09 (second): brought
> `src/lib/SvelteMarkdown.issue-328.test.ts` into scope for a per-test timeout
> raise (`15_000` → `30_000`). Execution surfaced a constraint this plan could not
> have known: under v8 coverage instrumentation the test "matches static heading
> ids for a large streamed document" runs **13.5s against its 15s budget** (~3.1s
> standalone), so `pnpm test` — a Done criterion — fails intermittently on the
> timeout before ever reaching the coverage gate. The timeout is a harness limit,
> not an assertion; raising it loosens nothing the test verifies (the #328
> proportionality guarantee is asserted by a separate 26ms test). Re-stamped
> `Planned at` to `7a64121`.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `7a64121`, 2026-07-07 (amended twice 2026-07-09)

## Why this matters

Three small, independent hygiene fixes bundled because each is trivial:

1. **Coverage isn't gated.** CLAUDE.md states a 90%+ target, but
   `vite.config.ts` sets no `thresholds` and only an `lcov` reporter — coverage
   can rot silently and there's no local console summary.
2. **No `engines` field.** CI runs Node 22/24 and Volta pins 24, but the package
   gives consumers no supported-Node signal.
3. **The rAF-absent streaming fallback is untested.** When
   `window.requestAnimationFrame` is not a function, `scheduleStreamFlush` falls
   back to `setTimeout(…, STREAM_BATCH_FALLBACK_MS)` and
   `cancelScheduledStreamFlush` takes its `kind:'timeout'` branch. Every existing
   streaming test stubs rAF as a function, so this SSR-ish path (and its cancel
   branch) has no behavioral coverage.

## Current state

`vite.config.ts:17-27` coverage block (no thresholds, lcov only):

```ts
coverage: {
    reporter: 'lcov',
    exclude: ['docs/**', '.trunk/**', '.svelte-kit/**', 'tests/**', 'src/routes/**', 'src/lib/test/**']
},
```

`package.json` — no `engines` key; `volta.node` is `24.15.0`.

`src/lib/SvelteMarkdown.svelte:219-241` fallback path:

```ts
const scheduleStreamFlush = () => {
    if (
        streamFlushHandle ||
        (pendingStreamAppendBuffer === '' && pendingStreamFullSource === null)
    ) {
        return
    }

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        const id = window.requestAnimationFrame(() => {
            streamFlushHandle = null
            flushPendingStreamChanges()
        })
        streamFlushHandle = { kind: 'raf', id }
        return
    }

    const id = setTimeout(() => {
        streamFlushHandle = null
        flushPendingStreamChanges()
    }, STREAM_BATCH_FALLBACK_MS)
    streamFlushHandle = { kind: 'timeout', id } // <-- untested branch
}
```

The matching cancel branch is `cancelScheduledStreamFlush` at
`src/lib/SvelteMarkdown.svelte:147-157`; unmount reaches it through the `$effect`
teardown at `src/lib/SvelteMarkdown.svelte:411-415`, which cancels the handle but
does **not** clear `pendingStreamAppendBuffer` — that is what makes a
"no late flush" assertion meaningful rather than vacuous.

`STREAM_BATCH_FALLBACK_MS` is `16` (`src/lib/utils/streaming-chunks.ts:3`).
Existing streaming tests stub `requestAnimationFrame` (see `SvelteMarkdown.test.ts`
near line 133 and `vitest.setup.ts`), and that `describe` already restores it via
`afterEach(() => vi.unstubAllGlobals())` at `SvelteMarkdown.test.ts:143-145`.

## Commands you will need

| Purpose      | Command                                         | Expected on success                               |
| ------------ | ----------------------------------------------- | ------------------------------------------------- |
| Coverage run | `pnpm test`                                     | passes + prints summary; fails if below threshold |
| Unit only    | `pnpm test:only`                                | all pass                                          |
| One file     | `pnpm test:only src/lib/SvelteMarkdown.test.ts` | all pass                                          |
| Typecheck    | `pnpm check`                                    | exit 0                                            |
| Lint         | `trunk fmt && trunk check`                      | exit 0                                            |

## Scope

**In scope**:

- `vite.config.ts` — add `thresholds` + a `text-summary` reporter.
- `package.json` — add `engines`.
- `src/lib/SvelteMarkdown.test.ts` (or a new streaming test file) — the
  rAF-fallback test.
- `src/lib/SvelteMarkdown.issue-328.test.ts` — **per-test timeout only**. Raise
  the `15_000` timeout on "matches static heading ids for a large streamed
  document" to `30_000`; enabling coverage pushes it to ~13.5s of its 15s budget,
  so it flakes before the coverage gate is reached. Nothing else in this file may
  change: no assertions, no fixtures, no other timeouts.

**Out of scope**:

- Changing the fallback logic itself — only test it.
- Raising any other test's timeout. If a second test proves marginal under
  coverage, STOP and report — do not generalize this exemption.
- Raising thresholds above current actual coverage (that would fail CI without
  adding tests; pick a threshold ≥1 point below measured coverage — see Step 1).

## Git workflow

- Branch: `advisor/010-coverage-thresholds-engines-raf-fallback` (`--no-track origin/main`).
- Commit style: `chore(test): gate coverage; declare engines; cover rAF fallback`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Measure current coverage, then set thresholds at a safe floor

Run `pnpm test` and read the coverage. Add a `thresholds` object to the coverage
config set **below** the current measured numbers, with **at least 1 full
percentage point of slack on every metric**. A bare integer round-down is not
enough: measured `functions` of 96.19% floored to `96` leaves room for exactly one
new uncovered function before CI breaks, which makes the gate a tripwire for
unrelated work rather than a rot detector. Also add `'text-summary'` to the
reporters so a console summary prints locally. Target shape:

```ts
coverage: {
    reporter: ['lcov', 'text-summary'],
    thresholds: { lines: <floor>, functions: <floor>, branches: <floor>, statements: <floor> },
    exclude: [ /* unchanged */ ]
}
```

Measured at `fbc1ea5` — statements 95.98%, branches 90.00%, functions 96.19%,
lines 97.69%. That yields these floors (each ≥1 point of slack):

```ts
thresholds: { statements: 95, branches: 89, functions: 95, lines: 96 }
```

Do not invent 90 if actual coverage is lower — set the floor to reality so CI
goes green now, and note the gap in your report. CLAUDE.md's 90% is the aspiration;
gating below-current is worse than gating at-current. Note that branches currently
sit at exactly 90.00%, so the aspiration is met on every metric today.

**Verify**: `pnpm test` → passes and prints a coverage summary. Confirm the gate
is live rather than inert config by forcing a failure without editing any file:
`pnpm exec vitest run --coverage --coverage.thresholds.lines=100` → must print
`ERROR: Coverage for lines (…) does not meet global threshold (100%)`.

### Step 2: Add the `engines` field

Add to `package.json` (match CI's Node range — CI runs 22 and 24):

```json
"engines": { "node": ">=22" }
```

**Verify**: `node -e "console.log(require('./package.json').engines.node)"` →
prints `>=22`.

### Step 3: Test the rAF-absent fallback path

Add a test in `SvelteMarkdown.test.ts` that, for one streaming scenario,
**removes** `requestAnimationFrame` (e.g. `vi.stubGlobal('requestAnimationFrame',
undefined)` or delete it from `window` for the test, restoring afterward) so
`scheduleAppendFlush` takes the `setTimeout` branch. Then:

- Write append chunks below `STREAM_BATCH_MAX_CHARS` so a flush is scheduled (not
  forced).
- Advance fake timers by `STREAM_BATCH_FALLBACK_MS` (16ms).
- Assert the streamed content rendered (the timeout flush fired).
- Add a companion assertion for the cancel branch: schedule a flush, then unmount
  (or call resetStream) before the timer fires, and assert no late flush occurs
  (the `kind:'timeout'` cancel branch ran).

Ensure the test restores `requestAnimationFrame` in a `finally`/`afterEach` so it
doesn't leak into other tests.

**Verify**: `pnpm test:only src/lib/SvelteMarkdown.test.ts` → all pass, including
the new fallback test.

### Step 4: Full suite + lint

**Verify**: `pnpm check` → 0; `pnpm test:only` → all pass; `trunk fmt && trunk check` → 0;
`pnpm test` → passes with thresholds enforced.

## Test plan

- New tests: rAF-absent timeout flush fires; timeout cancel branch prevents a
  late flush. Model on existing streaming/batch tests (they already use fake
  timers).
- Verification: `pnpm test:only` → all pass; `pnpm test` → coverage gate passes.

## Done criteria

ALL must hold:

- [ ] `vite.config.ts` coverage has `thresholds` (4 keys) and a `text-summary`
      reporter, with every floor ≥1 percentage point below its measured value.
- [ ] `pnpm test` prints a coverage summary and enforces thresholds (passes at
      the chosen floor); forcing `--coverage.thresholds.lines=100` fails, proving
      the gate is live.
- [ ] `package.json` has `"engines": { "node": ">=22" }`.
- [ ] New rAF-fallback test(s) pass and restore `requestAnimationFrame`.
- [ ] `pnpm check` exits 0; `pnpm test:only` exits 0; `trunk fmt && trunk check` exits 0.
- [ ] No files outside the in-scope list are modified (`git status`).
- [ ] The batch `README.md` status row for 010 is updated.

## STOP conditions

- `vite.config.ts` / `package.json` / `scheduleStreamFlush` don't match the
  excerpts (drift). A pure identifier rename with the same branch structure is
  **not** a material mismatch — report it and continue; only a behavioural
  difference in the raf/timeout scheduling is a genuine STOP.
- Current coverage is far below 90% and setting an honest floor would look alarming
  — still set the honest floor, but report the number prominently so the team can
  decide whether to invest in raising it (do not fudge thresholds upward).
- Stubbing `requestAnimationFrame` to `undefined` breaks the shared test setup for
  other tests — scope the stub tightly to the one test and restore it; if that's
  not achievable, report.

## Maintenance notes

- If Node <22 must be supported later, adjust both `engines` and CI together.
- Reviewer should confirm the threshold floor sits ≥1 point below measured
  coverage — neither an aspirational number that happens to pass today by luck,
  nor a floor pinned so tightly to today's figure that one uncovered helper
  reds the build.
- The rAF-fallback test documents the SSR/non-browser scheduling contract; keep it
  if the fallback logic is ever refactored.
- The `30_000` timeout on issue-328's "matches static heading ids for a large
  streamed document" exists because **v8 coverage instrumentation roughly
  quadruples that test's runtime** (~3.1s standalone → ~13.5s under `pnpm test`).
  Don't trim it back toward the measured time — the margin is the point. If the
  test ever needs a third raise, treat that as a signal the streamed-heading path
  has regressed, not as a timeout problem.
