# Plan 003: Make the Mermaid extension engine-pluggable (MermaidEngine contract, with mermaid.js as the default engine)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `.agents/.plans/competitive-followups/README.md`, unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**:
> `git diff --stat bdebe69..HEAD -- src/lib/extensions/mermaid/ src/lib/extensions/index.ts src/lib/test/`
> If anything changed, compare the "Current state" excerpts with the live
> code. Treat a mismatch as a STOP condition.
>
> **Revision 2026-10-28**: Git workflow re-pointed to the shared digest branch `chore/competitive-intel-2026-10-28` (operator's standing rule: digest follow-ups ship as one PR). The reviewer owns git. No change to scope or steps.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED. `MermaidRenderer` is public API, and its current behavior must be preserved exactly.
- **Depends on**: none
- **Wave**: 1
- **Category**: direction (competitive gap) / tech-debt
- **Planned at**: commit `bdebe69`, 2026-10-28
- **Ticket**: HUM-72 (`gap-lightweight-mermaid-engine`), part 1 of 3

## Why this matters

svelte-streamdown 5.0.0 replaced mermaid.js (~1.5 MB, 23 deps, async, DOM-only)
with `pele`, a zero-dependency Mermaid-syntax renderer. Pele is ~15 KB gzip
plus a per-diagram-type chunk, renders synchronously in under 1 ms, and draws
diagrams while they stream. Mermaid inside AI chat output is the niche this
library competes in. Our `MermaidRenderer` hard-codes mermaid.js.

The maintainer's decision (2026-10-28) is to solve this the same way syntax
highlighting was solved in v1.9.5: a small **engine contract** that the
renderer talks to, with each engine shipped on its own subpath. This plan
builds only the contract and ports the existing mermaid.js behavior onto it
**with zero behavior change**. Plan 004 adds the pele engine and plan 005 adds
live rendering of still-open fences. Both build on this one.

## Current state

### The renderer today: `src/lib/extensions/mermaid/MermaidRenderer.svelte` (full file, 89 lines)

```svelte
<script lang="ts">
    import { onMount } from 'svelte'

    interface Props {
        text: string
        lightTheme?: string
        darkTheme?: string
    }

    const { text, lightTheme = 'default', darkTheme = 'dark' }: Props = $props()

    let svg = $state('')
    let error = $state('')
    let loading = $state(true)
    let mermaidModule: typeof import('mermaid').default | null = $state(null)
    let renderCounter = 0

    async function renderDiagram(diagramText: string) {
        if (!mermaidModule) return
        const current = ++renderCounter
        try {
            error = ''
            const isDark = document.documentElement.classList.contains('dark')
            const theme = isDark ? darkTheme : lightTheme
            const themed = `%%{init: {'theme': '${theme}'}}%%\n${diagramText}`
            const id = `mermaid-${crypto.randomUUID()}`
            const result = await mermaidModule.render(id, themed)
            if (current !== renderCounter) return
            svg = result.svg
        } catch (e) {
            if (current !== renderCounter) return
            error = e instanceof Error ? e.message : String(e)
        }
    }

    $effect(() => {
        if (mermaidModule) {
            void renderDiagram(text)
        }
    })

    onMount(() => {
        let observer: MutationObserver
        void (async () => {
            try {
                const mod = (await import('mermaid')).default
                mod.initialize({ startOnLoad: false, securityLevel: 'strict' })
                mermaidModule = mod
            } catch (e) {
                error = e instanceof Error ? e.message : String(e)
            } finally {
                loading = false
            }
        })()
        observer = new MutationObserver((mutations) => {
            /* re-render on html class change */
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    })
</script>

{#if loading}
    <div class="mermaid-loading" data-testid="mermaid-loading">Loading diagram...</div>
{:else if error}
    <div class="mermaid-error" data-testid="mermaid-error">Diagram error: {error}</div>
{:else}
    <div class="mermaid-diagram" data-testid="mermaid-diagram">
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
        {@html svg}
    </div>
{/if}
```

(Comments are abbreviated here. Open the real file and keep its comment style.)

Observable contract that must be preserved, pinned by
`src/lib/extensions/mermaid/MermaidRenderer.test.ts` (8 tests, which must pass
**unmodified**):

- Renders `data-testid="mermaid-loading"` with text `Loading diagram...` synchronously on first render.
- `mermaid` is imported **dynamically**, only in the browser, after mount.
  `scripts/tree-shaking.mjs` asserts that for `MermaidRenderer` mermaid is
  absent from the initial chunk but present as a dynamic chunk
  (`expectDynamicPresent: ['node_modules/mermaid']`).
- `initialize({ startOnLoad: false, securityLevel: 'strict' })` is called (once per renderer instance today).
- The theme is chosen from `document.documentElement.classList.contains('dark')`,
  prepended as `%%{init: {'theme': '<theme>'}}%%\n`, and `render` is called
  with id `mermaid-<crypto.randomUUID()>`.
- Errors show `data-testid="mermaid-error"` with `Diagram error: <message>`.
  Non-`Error` throws are stringified.
- A class change on `<html>` re-renders.

### The pattern to copy: engine-agnostic syntax highlighting

`src/lib/extensions/highlight/` is the exemplar. Read all of it before starting:

- `codeHighlighter.ts`: the `CodeHighlighter` interface. The module doc states
  the hard rule ("`highlight` must be synchronous and must never throw…
  Factories are expected to wrap engine failures"). It has **no engine
  imports**, so the shared renderer stays free of optional peers.
- `highlightContext.ts`: a three-channel injection with this resolution order:
  explicit prop → Svelte context under
  `HIGHLIGHT_CONTEXT_KEY = Symbol.for('svelte-markdown:code-highlighter')` →
  module singleton via `setCodeHighlighter()` / `getCodeHighlighter()`. Read
  its module doc for why (the `renderers` map only forwards token props).
- `HighlightedCode.svelte`: resolves with
  `const resolved = $derived(highlighter ?? contextHighlighter ?? getCodeHighlighter())`,
  where `contextHighlighter` is read once at init with `getContext`.
- `HighlightedCode.test.ts` and `src/lib/test/HighlightContextHost.svelte`: the
  test pattern for resolution order (a stub engine plus a test-only host
  component that calls `setContext`).

Differences from highlighting that this plan must handle: Mermaid engines may
be **async** (mermaid.js is). Unlike `highlight()`, `MermaidEngine.render()`
may return a value or a `Promise`. It must still never throw or reject.

### Exports

- `src/lib/extensions/mermaid/index.ts`:
    ```ts
    export { markedMermaid } from './markedMermaid.js'
    export { default as MermaidRenderer } from './MermaidRenderer.svelte'
    ```
- `src/lib/extensions/index.ts` (the barrel) re-exports
  `export { MermaidRenderer, markedMermaid } from './mermaid/index.js'`.
  `src/lib/extensions/barrel-optional-deps.test.ts` fails if anything reachable
  from the barrel via plain-TS **static** imports imports an optional peer
  (`mermaid`, `pele`, `shiki`, …). A dynamic `import('mermaid')` is fine. Do
  not add a static `import … from 'mermaid'` to any `.ts` file.

## Commands you will need

| Purpose          | Command                                                              | Expected on success      |
| ---------------- | -------------------------------------------------------------------- | ------------------------ |
| Install          | `pnpm install`                                                       | exit 0                   |
| Unit tests (one) | `pnpm test:only src/lib/extensions/mermaid`                          | all pass                 |
| Unit tests (all) | `pnpm test`                                                          | all pass, coverage ≥ 90% |
| Typecheck        | `pnpm check`                                                         | exit 0, 0 errors         |
| Package          | `pnpm package`                                                       | exit 0                   |
| Tree-shaking     | `pnpm test:tree-shaking` (after `pnpm package`)                      | every case passes        |
| E2E (mermaid)    | `pnpm test:e2e tests/mermaid.test.ts tests/mermaid-snippets.test.ts` | all pass                 |
| Lint / format    | `trunk fmt && trunk check`                                           | no new issues            |

Do not use `pnpm lint`, `npx eslint`, or `npx prettier`. Trunk is the lint
authority. Never use `eslint-disable` comments; use `// trunk-ignore(eslint/<rule>)`.

## Scope

**In scope**:

- `src/lib/extensions/mermaid/mermaidEngine.ts` (create): contract, types, and module doc
- `src/lib/extensions/mermaid/mermaidContext.ts` (create): context key and singleton
- `src/lib/extensions/mermaid/createMermaidJsEngine.ts` (create): the mermaid.js engine
- `src/lib/extensions/mermaid/MermaidRenderer.svelte` (modify)
- `src/lib/extensions/mermaid/index.ts` (modify: new exports)
- `src/lib/extensions/index.ts` (modify: re-export the new engine-free names)
- `src/lib/extensions/index.test.ts` (modify: add export assertions for the new names)
- `src/lib/extensions/mermaid/mermaidEngine.test.ts` (create)
- `src/lib/extensions/mermaid/createMermaidJsEngine.test.ts` (create)
- `src/lib/extensions/mermaid/MermaidRenderer.engine.test.ts` (create)
- `src/lib/test/MermaidContextHost.svelte` (create, test-only)
- `README.md`: the `### Mermaid Diagrams (Async Rendering)` section (around line 543) only

**Out of scope**:

- `src/lib/extensions/mermaid/MermaidRenderer.test.ts`. It must pass
  **unmodified**. It is the proof that nothing changed.
- `src/lib/extensions/mermaid/markedMermaid.ts`. Plan 005 owns tokenizer changes.
- Any pele code, `package.json`, or the `exports` map. Plan 004 owns those.
- `scripts/tree-shaking.mjs`. Run it, but do not edit it here.

## Git workflow

- All work from this batch integrates onto the existing branch
  `chore/competitive-intel-2026-10-28` (the 2026-10-28 digest's state.json
  branch). Digest follow-ups ship as one PR, per the operator's standing rule.
- The dispatching reviewer (guard) owns git. Do NOT create branches, commit,
  push, or open PRs yourself.
- For reference, commit messages use Conventional Commits, e.g. `docs(compare): …` / `feat(mermaid): …`.

## Steps

### Step 1: Pin the current behavior

Run the existing suite to record a green baseline:

**Verify**: `pnpm test:only src/lib/extensions/mermaid` → all tests pass
(`MermaidRenderer.test.ts` 8 tests, `markedMermaid.test.ts` all pass).

This is an enhancement, but the existing test file already pins the behavior
that must not change. New behavior is net-new API, so the red tests for it
come in Step 5, against the new contract.

### Step 2: Create the contract, `mermaidEngine.ts`

Model the module doc and style on `highlight/codeHighlighter.ts`. Content:

```ts
/** Theme inputs every engine receives; engines may ignore what they don't use. */
export interface MermaidRenderContext {
    /** Whether `<html>` currently carries the `dark` class. */
    dark: boolean
    /** Engine-specific light theme name (mermaid.js: `default`, `forest`, …). */
    lightTheme: string
    /** Engine-specific dark theme name (mermaid.js: `dark`, `neutral`, …). */
    darkTheme: string
}

/** Either rendered SVG markup or a human-readable error message. */
export type MermaidRenderResult =
    { svg: string; error?: undefined } | { svg?: undefined; error: string }

/** A Mermaid diagram engine consumed by `MermaidRenderer`. */
export interface MermaidEngine {
    /**
     * Render diagram source to SVG markup. May return synchronously (preferred:
     * the diagram appears in the same frame) or a Promise. Must NEVER throw and
     * the Promise must NEVER reject — wrap engine failures into `{ error }`.
     */
    render(
        _text: string,
        _context: MermaidRenderContext
    ): MermaidRenderResult | Promise<MermaidRenderResult>
}

/** Normalise any thrown value into the `{ error }` result shape. */
export const toMermaidError = (e: unknown): MermaidRenderResult => ({
    error: e instanceof Error ? e.message : String(e)
})
```

Parameter names prefixed with `_` follow the existing `CodeHighlighter`
interface (`highlight(_code: string, _lang: string)`). The module doc must state
the never-throw rule and why: the renderer sits on the streaming render path.
It must also say that the engine output goes into `{@html}`, so **engines are
responsible for producing safe SVG**. mermaid.js uses `securityLevel: 'strict'`.

**Verify**: `pnpm check` → exit 0.

### Step 3: Create `mermaidContext.ts`

Copy the shape of `highlight/highlightContext.ts` exactly:
`MERMAID_ENGINE_CONTEXT_KEY: unique symbol = Symbol.for('svelte-markdown:mermaid-engine')`,
`setMermaidEngine(engine: MermaidEngine | undefined): void`, and
`getMermaidEngine(): MermaidEngine | undefined`, with an adapted module doc.

**Verify**: `pnpm check` → exit 0.

### Step 4: Create `createMermaidJsEngine.ts`

Move the mermaid.js logic out of the component, unchanged:

```ts
import { toMermaidError, type MermaidEngine } from './mermaidEngine.js'

/**
 * mermaid.js engine. Loads `mermaid` with a dynamic import on first render (it
 * is an optional peer and DOM-only), initializes it with
 * `securityLevel: 'strict'`, and renders asynchronously.
 */
export const createMermaidJsEngine = (): MermaidEngine => {
    let loaded: Promise<typeof import('mermaid').default> | undefined
    const load = () =>
        (loaded ??= import('mermaid').then((mod) => {
            const mermaid = mod.default
            mermaid.initialize({ startOnLoad: false, securityLevel: 'strict' })
            return mermaid
        }))
    return {
        async render(text, { dark, lightTheme, darkTheme }) {
            try {
                const mermaid = await load()
                const theme = dark ? darkTheme : lightTheme
                const themed = `%%{init: {'theme': '${theme}'}}%%\n${text}`
                const { svg } = await mermaid.render(`mermaid-${crypto.randomUUID()}`, themed)
                return { svg }
            } catch (e) {
                return toMermaidError(e)
            }
        }
    }
}
```

The `import('mermaid')` must remain a dynamic import. It is what keeps mermaid
out of the barrel graph and out of the initial chunk.

**Verify**: `pnpm check` → exit 0, and `grep -n "from 'mermaid'" src/lib/extensions/mermaid/*.ts` → no output.

### Step 5: Write failing tests for the engine path

Create `src/lib/test/MermaidContextHost.svelte`, modeled on
`src/lib/test/HighlightContextHost.svelte`. Its props are
`contextEngine?: MermaidEngine`, `propEngine?: MermaidEngine`, and `text: string`.
It calls `setContext(MERMAID_ENGINE_CONTEXT_KEY, contextEngine)` and renders
`<MermaidRenderer {text} engine={propEngine} />`.

Create `src/lib/extensions/mermaid/MermaidRenderer.engine.test.ts`. Model it on
`highlight/HighlightedCode.test.ts`, with `afterEach(() => setMermaidEngine(undefined))`.
Use stub engines like:

```ts
const syncStub = (label: string) => ({
    calls: [] as string[],
    render(text: string) {
        this.calls.push(text)
        return { svg: `<svg data-engine="${label}">${text}</svg>` }
    }
})
```

Cases (use `waitFor` from `@testing-library/svelte`):

1. explicit `engine` prop wins over context and singleton (`data-engine="prop"`)
2. context wins over singleton
3. singleton (`setMermaidEngine`) is used when there is no prop and no context
4. a **sync** engine's SVG appears in `[data-testid="mermaid-diagram"]` and no
   `mermaid` module is imported (assert `vi.mock('mermaid', …)`'s `render` mock was not called)
5. an **async** stub engine (`render: () => Promise.resolve({ svg: … })`) renders
   after resolution
6. a stale async result is discarded. Engine call 1 resolves after call 2
   (control with manual deferreds), the component's `text` prop is updated via
   `rerender({ text: 'B' })`, and the final diagram shows B's SVG
7. `{ error: 'boom' }` renders `[data-testid="mermaid-error"]` with text `Diagram error: boom`
8. the engine receives `{ dark: true, lightTheme: 'default', darkTheme: 'dark' }`
   when `<html class="dark">`, and is called again with `dark: false` after the
   class is removed (wait for the MutationObserver)

Also create `mermaidEngine.test.ts` (covers `toMermaidError` with an `Error` and
a non-Error, and asserts `MERMAID_ENGINE_CONTEXT_KEY === Symbol.for('svelte-markdown:mermaid-engine')`).
Create `createMermaidJsEngine.test.ts`, which mocks `mermaid` the same way
`MermaidRenderer.test.ts` does and covers: resolves `{ svg }`, resolves
`{ error }` (never rejects) when `render` rejects, calls `initialize` once
across two renders of the same engine, and uses `darkTheme` when `dark: true`.

**Verify**: `pnpm test:only src/lib/extensions/mermaid` → the new
`MermaidRenderer.engine.test.ts` cases FAIL (the `engine` prop and context are
not wired yet), with errors such as the diagram never appearing or
`data-engine` mismatches. `mermaidEngine.test.ts` and
`createMermaidJsEngine.test.ts` already pass. If the renderer cases pass
already, STOP: the test is wrong.

### Step 6: Rewire `MermaidRenderer.svelte` onto the contract

Target shape (keep the existing comment style, and add a `@component` doc
comment like `HighlightedCode.svelte` has):

```svelte
<script lang="ts">
    import { getContext, onMount } from 'svelte'
    import { createMermaidJsEngine } from './createMermaidJsEngine.js'
    import { getMermaidEngine, MERMAID_ENGINE_CONTEXT_KEY } from './mermaidContext.js'
    import type { MermaidEngine, MermaidRenderResult } from './mermaidEngine.js'

    interface Props {
        text: string
        lightTheme?: string
        darkTheme?: string
        /** Optional explicit engine; overrides context and singleton. Defaults to mermaid.js. */
        engine?: MermaidEngine
    }

    const { text, lightTheme = 'default', darkTheme = 'dark', engine }: Props = $props()

    // Context is stable for the component's lifetime; read once at init.
    const contextEngine = getContext<MermaidEngine | undefined>(MERMAID_ENGINE_CONTEXT_KEY)
    // Per-instance default keeps today's behavior: one mermaid import/initialize per renderer.
    const fallbackEngine = createMermaidJsEngine()
    const resolved = $derived(engine ?? contextEngine ?? getMermaidEngine() ?? fallbackEngine)

    let mounted = $state(false)
    let dark = $state(false)
    let result = $state<MermaidRenderResult | null>(null)
    let renderCounter = 0

    $effect(() => {
        if (!mounted) return
        const current = ++renderCounter
        const output = resolved.render(text, { dark, lightTheme, darkTheme })
        if (output instanceof Promise) {
            // Engines never reject (contract); stale results are dropped.
            void output.then((value) => {
                if (current === renderCounter) result = value
            })
        } else {
            result = output
        }
    })

    onMount(() => {
        dark = document.documentElement.classList.contains('dark')
        mounted = true
        const observer = new MutationObserver(() => {
            dark = document.documentElement.classList.contains('dark')
        })
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
        return () => observer.disconnect()
    })
</script>

{#if !result}
    <div class="mermaid-loading" data-testid="mermaid-loading">Loading diagram...</div>
{:else if result.error !== undefined}
    <div class="mermaid-error" data-testid="mermaid-error">Diagram error: {result.error}</div>
{:else}
    <div class="mermaid-diagram" data-testid="mermaid-diagram">
        <!-- trunk-ignore(eslint/svelte/no-at-html-tags) -->
        {@html result.svg}
    </div>
{/if}
```

Notes:

- The engine is called only after mount. Server rendering keeps showing the
  loading placeholder, exactly as today. SSR of sync engines is deliberately
  deferred; see Maintenance notes.
- Keep the existing per-instance mermaid.js semantics. Do NOT hoist
  `fallbackEngine` to module scope. The unmodified `initializes mermaid with
strict security` test resets its mock between tests and relies on
  per-instance initialization.

**Verify**: `pnpm test:only src/lib/extensions/mermaid` → ALL pass. That
includes the 8 unmodified `MermaidRenderer.test.ts` tests and every new test.
If an unmodified test fails, fix the component, never the test. If you cannot
make it pass, that is a STOP condition.

### Step 7: Export the new API

- `src/lib/extensions/mermaid/index.ts`: add
  `createMermaidJsEngine`, `MERMAID_ENGINE_CONTEXT_KEY`, `getMermaidEngine`,
  `setMermaidEngine`, `toMermaidError`, and the types `MermaidEngine`,
  `MermaidRenderContext`, `MermaidRenderResult`.
- `src/lib/extensions/index.ts` (barrel): add the same names to the existing
  mermaid export lines. All of them are engine-free (the mermaid.js engine
  uses only a dynamic import), so this is barrel-safe.

In `src/lib/extensions/index.test.ts`, add one `it(...)` that imports
`createMermaidJsEngine`, `setMermaidEngine`, `getMermaidEngine`, and
`MERMAID_ENGINE_CONTEXT_KEY` from `./index.js` and asserts their types. Follow
the existing `should export markedMermaid function` style.

**Verify**: `pnpm test:only src/lib/extensions` → all pass, including
`barrel-optional-deps.test.ts` and `index.test.ts`.

### Step 8: Document it

In `README.md`, inside `### Mermaid Diagrams (Async Rendering)`, add a short
`#### Choosing an engine` subsection after the paragraph that starts
`` `markedMermaid()` is a zero-dependency tokenizer``. It should cover:

- mermaid.js is the default engine. Nothing changes for existing users.
- `MermaidEngine` contract, with a tiny custom-engine example.
- the resolution order: `engine` prop → context under `MERMAID_ENGINE_CONTEXT_KEY`
  → `setMermaidEngine()` singleton → built-in mermaid.js. Mirror the wording of
  the highlighter resolution paragraph (search README for `The highlighter is resolved in priority order`).
- the security note: engine output is injected as SVG markup, so custom
  engines must produce safe markup.

Do not mention pele yet. Plan 004 adds that.

### Step 9: Full gate

```bash
pnpm check
pnpm test
pnpm package && pnpm test:tree-shaking
pnpm test:e2e tests/mermaid.test.ts tests/mermaid-snippets.test.ts
trunk fmt && trunk check
```

**Verify**: all exit 0. Coverage stays ≥ 90%. Tree-shaking still reports the
`mermaid renderer` case with mermaid only in a dynamic chunk.

## Test plan

- The anchor is `MermaidRenderer.test.ts`, which must pass unmodified before
  and after (Steps 1 and 6). That is the zero-behavior-change proof.
- New: `MermaidRenderer.engine.test.ts` (8 cases, red in Step 5, green in
  Step 6), `mermaidEngine.test.ts`, and `createMermaidJsEngine.test.ts`.
  Patterns: `highlight/HighlightedCode.test.ts` and
  `src/lib/test/HighlightContextHost.svelte`.
- E2E `tests/mermaid.test.ts` exercises the real mermaid.js path in a browser.

## Done criteria

- [ ] `git diff bdebe69 -- src/lib/extensions/mermaid/MermaidRenderer.test.ts` is empty
- [ ] `pnpm test` exits 0. Coverage ≥ 90%. The new test files exist and pass.
- [ ] `pnpm check` exits 0
- [ ] `pnpm package && pnpm test:tree-shaking` exits 0
- [ ] `pnpm test:e2e tests/mermaid.test.ts tests/mermaid-snippets.test.ts` exits 0
- [ ] `grep -rn "from 'mermaid'" src/lib --include=*.ts` → no output
- [ ] `grep -n "setMermaidEngine\|MERMAID_ENGINE_CONTEXT_KEY" src/lib/extensions/index.ts src/lib/extensions/mermaid/index.ts README.md` matches in all three files
- [ ] `trunk check` reports no new issues. No `eslint-disable` comments were added.
- [ ] Only in-scope files changed (`git status`)
- [ ] `README.md` status row updated (the plan index, not the repo README)

## STOP conditions

- An unmodified `MermaidRenderer.test.ts` test fails after Step 6 and the fix
  would require changing observable behavior (for example, the loading text or
  the timing of the first render).
- `barrel-optional-deps.test.ts` or `pnpm test:tree-shaking` fails because
  `mermaid` becomes reachable statically.
- The E2E mermaid tests fail in a way that the unit tests did not predict.
- Svelte reports `state_unsafe_mutation` or an effect loop from assigning
  `result` inside the `$effect`. Report it, and do not restructure into
  something not shown here without review.

## Maintenance notes

- Plans 004 (pele engine) and 005 (live rendering of open fences) build
  directly on this contract. Changing `MermaidEngine`'s shape later is a
  breaking API change, so keep it minimal.
- **SSR for sync engines** is deliberately deferred. The renderer calls engines
  only after mount, so SSR output is unchanged. A sync engine could render on
  the server (pele has a DOM-free `metricsMeasurer`). That would need an
  explicit `ssr` capability flag on the engine. It is a follow-up only if users ask.
- A reviewer should check three things. The `$effect` must read `text`, `dark`,
  `lightTheme`, `darkTheme` and `resolved` so it re-runs on each. No `.ts` file
  may statically import `mermaid`. The per-instance `fallbackEngine` must stay
  per instance.
