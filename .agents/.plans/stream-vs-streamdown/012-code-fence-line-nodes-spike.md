# Plan 012: Spike — per-line text nodes for streaming code fences (accept only a measured, parity-clean win)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `.agents/.plans/stream-vs-streamdown/README.md` — unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat 7dea763..HEAD -- src/lib/renderers/Code.svelte src/lib/renderers/Code.test.ts`
> On any change, compare the "Current state" excerpt against live code; on
> a mismatch, treat it as a STOP condition.

> **Revision 2026-09-28 (guard pre-flight):** Plans 006–011 and 013 have
> landed (tip: see `Planned at`). `Code.svelte` is unchanged since the excerpt.
> Use the same-build A/B recipe from `evidence/007/README.md`
> (`STREAM_COMPARE_URL_A/_B`, A = git worktree at the pre-change tip on 4173,
> B on 4183) and the clamped metric. Current standing on `long-code-fence`
> (Plan 006 clamped baseline): ours 2,840–2,935 ms vs Streamdown 1,563–1,568,
> 0 over-budget frames, style/layout 59% of frame work — re-measure A first,
> because 007 and 011 changed the render side since. Baseline re-stamped.

## Status

- **Priority**: P2
- **Effort**: S–M
- **Risk**: MED (hypothesis about layout behavior; SSR/hydration contract)
- **Depends on**: 006 (paired protocol + attribution)
- **Category**: perf (spike)
- **Planned at**: commit `7dea763`, 2026-09-28

## Why this matters

An open code fence is one `code` token until the closing fence. The default
renderer emits `<pre><code>{text}</code></pre>` — a single text node whose
data is replaced every frame. Measured 2026-09-27: 3.5–3.9 ms per frame with
2.1–2.4× growth from the first to the last fifth of a 24 KB fence, vs
Streamdown 1.8–1.9 ms and 1.4–1.5× (they render one element per line). Only
~0.42 ms of ours is the parser flush.

Hypothesis: emitting one text node per line lets the layout engine keep
earlier line boxes and re-lay-out only the changed line. The adversarial
review established that (1) a Svelte `{#each}` inside `<code>` adds an anchor
text node in the client and comment markers in SSR output, so a "exactly N
text nodes / identical innerHTML" assertion is impossible; and (2) each line's
effect reads `lines.length` in the naive template, so replacing the array
invalidates every line's computation. Neither disproves the layout benefit;
both mean this must be a measured spike with an explicit DOM contract, not a
promised win.

## Current state

`src/lib/renderers/Code.svelte` (whole file):

```svelte
<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    const { lang, text }: Props = $props()
</script>

<pre class={lang}><code>{text}</code></pre>
```

`src/lib/renderers/Code.test.ts` exists (read it and match its helpers).
Highlighted renderers under `src/lib/extensions/**` are separate components
and out of scope. Existing tests reference code blocks via `textContent`,
`className`, and sometimes `innerHTML` — grep before changing:
`grep -rn "<pre\|<code" src/lib/**/*.test.ts | head`.

SSR: `svelte/server` `render()` can be used in a Vitest test to check server
output and then hydrate with `hydrate()` from `svelte` in JSDOM to check no
hydration mismatch warnings (`vi.spyOn(console, 'warn')`).

Conventions: see Plan 006.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                     | Expected                 |
| ------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------ |
| Typecheck     | `pnpm check`                                                                                                | 0 errors                 |
| Focused tests | `pnpm vitest run src/lib/renderers/Code.test.ts src/lib/SvelteMarkdown.test.ts`                             | pass                     |
| Full tests    | `pnpm test`                                                                                                 | all pass, coverage ≥ 90% |
| Lint + format | `trunk fmt && trunk check --fix`                                                                            | `✔ No issues`            |
| Attribution   | `STREAM_COMPARE_SCENARIO=long-code-fence node scripts/stream-compare-attribute.mjs`                         | bucket table             |
| Paired bench  | Plan 006/007 protocol, `STREAM_COMPARE_SCENARIO=long-code-fence`, A = main, B = branch, 5 iterations, twice | parity 0                 |

## Scope

**In scope**: `src/lib/renderers/Code.svelte`, `src/lib/renderers/Code.test.ts`,
`.agents/.plans/stream-vs-streamdown/evidence/012/`, batch `README.md`.

**Out of scope**: `Codespan.svelte`, `src/lib/extensions/**`, `Parser.svelte`,
the parser; adding per-line ELEMENTS (changes CSS/DOM contract for consumers).

## Git workflow

- Work on `perf/stream-bench-flush-timing` (batch branch); the reviewer commits.
- Commit: `perf(render): per-line text nodes in Code renderer (spike)`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Attribution before

Run the attribution script for `long-code-fence` on `main`. Record the
style/layout bucket share. If style+layout is under 30% of frame work, the
hypothesis cannot yield much: record and STOP (mark REJECTED with numbers).

### Step 2: Characterization tests (red where behavior changes)

Extend `src/lib/renderers/Code.test.ts`:

- `textContent` of `<code>` equals the input for `'a\nb\nc'`, `''`, `'x'`,
  and text with trailing newline (`'a\n'`) — green today, must stay green.
- `pre.className === lang`; `pre.children.length === 1` and `code.children.length === 0`
  (no element children) — green today, must stay green.
- Completed-line identity: render `'a\nb\nc'`, capture the `Text` node whose
  data starts with `'a'`; update `text` to `'a\nb\ncd'`; assert the captured
  node is still connected and its data unchanged — RED today (the single
  text node is replaced/updated as a whole, so either identity or data
  changes). This is the plan's red anchor.
- Copy fidelity: `window.getSelection()`-free check via `code.textContent`
  equality (already covered); document that selection/copy behavior of
  adjacent text nodes is identical.
- SSR: `render(Code, { props: { lang: 'ts', text: 'a\nb' } })` from
  `svelte/server` — assert `body` contains `<pre class="ts"><code>` and the
  text; capture the exact output as a snapshot to make the marker-node
  contract explicit (comments are acceptable inside `<code>`; document it).
- Hydration: hydrate the SSR output in JSDOM and assert no console warnings.

**Verify**: only the completed-line identity test FAILS.

### Step 3: Implement per-line text nodes with bounded invalidation

Replace the template so that each line's rendering depends only on its own
line string, not on `lines.length`:

```svelte
<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    const { lang, text }: Props = $props()
    // Split once per update; each entry already carries its own terminator
    // so a line's rendering does not depend on the array length.
    const lines = $derived.by(() => {
        const parts = text.split('\n')
        return parts.map((line, index) => (index < parts.length - 1 ? `${line}\n` : line))
    })
</script>

<pre class={lang}><code
        >{#each lines as line, index (index)}{line}{/each}</code
    ></pre>
```

Keying by `index` keeps line N's text node for the block's lifetime; only
the last entry's string changes per append (and one new entry is added at a
newline). Run `trunk fmt` and re-check that no whitespace was introduced
inside `<code>` (the SSR snapshot test will catch it).

**Verify**: Step 2 identity test PASSES; SSR snapshot updated deliberately
(comment markers present, no stray whitespace); hydration warning-free; all
focused tests pass.

### Step 4: Measure and decide

Paired bench `long-code-fence` (A = main, B = branch) twice; attribution on
B. Accept only if B's `totalWorkMsMedian` is lower in both repeats by ≥ 15%,
`growthRatioMedian` drops, parity is 0, and no other scenario regresses
(> 3%) — run `prose-mixed` too since it contains fences. Otherwise revert
Step 3, keep the characterization tests that still hold, and mark REJECTED
with the numbers.

Full gate either way: `pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`.

## Test plan

- Red anchor: completed-line text-node identity across an append.
- Contract tests: textContent, element shape, SSR snapshot (explicit marker
  contract), hydration without warnings.
- Existing code-block tests in `SvelteMarkdown.test.ts` unchanged.

## Done criteria

- [ ] Decision recorded in README status row (kept with paired deltas, or REJECTED with numbers)
- [ ] If kept: `grep -n "{#each lines" src/lib/renderers/Code.svelte` matches; identity/SSR/hydration tests pass
- [ ] `pnpm check` 0 errors; `pnpm test` exits 0
- [ ] `evidence/012/README.md` archived with parity 0
- [ ] No files outside scope modified

## STOP conditions

- Step 1 shows style/layout under 30% of frame work.
- Hydration produces warnings or the SSR output changes in a way other than
  the documented marker comments.
- Any existing `innerHTML` assertion on code blocks fails for a reason other
  than the documented markers — fix the template, never the assertion.
- A/A control noise exceeds ±10%.

## Maintenance notes

- If kept, consumers reading `code.firstChild.nodeValue` get the first line
  only; `textContent` is the supported read. Note it in the component doc.
- The highlighted renderers re-highlight the whole block per frame; a
  follow-up spike could throttle highlighting of an OPEN fence.
