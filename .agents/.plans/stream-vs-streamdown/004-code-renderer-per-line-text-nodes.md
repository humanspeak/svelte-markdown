# Plan 004: Render code block text as per-line text nodes so an open fence lays out incrementally

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
> `git diff --stat 7dea763..HEAD -- src/lib/renderers/Code.svelte src/lib/renderers/Code.test.ts`
> On any change, compare the "Current state" excerpt against the live code;
> on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: MED (measurement-gated: revert if the bench does not move)
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `7dea763`, 2026-09-27

## Why this matters

A streaming code fence stays a single open `code` token until the closing
fence arrives. `src/lib/renderers/Code.svelte` renders it as
`<pre><code>{text}</code></pre>`: one text node holding the whole block. Every
frame Svelte replaces that text node's data with the grown string, which marks
the entire node dirty, and Blink re-lays-out every line of the block.
Measured 2026-09-27 on a 24 KB open fence (evidence in
`.agents/.plans-closed/stream-bench-frame-work/evidence/README.md`): our frame
work averages 3.5–3.9 ms and grows 2.1–2.4× from the first fifth of the stream
to the last, while the parser flush is only ~0.42 ms per frame. Streamdown
averages 1.8–1.9 ms with 1.4–1.5× growth; it renders one element per line,
so only the last line is dirtied each frame.

Emitting one text node per line (no extra elements) gives Blink the same
incremental-layout opportunity without changing the element structure, the
`textContent`, or the `innerHTML` serialization (adjacent text nodes
serialize as concatenated text).

Expected delta on `long-code-fence`: `avgWorkMs` 3.5–3.9 → ≤ 2.5;
`growthRatio` 2.1–2.4 → ≤ 1.6. This is a hypothesis about Blink's layout
behavior; the plan is gated on the bench and must be reverted if it does not
hold.

## Current state

`src/lib/renderers/Code.svelte` (entire file today):

```svelte
<!--
@component
Renders a fenced code block as a `<pre><code>` element. The language identifier
is applied as a CSS class on the `<pre>` for use with syntax highlighting libraries.

@prop {string} lang - Language identifier from the code fence (e.g. `"js"`, `"typescript"`).
@prop {string} text - Raw text content of the code block.
-->
<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    const { lang, text }: Props = $props()
</script>

<pre class={lang}><code>{text}</code></pre>
```

Related renderers that must NOT change: `src/lib/renderers/Codespan.svelte`
(inline), and the highlighted renderers under `src/lib/extensions/` (they use
`{@html}` and are separate components). Existing tests touching code blocks:
`grep -rln "<pre" src/lib/**/*.test.ts` — they assert `textContent`,
`innerHTML`, or class names, none of which change with split text nodes.

Conventions: renderer components are tiny, `Props` interface + `$props()`,
`@component` doc comment with `@prop` lines. Tests: Vitest +
`@testing-library/svelte`.

## Commands you will need

Prefix with `export PATH=~/.local/share/pnpm/bin:$PATH &&`.

| Purpose       | Command                                                                                                                                                                                                     | Expected                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Typecheck     | `pnpm check`                                                                                                                                                                                                | 0 errors                      |
| Unit tests    | `pnpm vitest run src/lib/renderers/Code.test.ts src/lib/SvelteMarkdown.test.ts`                                                                                                                             | all pass                      |
| Full tests    | `pnpm test`                                                                                                                                                                                                 | all pass, coverage ≥ 90%      |
| Lint + format | `trunk fmt && trunk check --fix`                                                                                                                                                                            | `✔ No issues`                 |
| Build preview | `pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort`                                                                                                                                      | serves `/test/stream-compare` |
| Bench         | `STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=3 STREAM_COMPARE_WARMUPS=1 STREAM_COMPARE_SCENARIO=long-code-fence pnpm perf:stream-compare > /tmp/004-<label>.log` | exit 0                        |

## Scope

**In scope**:

- `src/lib/renderers/Code.svelte`
- `src/lib/renderers/Code.test.ts` (exists; extend it)
- `.agents/.plans/stream-vs-streamdown/README.md` (status row)

**Out of scope**:

- `src/lib/renderers/Codespan.svelte`, anything under `src/lib/extensions/`
  (highlighted code renderers), `Parser.svelte`, the parser.
- Adding per-line ELEMENTS (spans/divs). That changes the DOM contract and
  CSS targeting for consumers; text nodes only.
- `README.md` — no API change.

## Git workflow

- Branch: `perf/code-renderer-line-text-nodes` off `main`.
- Commit: `perf(render): emit code block text as per-line text nodes`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Characterization test for the new DOM shape (red)

Extend `src/lib/renderers/Code.test.ts` (read it first and match its render
helper and assertion style). Render `Code` with
`text: 'a\nb\nc'` and `lang: 'ts'`. Assert:

- `pre.className === 'ts'`, `code.textContent === 'a\nb\nc'`,
  `pre.innerHTML === '<code>a\nb\nc</code>'` (serialization unchanged);
- `code.childNodes.length === 3` and every child is a `Text` node — this is
  the assertion that is RED today (currently 1 child).

Also assert a single-line block still renders one text node and an empty
`text` renders an empty `<code>`.

**Verify**: `pnpm vitest run src/lib/renderers/Code.test.ts` → the
`childNodes.length` assertion FAILS with `expected 3, received 1`.

### Step 2: Split the text into per-line text nodes

Replace the template in `src/lib/renderers/Code.svelte` with:

```svelte
<script lang="ts">
    interface Props {
        lang: string
        text: string
    }
    const { lang, text }: Props = $props()

    // One text node per line (no wrapper elements). While a fence streams,
    // only the last line's node changes, so the layout engine can keep the
    // earlier line boxes instead of re-laying-out the whole block.
    const lines = $derived(text.split('\n'))
</script>

<pre class={lang}><code
        >{#each lines as line, index (index)}{index < lines.length - 1
                ? `${line}\n`
                : line}{/each}</code
    ></pre>
```

Whitespace inside `<pre>` is significant: keep the `<code>` open/close tags
tight against the each block exactly as above (Prettier's Svelte plugin
formats it this way; run `trunk fmt` and then re-check `pre.innerHTML` in the
test). Keying by `index` is intentional — line N stays the same node as the
block grows.

Add a `@prop`-style note to the component doc comment describing the per-line
text-node rendering.

**Verify**: `pnpm vitest run src/lib/renderers/Code.test.ts src/lib/SvelteMarkdown.test.ts` → all pass.

### Step 3: Full gate and bench (gate)

`pnpm check`, `trunk fmt && trunk check --fix`, `pnpm test`. Then bench
`long-code-fence` on `main` (before) and on the branch (after), 3 iterations.

**Verify**: after `avgWorkMsMedian ≤ 2.5` and `growthRatioMedian ≤ 1.6` for
ours. If after ≥ 0.9 × before on `avgWorkMsMedian`, the hypothesis failed:
revert Step 2 (keep the test file with the `childNodes` assertion inverted
back to 1 node) and report; see STOP conditions.

## Test plan

- Red anchor: `code.childNodes.length === 3` for a three-line block, fails
  today, passes after Step 2.
- Serialization parity: `innerHTML`/`textContent` unchanged (guards consumers
  that read the code block's text).
- Existing `SvelteMarkdown.test.ts` code block tests remain green.

## Done criteria

- [ ] `pnpm check` 0 errors; `pnpm test` exits 0 with `Code.test.ts` passing
- [ ] `grep -n "{#each lines" src/lib/renderers/Code.svelte` matches
- [ ] Bench `long-code-fence`: `avgWorkMsMedian ≤ 2.5`, recorded in README — OR the plan is marked REJECTED with the measured before/after
- [ ] No files outside scope modified

## STOP conditions

- The bench improvement is under 10% (see Step 3): revert and report. Include
  the before/after `avgWorkMsMedian`, `growthRatioMedian`, `libraryFlushMsMedian`.
- Any existing test asserting `innerHTML` of a code block fails — the
  whitespace inside `<pre>` shifted; fix the template, never the test.
- `trunk fmt` reformats the template in a way that inserts whitespace inside
  `<code>`; wrap the each block so the formatter cannot (or report).

## Maintenance notes

- The highlighted renderers (`src/lib/extensions/**`) re-highlight the whole
  block per frame; a follow-up could apply the same per-line idea to their
  fallback path or throttle highlighting of an OPEN fence. Out of scope here.
- If a consumer reports `code.firstChild.nodeValue` no longer being the whole
  text, point them at `textContent`; this is the documented reason for the
  change.
