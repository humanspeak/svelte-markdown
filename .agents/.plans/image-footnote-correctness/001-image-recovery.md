# Plan 001: Recover images when their source changes

> **Executor instructions:** Follow the steps and verification gates in order.
> Stop under the conditions below rather than expanding scope. Update this
> batch's README status when complete unless a reviewer owns that update.
>
> **Drift check first:** `git diff --stat db41ab0..HEAD -- src/lib/renderers/Image.svelte src/lib/renderers/Image.test.ts src/lib/SvelteMarkdown.image-recovery.test.ts README.md`
> Also inspect `git diff --` for those paths. Compare the excerpts below with
> current code; reconcile documentation-only drift, but stop on runtime drift.

> Revision 2026-09-09: Rebased the plan onto freshly fetched main (`db41ab0`)
> at the operator's request. In-scope runtime files match the original baseline;
> package version is now 1.9.0 and current Trunk configuration remains authoritative.

> Revision 2026-09-09: Guard observed one existing large-document heading timeout
> under default full-suite concurrency (1,033 other tests passed). The same test
> passed the focused suite. Use `pnpm test --reporter=dot --maxWorkers=2` for the
> full coverage gate on this machine; the retry passed all 1,034 tests with the
> same timeout and unchanged coverage configuration and thresholds. This changes
> test scheduling only, not acceptance assertions.

## Status

- **Priority:** P1
- **Effort:** S (hours, including regression tests)
- **Risk:** LOW — contained to the default markdown image renderer
- **Depends on:** none
- **Category:** bug
- **Confidence:** HIGH for source-state leakage; race cases require regression validation
- **Planned at:** commit `db41ab0`, 2026-09-09

## Why this matters

An image that fails to load remains in the error state after its `href` changes,
including when the replacement image loads successfully. A previously loaded
image also retains its loaded classes while a replacement is still pending.
This matters when a renderer is reused for edited or streamed content. Loading
and error state must belong to a particular source attempt, while unchanged
images should retain their DOM and completed state.

## Current state

This is `@humanspeak/svelte-markdown` 1.9.0: Svelte 5 runes, strict TypeScript,
Marked, pnpm 11, Node >=22 (CI uses 22/24). The package is distributed through
`svelte-package`; SvelteKit routes are development/testing surfaces.

`src/lib/renderers/Image.svelte:35` initializes component-lifetime state:

```ts
let img: HTMLImageElement
let loaded = $state(false)
let visible = $state(!lazy)
let error = $state(false)
```

At lines 74–82, a failure permanently wins over a later load:

```ts
const handleLoad = () => {
    // Don't override error state if error already occurred
    if (error) return
    loaded = true
}

const handleError = () => {
    error = true
    loaded = true
}
```

No effect resets those fields on `href` changes. An `onMount` callback installs
an IntersectionObserver once; its callback sets `visible = true` and disconnects.
The template sets `src={visible ? href : undefined}`, `data-src={href}`, native
`loading`, and `fade-in` / `visible` / `error` classes. Preserve these attributes
and visual defaults.

`src/lib/renderers/Image.test.ts` covers initial loading, failure, and fade
behavior, but never rerenders with a different source. Its existing test
`does not override error state if error already occurred` is intentional for
one source attempt: retain that behavior. The audit ran the current image and
footnote suites together: 4 files / 41 tests passed. The image source-change
regression is not written yet; Step 1 establishes its red result.

Conventions: four-space indentation, no semicolons, `$props()` destructuring,
`$state` for mutable component state. Match the existing test style:

```ts
const { container } = render(Image, {
    props: { href: '/test.png', text: 'test', lazy: false }
})
const img = container.querySelector('img') as HTMLImageElement
img.dispatchEvent(new Event('load'))
await waitFor(() => {
    expect(img.classList.contains('fade-in')).toBe(true)
})
```

`vitest.setup.ts` installs fake timers and an IntersectionObserver that invokes
its callback immediately. Override that observer locally for deferred-visibility
cases and restore globals afterwards. `src/lib/test/streaming/harness.ts` exports
`useStreamingTestHarness()` and `flushStreamingBatch()`; follow their use in
`src/lib/SvelteMarkdown.issue-328.test.ts` for renderer integration tests.
`src/lib/Parser.svelte:171` sanitizes image URLs before dispatch; that policy is
outside this change.

## Commands you will need

Run from the repository root. Existing dependencies are installed. If absent,
use the repository's pinned pnpm and `pnpm install --frozen-lockfile` in the
executor checkout only; do not upgrade dependencies or edit the lockfile.

| Purpose             | Command                                                                                                                   | Expected on success                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Image unit tests    | `pnpm test:only src/lib/renderers/Image.test.ts --reporter=dot`                                                           | All tests pass, except intentional red gate |
| Focused integration | `pnpm test:only src/lib/renderers/Image.test.ts src/lib/SvelteMarkdown.image-recovery.test.ts --reporter=dot`             | All pass                                    |
| Streaming guards    | `pnpm test:only src/lib/SvelteMarkdown.issue-328.test.ts src/lib/SvelteMarkdown.redraw-regression.test.ts --reporter=dot` | All pass                                    |
| Typecheck           | `pnpm check`                                                                                                              | Exit 0, zero errors                         |
| Format              | `trunk fmt`                                                                                                               | Only intended changed files formatted       |
| Lint                | `trunk check`                                                                                                             | Exit 0                                      |
| Full coverage       | `pnpm test --reporter=dot`                                                                                                | Exit 0; thresholds unchanged                |
| Build/package       | `pnpm build`                                                                                                              | Exit 0, including package validation        |

Trunk is authoritative (`.trunk/trunk.yaml`), including ESLint, Prettier,
markdownlint and git-diff-check. Never invoke raw ESLint/Prettier or add lint
scripts. Use `trunk-ignore` only if a justified suppression is unavoidable.
`vite.config.ts` enforces statements 95%, branches 89%, functions 95%, lines 96%;
do not lower thresholds. The reporter override avoids creating junit output.

## Scope

**Only modify:**

- `src/lib/renderers/Image.svelte`
- `src/lib/renderers/Image.test.ts`
- `src/lib/SvelteMarkdown.image-recovery.test.ts` (create)
- `README.md` (image loading section around line 800 only)
- This batch's status row and execution notes

**Out of scope:** placeholders, skeletons, reserved aspect ratios, retry timers,
fallback URLs, new public props, raw-HTML image rendering, sanitizer changes,
Parser keys/token reuse, Mermaid, footnotes, dependencies, generated docs,
`.competitive-intel/*`, and unrelated existing user changes.

## Git workflow

Use the assigned executor branch, or `fix/image-source-recovery`. Preserve all
pre-existing changes; the audit found modified `.competitive-intel/config.json`
and `state.json`. If asked to commit, use a conventional message such as
`fix(image): recover loading state when source changes`. Do not publish, push,
or open a PR without that instruction.

## Steps

### Step 1: Add failing source-change regressions

In `Image.test.ts`, add `recovers when a failed image source changes`:
render `/broken.png` with `lazy:false`; dispatch error and assert the error
class; rerender the same component with `/good.png`; assert its current image
has the new src and no error class; dispatch load on that image; assert fade-in
and no error. Rerender through Testing Library's `rerender`, with `act`/Svelte
flushes as needed. Do not unmount/remount the component in the test.

Add `clears loaded state while a replacement source is pending`: load A,
rerender B, and assert neither loaded class is present until B loads.

**Verify:** `pnpm test:only src/lib/renderers/Image.test.ts --reporter=dot`
→ both new cases fail because old source state persists, while existing cases
pass. Record the actual assertion failures. If they pass on the untouched
implementation, stop and investigate baseline drift or a faulty reproduction.

### Step 2: Tie state and events to the current source attempt

Change only `Image.svelte`. Treat `undefined` and the empty string as no active
load; do not emit `src=""`. A changed source begins pending with neither loaded
nor error styling. An unchanged source retains state across text/title/fade
updates. Error continues to win over a subsequent load for the same attempt.

Use a source-attempt identity, not merely a comparison of URL strings, if event
handlers can outlive their attempt (A → B → A must not accept A's old completion).
Avoid a post-render reset that can erase a fast cached image's successful load.
Prefer source-tagged state and derived active classes. A narrowly keyed inner
`img` per source is acceptable if it makes event isolation reliable; never key
or remount the parent renderer/Parser. Capture the attempt in handlers and
ignore obsolete attempt events. Keep the exact image node when `href` is
unchanged; if replacing it on a changed source, rebind observation to the new
node and clean up the old observer.

Preserve native lazy loading and the 50px prefetch margin. Once visibility has
been granted to the renderer, changing source must not require a second
intersection callback. Before first visibility, source changes must not initiate
a request. `lazy:false` must grant immediate visibility, including a change from
true to false; changing back to true must not hide an image already exposed.
Read `lazy` reactively rather than capturing only its initial value. Keep the
no-IntersectionObserver fallback and teardown working.

**Verify:** `pnpm test:only src/lib/renderers/Image.test.ts --reporter=dot`
→ Step 1 cases and all legacy cases pass. `pnpm check` → zero errors and no
new image-local reactivity warning.

### Step 3: Verify lazy lifecycle and real renderer reuse

Expand `Image.test.ts` with the cases in the test matrix below. Use a controllable
IntersectionObserver stub that records observed targets and disconnection;
exercise it after the component settles, not the global auto-intersect stub.
If the implementation replaces inner image nodes, test delayed events using
the retained obsolete node; if it uses attempt handlers, invoke the obsolete
handler through an appropriate fixture. Do not claim that an arbitrary event
on the current node simulates an old network request.

Create `SvelteMarkdown.image-recovery.test.ts`. Render complete image Markdown
with a stable alt label, dispatch an error, then replace the source URL through
`source` on the same SvelteMarkdown instance and verify recovery. Also stream
an image followed by growing trailing prose and prove the unchanged image DOM
node and loaded class survive append-only updates. Include a replacement with
a URL blocked by the default sanitizer and assert src is absent, not empty.
Use the shared streaming harness and dispatch load/error manually; no network
is needed. Do not require image node identity when the URL actually changes.

**Verify:** `pnpm test:only src/lib/renderers/Image.test.ts src/lib/SvelteMarkdown.image-recovery.test.ts src/lib/SvelteMarkdown.issue-328.test.ts src/lib/SvelteMarkdown.redraw-regression.test.ts --reporter=dot`
→ all pass, including unchanged-image identity assertions.

### Step 4: Document and run the complete gates

Update only README's image section to state that changing a URL resets load/error
state, existing images remain stable, and this does not automatically retry the
same failed URL. Keep the custom-renderer escape hatch.

Run `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test --reporter=dot`, then
`pnpm build`. Each must exit 0; coverage thresholds remain unchanged. Inspect
`git diff --check` and `git status --short`: no new modifications outside the
allowlist, except standard ignored build/coverage outputs. Update the batch
README with command results and status; do not mark DONE with failed gates.

## Test plan

- Anchor red cases: failed A → pending B → loaded B; loaded A → pending B.
- Same source error followed by load still remains error (existing contract).
- Same source rerender preserves loaded/error state and DOM node.
- A → B → A does not accept an obsolete source attempt completion.
- Source removal and reinsertion reset state, omit absent/empty src.
- `fadeIn:false` recovers into `visible`, never `fade-in`.
- Deferred source changes load only the latest URL once visible.
- Source change after visibility requires no new intersection event.
- `lazy:true` → false starts loading without intersection; false → true does
  not hide already exposed content.
- Observer binds the active node, disconnects on visibility/unmount, and the
  no-observer fallback works. Restore per-test stubs/timers.
- SvelteMarkdown integration preserves unchanged images while prose grows and
  keeps blocked URLs out of src.

## Done criteria

- [ ] Both Step 1 failures were observed against baseline and now pass.
- [ ] Focused image/integration and streaming guard commands exit 0.
- [ ] `trunk check`, `pnpm check`, `pnpm test --reporter=dot --maxWorkers=2`, `pnpm build`, and
      `git diff --check` exit 0; coverage configuration is untouched.
- [ ] No new dependencies, public props, placeholders, or unrelated edits.
- [ ] Batch README records verification results and status.

## STOP conditions

- Runtime baseline differs materially from the quoted implementation.
- Source recovery requires changes to Parser keys or sanitizer policy.
- A gate fails twice after a reasonable fix attempt; report exact failure.
- Correctness appears to require changing the same-source error precedence
  contract, automatic retries, or a new public API.
- Tests require external network access or modifications to global test setup.

## Maintenance notes

Keep source identity, observer target, and asynchronous events aligned when
adding future image features. Review same-source DOM retention separately
from source replacement. Placeholder/layout work is deferred; it is a visual
API decision and not required for source recovery.
