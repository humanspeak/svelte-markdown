# Plan 004: Ship a lightweight synchronous Mermaid engine backed by `pele` on the `extensions/mermaid-pele` subpath

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `.agents/.plans/competitive-followups/README.md`, unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Prerequisite**: plan `003-mermaid-engine-contract.md` must be DONE and merged
> into your base. Confirm with
> `test -f src/lib/extensions/mermaid/mermaidEngine.ts && grep -n "export interface MermaidEngine" src/lib/extensions/mermaid/mermaidEngine.ts`.
> If that prints nothing, STOP.
>
> **Drift check (run first)**:
> `git diff --stat bdebe69..HEAD -- package.json scripts/tree-shaking.mjs src/lib/extensions/barrel-optional-deps.test.ts README.md docs/src/routes/docs/advanced/marked-extensions/+page.svx`
> Plan 003 is expected to have changed `README.md` (a `#### Choosing an engine`
> subsection). Any other change in these files means you must compare them
> with the excerpts below before proceeding.
>
> **Revision 2026-10-28**: Git workflow re-pointed to the shared digest branch `chore/competitive-intel-2026-10-28` (operator's standing rule: digest follow-ups ship as one PR). The reviewer owns git. No change to scope or steps.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (new optional peer dependency and a new public subpath)
- **Depends on**: 003-mermaid-engine-contract.md. This plan implements
  `MermaidEngine` and imports `toMermaidError` from
  `src/lib/extensions/mermaid/mermaidEngine.ts`, which 003 creates.
- **Wave**: 2
- **Category**: direction (competitive gap)
- **Planned at**: commit `bdebe69`, 2026-10-28
- **Ticket**: HUM-72 (`gap-lightweight-mermaid-engine`), part 2 of 3

## Why this matters

svelte-streamdown 5.0.0 switched its diagrams to [pele](https://pele.run), an
MIT, zero-dependency Mermaid-syntax renderer. Pele costs ~15 KB gzip for its
core plus a 6–45 KB chunk per diagram type, renders **synchronously** in under
1 ms, and is themed with `--pele-*` CSS variables. mermaid.js is ~1.5 MB, has
23 deps, and is async and DOM-only. Diagrams in AI chat output are our niche,
so users should be able to opt into the light synchronous engine without
leaving this library. After plan 003, `MermaidRenderer` talks to a
`MermaidEngine` contract. This plan ships a pele implementation of it on its
own subpath, the same way `extensions/tanstack-highlight` ships a highlighting engine.

## Current state

### The contract you implement (created by plan 003)

`src/lib/extensions/mermaid/mermaidEngine.ts` exports:

```ts
export interface MermaidRenderContext {
    dark: boolean
    lightTheme: string
    darkTheme: string
}
export type MermaidRenderResult =
    { svg: string; error?: undefined } | { svg?: undefined; error: string }
export interface MermaidEngine {
    render(
        _text: string,
        _context: MermaidRenderContext
    ): MermaidRenderResult | Promise<MermaidRenderResult>
}
export const toMermaidError = (e: unknown): MermaidRenderResult => ({
    error: e instanceof Error ? e.message : String(e)
})
```

Rule: `render` must never throw or reject. Engine output is injected with
`{@html}`, so the engine is responsible for safe SVG. `MermaidRenderer`
resolves the engine through the `engine` prop, then context
`MERMAID_ENGINE_CONTEXT_KEY`, then `setMermaidEngine()`, then built-in mermaid.js.

(Read the live file. If its shape differs from the above, STOP.)

### The engine-subpath pattern to copy: `src/lib/extensions/tanstack-highlight/`

- `index.ts`: the module doc explains why the subpath is **not** re-exported from
  the `extensions` barrel (its factory statically imports an optional peer from
  plain JS). It re-exports the engine-free names for convenience and then
  exports its own factory.
- `createTanstackHighlighter.ts`: a factory that takes explicitly imported
  definitions (`languages: [ts, json]`) so only what the consumer imports is
  bundled. It wraps engine failures and lets construction-time errors surface
  (see its `@throws` doc).
- `package.json` `exports` has a `"./extensions/tanstack-highlight"` entry
  with `types` and `svelte` conditions pointing into `dist/`.
- `package.json` `peerDependencies` includes `"@tanstack/highlight": ">=0.1.0"`,
  marked optional in `peerDependenciesMeta`. It is also a pinned devDependency.

### pele's API (verified by the advisor against pele 1.12.0)

- `import { register, render, PeleError, type Diagram, type RenderOptions } from 'pele/core'`
- `register(...list: Diagram<any>[]): void` registers diagram types **globally**
  in pele's module state.
- `render(source: string, options?: RenderOptions): RenderResult`, where
  `RenderResult` has `{ svg, width, height, links, type, mermaidType }`. It is synchronous.
  It throws `PeleError` (`code: 'unsupported-diagram' | 'syntax' | 'semantic' | 'limit'`).
- Each diagram type is a default export of `pele/diagrams/<type>`, for example
  `import flowchart from 'pele/diagrams/flowchart'`. Available types include
  flowchart, sequence, class, state, er, gantt, pie, mindmap, timeline,
  gitGraph, journey, quadrantChart, xychart, sankey, and more.
- `pele` (the root entry) bundles every type (~266 KB gzip). `pele/lazy`
  offers `renderAsync`, which loads types on demand. This plan uses `pele/core`
  with explicit registration only.
- Theming: CSS variables on `.pele` or a parent (`--pele-bg`, `--pele-fg`,
  `--pele-line`, `--pele-accent`, `--pele-font`, …). "Colors adapt to theme
  changes without being re-rendered."
- Security (from its README): "Pele escapes diagram text, filters links and
  styles, and limits source and output size."

### Guards that must keep passing

- `src/lib/extensions/barrel-optional-deps.test.ts` contains
  `const OPTIONAL_ENGINE_PACKAGES = ['shiki', '@tanstack/highlight']` and
  asserts that the barrel's static plain-TS graph never reaches them.
- `scripts/tree-shaking.mjs` holds a `cases` array of
  `{ name, source, expectInitialPresent?, expectInitialMissing?, expectAllMissing?, expectDynamicPresent? }`.
  Copy the existing `'extensions barrel stays tanstack-highlight-free'` and
  `'shiki highlighter factory'` cases as patterns.
- `pnpm-workspace.yaml` has `minimumReleaseAge: 2880` (2 days). pele publishes
  very often, so install a version at least 2 days old.

## Commands you will need

| Purpose          | Command                                          | Expected on success      |
| ---------------- | ------------------------------------------------ | ------------------------ |
| Add dev dep      | `pnpm add -D pele@1.12.0` (see Step 1)           | exit 0                   |
| Unit tests (one) | `pnpm test:only src/lib/extensions/mermaid-pele` | all pass                 |
| Unit tests (all) | `pnpm test`                                      | all pass, coverage ≥ 90% |
| Typecheck        | `pnpm check`                                     | exit 0                   |
| Package          | `pnpm package`                                   | exit 0                   |
| Tree-shaking     | `pnpm test:tree-shaking`                         | every case passes        |
| Docs typecheck   | `pnpm -C docs check`                             | exit 0                   |
| Lint / format    | `trunk fmt && trunk check`                       | no new issues            |

## Scope

**In scope**:

- `src/lib/extensions/mermaid-pele/createPeleEngine.ts` (create)
- `src/lib/extensions/mermaid-pele/index.ts` (create)
- `src/lib/extensions/mermaid-pele/createPeleEngine.test.ts` (create)
- `package.json`: `exports` (new subpath), `peerDependencies`, `peerDependenciesMeta`, `devDependencies`
- `pnpm-lock.yaml` (via `pnpm add` only)
- `src/lib/extensions/barrel-optional-deps.test.ts`: add `'pele'` and `'mermaid'` to the guarded list, and add a mermaid-subpath invariant
- `scripts/tree-shaking.mjs`: new cases
- `README.md`: a new `#### Lightweight engine: pele` subsection under the Mermaid section
- `docs/src/routes/docs/advanced/marked-extensions/+page.svx`: a short note in `## Step-by-Step: Mermaid Diagrams`

**Out of scope**:

- `src/lib/extensions/mermaid/*`. The contract and renderer belong to plan 003,
  and tokenizer changes belong to plan 005. If pele integration seems to need a
  contract change, STOP.
- `src/lib/extensions/index.ts` (the barrel). The pele subpath must **not** be re-exported there.
- Shipping or recommending a default stylesheet for `--pele-*` variables.
  Document the variables only.
- `pele/lazy` support (see Maintenance notes).

## Git workflow

- All work from this batch integrates onto the existing branch
  `chore/competitive-intel-2026-10-28` (the 2026-10-28 digest's state.json
  branch). Digest follow-ups ship as one PR, per the operator's standing rule.
- The dispatching reviewer (guard) owns git. Do NOT create branches, commit,
  push, or open PRs yourself.
- For reference, commit messages use Conventional Commits, e.g. `docs(compare): …` / `feat(mermaid): …`.

## Steps

### Step 1: Add pele as a dev dependency

Run `pnpm add -D pele@1.12.0`. If pnpm refuses it under `minimumReleaseAge`,
check `npm view pele time --json`, pick the newest version published more than
2 days ago, use that, and record the version in the status row.

Then add `"pele": ">=1.12.0"` (or the version you installed) to
`peerDependencies`, and `"pele": { "optional": true }` to
`peerDependenciesMeta`. Keep keys alphabetical, as `sort-package-json` in Trunk
enforces.

**Verify**: `node -e "console.log(require('./package.json').peerDependenciesMeta.pele)"` → `{ optional: true }`

### Step 2: Write the failing tests

Create `src/lib/extensions/mermaid-pele/createPeleEngine.test.ts`. Use the real
pele with `import flowchart from 'pele/diagrams/flowchart'`. Model the file
structure on `src/lib/extensions/tanstack-highlight/createTanstackHighlighter.test.ts`.
Cases:

1. returns `{ svg }` **synchronously** (assert that the return value is not a
   Promise) and `svg` starts with `<svg`, for `'flowchart LR\n  A --> B'`
2. returns `{ error }` and does not throw for a syntax error such as `'flowchart LR\n  A -->'`
3. returns `{ error }` for a diagram type that was not registered
   (`'sequenceDiagram\n  A->>B: hi'` when only flowchart is registered)
4. escapes text: rendering `'flowchart LR\n  A["<img src=x onerror=alert(1)>"] --> B'`
   yields an `svg` that does not contain `<img`
5. passes `renderOptions` through. With `{ renderOptions: { idPrefix: 'tst' } }`,
   the svg contains `tst`. If pele does not reflect `idPrefix` in its output,
   replace this case with a spy-free check of another option and note it.
6. ignores `dark`, `lightTheme`, and `darkTheme`: identical `svg` for `dark: true` and `dark: false`

**Verify**: `pnpm test:only src/lib/extensions/mermaid-pele` → FAILS with
module-not-found for `./createPeleEngine.js`.

### Step 3: Implement `createPeleEngine.ts`

````ts
/**
 * Lightweight synchronous Mermaid engine backed by pele (https://pele.run).
 *
 * Shipped ONLY via `@humanspeak/svelte-markdown/extensions/mermaid-pele` — this
 * file statically imports `pele/core`, an optional peer, so it must never be
 * reachable from the `extensions` barrel (guarded by barrel-optional-deps.test.ts).
 *
 * Only the diagram types you pass are bundled:
 *
 * ```ts
 * import flowchart from 'pele/diagrams/flowchart'
 * import sequence from 'pele/diagrams/sequence'
 * const engine = createPeleEngine({ diagrams: [flowchart, sequence] })
 * ```
 *
 * Output is themed by `--pele-*` CSS variables, so dark mode is a stylesheet
 * concern and the render context's theme fields are ignored.
 */
import { register, render, type RenderOptions } from 'pele/core'
import { toMermaidError, type MermaidEngine } from '../mermaid/mermaidEngine.js'

export interface CreatePeleEngineOptions {
    /** Diagram types to enable, e.g. `import flowchart from 'pele/diagrams/flowchart'`. */
    diagrams: Parameters<typeof register>
    /** Passed through to pele's `render` (limits, fonts, link/image schemes, …). */
    renderOptions?: RenderOptions
}

export const createPeleEngine = (options: CreatePeleEngineOptions): MermaidEngine => {
    // Registration is global in pele; a construction-time failure should surface.
    register(...options.diagrams)
    return {
        render(text) {
            try {
                return { svg: render(text, options.renderOptions).svg }
            } catch (e) {
                return toMermaidError(e)
            }
        }
    }
}
````

`Parameters<typeof register>` avoids writing `any` (pele types the parameter as
`Diagram<any>[]`). If it doesn't typecheck, use
`ReadonlyArray<Parameters<typeof register>[number]>` and spread it. Do not add
an `any` or an `eslint-disable`.

**Verify**: `pnpm test:only src/lib/extensions/mermaid-pele` → all 6 pass. If
case 1 fails in jsdom because pele needs a canvas, STOP. Pele should fall back
to its metrics measurer; if it doesn't, report it rather than mocking canvas.

### Step 4: Create the subpath `index.ts` and the export entry

`src/lib/extensions/mermaid-pele/index.ts` follows the
`tanstack-highlight/index.ts` pattern. The module doc says the subpath is not
re-exported from the barrel. It re-exports the engine-free names
`MermaidRenderer`, `markedMermaid`, `setMermaidEngine`, `getMermaidEngine`,
`MERMAID_ENGINE_CONTEXT_KEY`, and the types `MermaidEngine`,
`MermaidRenderResult`, `MermaidRenderContext` from `'../mermaid/index.js'`.
Then it exports `createPeleEngine` and `type CreatePeleEngineOptions`.

In `package.json` `exports`, add the entry right after `"./extensions/mermaid"`:

```json
"./extensions/mermaid-pele": {
    "types": "./dist/extensions/mermaid-pele/index.d.ts",
    "svelte": "./dist/extensions/mermaid-pele/index.js"
},
```

**Verify**: `pnpm check` → exit 0. `pnpm package && test -f dist/extensions/mermaid-pele/index.js && echo ok` → `ok`.

### Step 5: Extend the optional-dependency guards

In `barrel-optional-deps.test.ts`:

- Change the list to `const OPTIONAL_ENGINE_PACKAGES = ['shiki', '@tanstack/highlight', 'pele', 'mermaid']`
  and update its doc comment so it covers mermaid engines too.
- Add `'does not re-export the mermaid-pele subpath'`: the barrel's import
  specifiers contain nothing with `pele`.
- Add a `describe('shared mermaid renderer optional-dependency invariant')`
  block, modeled on the existing highlight one, asserting that
  `resolve(__dirname, 'mermaid/index.ts')` never reaches `pele` or `mermaid`
  statically.

In `scripts/tree-shaking.mjs`, add three cases next to the existing mermaid cases:

1. `'extensions barrel stays pele-free'`: source imports `markedAlert` from
   `@humanspeak/svelte-markdown/extensions`, `expectAllMissing: ['node_modules/pele']`
2. `'mermaid renderer stays pele-free'`: source imports `MermaidRenderer` from
   `.../extensions/mermaid`, `expectAllMissing: ['node_modules/pele']`
3. `'pele engine factory'`: source imports `createPeleEngine` from
   `.../extensions/mermaid-pele` and `flowchart` from `'pele/diagrams/flowchart'`,
   then logs both. `expectInitialPresent: ['node_modules/pele']`,
   `expectAllMissing: ['node_modules/mermaid']`

**Verify**: `pnpm test:only src/lib/extensions/barrel-optional-deps.test.ts` → all pass, and
`pnpm package && pnpm test:tree-shaking` → all cases pass, including the 3 new ones.
If case 3 shows `node_modules/mermaid` present, STOP. That means
`mermaid-pele/index.ts`'s re-exports pull in the mermaid.js engine's chunk.
Report it, because the fix may belong in plan 003's module layout.

### Step 6: Document it

`README.md`: under the Mermaid section, after plan 003's `#### Choosing an engine`,
add `#### Lightweight engine: pele`. Include:

- one sentence on what pele is and the size/sync trade-off. Use only the
  figures in "Why this matters", attributed to pele's docs.
- install: `npm install pele`
- a usage example with `createPeleEngine({ diagrams: [flowchart, sequence] })`,
  `setMermaidEngine(engine)`, `renderers={{ mermaid: MermaidRenderer }}`,
  `extensions={[markedMermaid()]}`
- that only the registered diagram types work, and others render
  `Diagram error: …`
- theming via `--pele-*` variables, with a 4–5 line CSS example including a
  `.dark .pele { … }` override
- a compatibility note: pele targets Mermaid syntax with its own layout and
  visual style, so diagrams will not look identical to mermaid.js

`docs/src/routes/docs/advanced/marked-extensions/+page.svx`: in
`## Step-by-Step: Mermaid Diagrams`, add a 2–3 sentence callout after the intro
paragraph. It should say that a synchronous lightweight engine is available on
`extensions/mermaid-pele` and point to the README section. Match the page's
existing callout or blockquote style, if it has one.

**Verify**: `pnpm -C docs check` → exit 0. `grep -n "mermaid-pele" README.md docs/src/routes/docs/advanced/marked-extensions/+page.svx` matches in both.

### Step 7: Full gate

```bash
pnpm check
pnpm test
pnpm package && pnpm test:tree-shaking
pnpm test:e2e tests/mermaid.test.ts tests/mermaid-snippets.test.ts
pnpm -C docs check
trunk fmt && trunk check
```

**Verify**: all exit 0, and coverage stays ≥ 90%.

## Test plan

- Net-new feature, so no red-against-existing-behavior test applies. Step 2's
  tests are written first and fail on the missing module, then go green in Step 3.
- New: `mermaid-pele/createPeleEngine.test.ts` (6 cases with the real pele).
  The extended `barrel-optional-deps.test.ts` covers the barrel and the
  mermaid-subpath invariants. 3 new tree-shaking cases cover bundles.
- The existing mermaid unit and E2E suites must stay green (the mermaid.js path is untouched).

## Done criteria

- [ ] `pnpm test` exits 0. Coverage ≥ 90%. `createPeleEngine.test.ts` has ≥ 6 passing cases.
- [ ] `pnpm check` and `pnpm -C docs check` exit 0
- [ ] `pnpm package && pnpm test:tree-shaking` exits 0 with the 3 new cases present: `grep -c "pele" scripts/tree-shaking.mjs` ≥ 3
- [ ] `grep -n "pele" src/lib/extensions/index.ts` → no output (not in the barrel)
- [ ] `package.json` has the `./extensions/mermaid-pele` export, an optional `pele` peer, and a `pele` devDependency
- [ ] `trunk check` reports no new issues. No `any` and no `eslint-disable` were added.
- [ ] Only in-scope files changed
- [ ] Plan index status row updated

## STOP conditions

- Plan 003's contract is missing or has a different shape.
- pele's `pele/core` exports differ from the API listed above in the installed version.
- pele cannot render in jsdom without a canvas mock (Step 3).
- Tree-shaking case 3 shows mermaid.js bundled alongside pele (Step 5).
- Integration seems to need changes in `src/lib/extensions/mermaid/*`.

## Maintenance notes

- pele releases several times a week (1.6 → 1.12 in about 10 days). The peer
  range is `>=`, matching the repo's other peers. Watch for a pele 2.0 and its
  `register` / `render` signatures.
- `register` is global. Two `createPeleEngine` calls with different diagram
  lists share one registry. Document this if users ask; it is harmless for the
  typical single-engine app.
- Deferred: a `pele/lazy` variant (`renderAsync`, which loads every type on
  demand without the consumer listing them). It fits the contract (async
  result) and can be added as `createPeleLazyEngine` if users ask.
- Deferred: SSR rendering for sync engines (see plan 003 Maintenance notes).
- Plan 005 makes open fences render live. Pele is the engine that makes that
  cheap, so 005 depends on this plan for its demo and E2E test.
- `pnpm-lock.yaml` will conflict with plan 001's branch (which bumps
  svelte-streamdown). Resolve by re-running `pnpm install` after merge.
