# Plan 002: Remove reactive-proxy overhead from the streaming token array and account for the flush

> **SUPERSEDED (2026-09-28)** by the revised batch (plans 006–012) after
> [ADVERSARIAL-REVIEW.md](ADVERSARIAL-REVIEW.md). Do not execute. Kept for
> the reasoning and excerpts only.

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dea763..HEAD -- src/lib/SvelteMarkdown.svelte src/lib/utils/stream-flush-profile.ts src/routes/test/stream-compare/+page.svelte`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (run after 001 so bench deltas are attributable)
- **Category**: perf
- **Planned at**: commit `7dea763`, 2026-09-27

## Why this matters

The opt-in User Timing measure `svelte-markdown:stream-flush` (wraps parse +
token diff + state write, see `src/lib/utils/stream-flush-profile.ts`) reports
1.25–1.43 s over 765 frames on the 24 KB mixed-prose stream, i.e. ~1.8 ms per
frame, and ~6 ms per frame on the long-list stream. The same work run in plain
Node against the built `dist/` (parser `update` + `reuseStableTokenArray` +
`prepareTokensForRender`, identical corpus and chunking) costs 0.66 ms per
frame on prose and 1.95 ms on the long list. The browser flush is therefore
~3× the pure JS cost.

The leading explanation: `streamTokens` is declared `$state<Token[]>([])`, a
deep reactive proxy. Every read of a previous token during the flush —
`reuseStableTokenArray(streamTokens, …)` deep-compares hundreds of nodes via
`isSameStableNode` — goes through proxy traps, and every object reached is
lazily proxied. The component already documents that this array is only ever
reassigned wholesale (the #291 invariant), which is exactly the contract of
`$state.raw`. Switching to `$state.raw` removes the proxying with no behavior
change. This plan also adds a per-phase breakdown to the flush measure so the
next profiling pass has attribution instead of a single number.

Expected delta: `libraryFlushMsMedian` on `prose-mixed` 1,254–1,428 → ≤ 800;
on `long-list` 4,504–4,582 → ≤ 2,500; `totalWorkMsMedian` on `prose-mixed`
3,261–3,767 → ≤ 3,000. If the flush does not drop, the breakdown tells you
where the time is, which is itself the deliverable of Step 4.

## Current state

Files:

- `src/lib/SvelteMarkdown.svelte` — component; `streamTokens` declared at
  line ~138; `applyStreamingSource` lines ~168–195;
  `flushPendingStreamChanges` lines ~207–232.
- `src/lib/utils/stream-flush-profile.ts` — `profileStreamFlush(flush, detail)`
  emits one `performance.measure` when `globalThis.__svelteMarkdownProfile` is
  true.
- `src/routes/test/stream-compare/+page.svelte` — bench page; sums
  `performance.getEntriesByName(STREAM_FLUSH_MEASURE)` durations into
  `libraryFlushMs` (lines ~330–345).

`src/lib/SvelteMarkdown.svelte:135-141` (today):

```ts
// Invariant (#291): only ever reassign this array wholesale — never
// push/splice/index-write/shrink it in place. See the rationale comment
// in applyStreamingSource before touching any write site.
let streamTokens = $state<Token[]>([])
```

Every write site is a wholesale assignment (lines ~190, 274, 287, 316, 478):
`streamTokens = reuse…(…) | newTokens | [] | [...nextSource]`.

`src/lib/SvelteMarkdown.svelte:207-232` (today):

```ts
const runPendingStreamFlush = (forceNewParser: boolean) => {
    /* picks pending source, calls applyStreamingSource */
}

const flushPendingStreamChanges = (forceNewParser = false) => {
    cancelScheduledStreamFlush()
    profileStreamFlush(() => runPendingStreamFlush(forceNewParser), {
        sourceLength: streamSourceBuffer.length
    })
}
```

`src/lib/utils/stream-flush-profile.ts:55-70` (today):

```ts
export const profileStreamFlush = (flush: () => void, detail?: Record<string, unknown>): void => {
    if (!isStreamFlushProfilingEnabled()) {
        flush()
        return
    }
    const start = performance.now()
    try {
        flush()
    } finally {
        performance.measure(STREAM_FLUSH_MEASURE, { start, end: performance.now(), detail })
    }
}
```

Also declared deep: `let asyncTokens = $state<Token[] | TokensList | undefined>(undefined)`
(line ~503) — assigned wholesale only; include it in the switch.

Precedent for `$state.raw` in this repo: `src/lib/renderers/Image.svelte:41-42`.
Svelte 5.57 is installed; `$state.raw` is stable API.

Conventions: see Plan 001 (TypeScript strict, JSDoc on helpers, Vitest,
conventional commits, Trunk for lint/format, no `eslint-disable`).

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                             | Expected on success           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Typecheck     | `pnpm check`                                                                                                                                                        | 0 errors                      |
| Unit tests    | `pnpm vitest run src/lib/utils/stream-flush-profile.test.ts src/lib/SvelteMarkdown.issue-328.test.ts src/lib/utils/streaming-reuse-repro.test.ts`                   | all pass                      |
| Full tests    | `pnpm test`                                                                                                                                                         | all pass, coverage ≥ 90%      |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                    | `✔ No issues`                 |
| Build preview | `pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                                                                              | serves `/test/stream-compare` |
| Bench         | `STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=3 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > /tmp/002-<label>.log` | exit 0                        |

Read a summary with:
`node -e 'const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8").split("=== JSON ===")[1]);for(const [s,v] of Object.entries(j.results)){const x=v["svelte-markdown"].summary;console.log(s,"total",x.totalWorkMsMedian,"lib",x.libraryFlushMsMedian,"p95",x.p95WorkMsMedian)}' /tmp/002-after.log`

## Scope

**In scope**:

- `src/lib/SvelteMarkdown.svelte`
- `src/lib/utils/stream-flush-profile.ts`
- `src/lib/utils/stream-flush-profile.test.ts`
- `src/routes/test/stream-compare/+page.svelte` (only to surface the new
  breakdown fields in `libraryFlush*`; optional)
- `.agents/.plans/stream-vs-streamdown/README.md` (status row)

**Out of scope**:

- `src/lib/Parser.svelte` — Plan 003 owns it.
- `src/lib/utils/streaming-token-reuse.ts`, `render-metadata.ts`,
  `incremental-parser.ts` — no algorithmic changes here; if profiling points
  at them, report, do not fix.
- Any change to what `parsed(tokens)` receives (still the full array).

## Git workflow

- Branch: `perf/stream-tokens-raw-state` off `main` (or stacked on 001's branch
  if the operator says so).
- Commits: `perf(streaming): hold stream tokens in $state.raw` and
  `perf(bench): break the stream flush measure into phases`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Pin the wholesale-replacement invariant with a test

This is a perf change with no intended behavior difference, so there is no
red-first behavioral test; the guard is that nothing depends on deep
reactivity of `streamTokens`. Add a test to
`src/lib/SvelteMarkdown.issue-328.test.ts` (pattern: "keeps unchanged list item
DOM mounted…"): stream three paragraphs via `writeChunk`, capture
`container.querySelectorAll('p')`, append a fourth paragraph, flush, and assert
the first three `<p>` nodes are identical (`toBe`) and a fourth exists. Run it
now; it passes today and must still pass after Step 2.

**Verify**: `pnpm vitest run src/lib/SvelteMarkdown.issue-328.test.ts` → all pass.

### Step 2: Switch the token arrays to `$state.raw`

In `src/lib/SvelteMarkdown.svelte`:

- `let streamTokens = $state.raw<Token[]>([])`
- `let asyncTokens = $state.raw<Token[] | TokensList | undefined>(undefined)`
- Extend the #291 invariant comment: "`$state.raw` enforces this: in-place
  mutation is not reactive, so every write site MUST reassign."

Grep to confirm no in-place mutation exists:
`grep -n "streamTokens\.\(push\|splice\|pop\|shift\|unshift\|sort\|reverse\|length\)\|streamTokens\[" src/lib/SvelteMarkdown.svelte`
→ no matches (the only `streamTokens[` hits, if any, must be reads).

**Verify**: `pnpm check` → 0 errors; `pnpm test` → all pass.

### Step 3: Break the flush measure into phases

In `src/lib/utils/stream-flush-profile.ts` add an exported helper that lets
the caller stamp phase boundaries into the measure's `detail`:

```ts
export interface StreamFlushPhases {
    parseMs?: number
    reuseMs?: number
    assignMs?: number
}
```

Simplest shape: `profileStreamFlush` passes a `mark(phase: keyof StreamFlushPhases)`
callback into `flush`; each call records `performance.now()` deltas since the
previous mark into `detail`. Keep the zero-cost path when profiling is off
(the callback is a no-op). In `applyStreamingSource`, call `mark('parseMs')`
after `parser.update`, `mark('reuseMs')` after the reuse call, and
`mark('assignMs')` after the `streamTokens =` assignment. Update
`stream-flush-profile.test.ts`: when enabled, `detail` contains the three
phase numbers and they sum to ≤ the measure duration; when disabled, the
callback is a no-op and nothing is measured.

Optionally, in `src/routes/test/stream-compare/+page.svelte`, sum
`entry.detail.parseMs` etc. into `libraryParseMs`/`libraryReuseMs`/`libraryAssignMs`
on the result. Keep existing fields unchanged so the runner keeps working.

**Verify**: `pnpm vitest run src/lib/utils/stream-flush-profile.test.ts` → pass.

### Step 4: Bench before/after and attribute the remainder

Run the bench on `main` (before) and on your branch (after), 3 iterations.
Record `prose-mixed` and `long-list`: `totalWorkMsMedian`, `libraryFlushMsMedian`,
and the per-phase sums if you added them.

If `libraryFlushMsMedian` on prose is still above 1,000 ms after Step 2, take
one CPU profile of a run to find the fixed cost. Read-only snippet (run with
the preview up; writes to `/tmp`):

```js
// /tmp/profile.mjs — node /tmp/profile.mjs
import { chromium } from '@playwright/test'
const b = await chromium.launch({ headless: true })
const p = await b.newPage()
await p.goto('http://127.0.0.1:4173/test/stream-compare', { waitUntil: 'load' })
await p.waitForFunction(() => Boolean(globalThis.__streamBenchmark))
const cdp = await p.context().newCDPSession(p)
await cdp.send('Profiler.enable')
await cdp.send('Profiler.start')
await p.evaluate(() => globalThis.__streamBenchmark.run('svelte-markdown', 'prose-mixed'))
const { profile } = await cdp.send('Profiler.stop')
await import('node:fs').then((fs) =>
    fs.writeFileSync('/tmp/prose.cpuprofile', JSON.stringify(profile))
)
await b.close()
```

Open `/tmp/prose.cpuprofile` in Chrome DevTools (Performance → Load profile)
or summarize self-time by function with a short node script. Report the top
five self-time functions in the README status row; do not fix them here.

**Verify**: after-log summary shows `prose-mixed` `libraryFlushMsMedian ≤ 800`
and `long-list ≤ 2,500`, OR the profile's top-five list is recorded.

### Step 5: Full gate

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test` → all green.

## Test plan

- No red-first test: pure perf change with an explicit invariant. Step 1's
  DOM-identity test is the guard that `$state.raw` did not change rendering.
- `stream-flush-profile.test.ts`: phase marks recorded when enabled, no-op when
  disabled, throwing flush still records.
- Full suite green.

## Done criteria

- [ ] `grep -n "\$state.raw<Token\[\]>" src/lib/SvelteMarkdown.svelte` matches `streamTokens`
- [ ] `grep -n "\$state<Token" src/lib/SvelteMarkdown.svelte` returns nothing
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0
- [ ] Bench after numbers recorded in the README status row (prose-mixed and long-list: total and library flush medians), plus the top-five profile list if the target was missed
- [ ] No files outside the in-scope list modified

## STOP conditions

- Any existing test fails after Step 2 — this means something relied on deep
  reactivity of `streamTokens`/`asyncTokens`; report which test and revert.
- The flush measure INCREASES after Step 2.
- Profiling shows the dominant cost inside `Parser.svelte` or
  `render-metadata.ts`; report the function names (Plans 003/005 own those).

## Maintenance notes

- Any future code that mutates `streamTokens` in place will silently not
  render; the invariant comment and Step 1 test are the tripwires.
- Phase marks are only evaluated when profiling is enabled; keep it that way.
- The bench page's `libraryFlushMs` remains the cross-check for future perf
  commits; compare it against the Node floor (~0.66 ms/frame on prose) to know
  how much browser-only overhead remains.
