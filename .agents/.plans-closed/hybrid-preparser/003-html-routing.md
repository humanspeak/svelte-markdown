# Plan 003: Specify the boundary between HTML renderers and compiled Svelte

> **Executor instructions:** Read this entire plan; follow steps in order and
> run each verification. Honor STOP conditions. The conductor maintains index.
>
> **Drift check (first):** `git diff --stat e6195d0..HEAD -- .agents/.plans/hybrid-preparser/003-html-routing-design.md`.
> Compare the current-state excerpts if paths changed; STOP on unexplained drift.
> Also inspect `git status --short`; unrelated pre-existing edits must not be
> staged, reformatted, or included in your report as your work.

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** MED
- **Depends on:** none
- **Category:** direction
- **Planned at:** commit `e6195d0`, 2026-10-06

## Why this matters

The distinction sought is build-time parsing targeting our customizable renderer
with compiled Svelte where needed. Compiling every authored HTML tag weakens that
promise. Decide a feasible routing contract before broader compiler integration;
produce a design/spike report, not an implementation or release claim.

## Current state

`hybrid.js:61` currently selects every non-Text top-level Svelte AST node and
:148 wraps it in a generated snippet. Thus `<section>`, `<my-widget>`, and
`<TypedCounter>` all compile natively. MarkdownDocument:38 feeds generated token
arrays to SvelteMarkdown; `html_<tag>` snippet props connect island markers.
NOTES.md explicitly documents native HTML bypassing HTML renderer overrides and
sanitizer hooks. Existing dynamic Markdown goes through HTMLParser2 and the
existing HTML renderer API. No custom authoring delimiter is acceptable.

Relevant readers: src/lib/preprocess/hybrid.js, MarkdownDocument.svelte,
src/lib/Parser.svelte, src/lib/renderers/html/Html.svelte (locate actual dispatcher
with rg if name differs), src/lib/utils/token-cleanup.ts, src/lib/types.ts,
src/lib/utils/component-props.ts. Read those implementations; do not infer APIs.

## Repository conventions and commands

This is @humanspeak/svelte-markdown, Svelte 5 with strict TypeScript, Marked 18,
SvelteKit/Vite, pnpm 12.6.0, Node >=22. The branch is an unpublished proof for
issue #372: build-time Markdown tokens use the existing customizable renderer,
and embedded Svelte compiles without authoring delimiters. Trusted local files
are application source; runtime CMS strings never gain executable expressions.
Do not add a bundled DOM sanitizer, remote fetching, or editor functionality.

Use Trunk, never raw ESLint/Prettier; never eslint-disable. Match existing Vitest
`describe/it/expect` tests and Playwright `test/expect` tests. Svelte components
use `$props`, `$state`, `$derived`. Regression tests must assert rendered output,
not only generated-source spelling. README updates are required for changed
public behavior; keep experimental framing. Coverage gates are 95% statements,
89% branches, 95% functions, 96% lines (vite.config.ts).

| Purpose                    | Command                                                    | Expected                                                           |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| Bootstrap if necessary     | `pnpm install --frozen-lockfile`                           | exit 0, no tracked changes                                         |
| Unit tests                 | `pnpm test`                                                | all pass; coverage gates pass                                      |
| Focused preparser tests    | `pnpm test:only src/lib/preprocess/`                       | all pass                                                           |
| Types                      | `pnpm check`                                               | exit 0; zero errors; three baseline warnings permitted             |
| Format                     | `trunk fmt`                                                | exit 0; changed files only                                         |
| Lint                       | `trunk check`                                              | exit 0                                                             |
| Build/package              | `pnpm build`                                               | exit 0, publint passes; existing import.meta.env warning permitted |
| Focused production browser | `pnpm exec playwright test <test-file> --project=chromium` | all pass                                                           |

## Git and executor workflow

The conductor owns commits and integration. Do not commit, push, open PRs, edit
this plan, any guard artifacts, or the batch README. Run serially on the supplied
checkout; no other executor writes it. If the checkout/workdir differs, STOP.
Report exact commands, red-first evidence, green results, changed files,
assumptions, and blocked verification. No fake green. The conductor updates the
status index and independently reruns done criteria. No dependency changes unless
explicitly in scope. Use existing dependencies, not a new parser ecosystem.

## Scope

Only these files may be changed:

- `.agents/.plans/hybrid-preparser/003-html-routing-design.md`

Everything else is out of scope, including dependencies, lockfile, unrelated
streaming/parser optimizations, published package exports, and productionizing
nested Markdown. Do not silently widen scope.

## Steps

### Step 1: Map actual renderer and compiler capabilities

Read the files above and Svelte AST shapes from installed compiler. Run read-only
Node probes contrasting lowercase elements, hyphenated custom tags, uppercase
components/member components, HTML attributes containing expressions/spreads,
children snippets, inline expressions, and control-flow blocks. Record commands
and observed node types. Do not create source fixtures or install packages.

**Verify:** report has a `## Evidence` section with file:line citations and actual
probe output summaries (no secret values or copied repository file dumps).

### Step 2: Compare feasible routing alternatives

Write the design report at the sole allowed output path. Include `## Goals`,
`## Routing matrix`, `## Alternatives`, `## Recommended contract`,
`## Compiler integration`, `## Verification strategy`, `## Open decisions`,
`## Deferred work`. Goals: no delimiters, same Markdown renderer customization
for static/dynamic documents, normal typed component props, no runtime Markdown
lexing for compiled pages, sanitizer contract explicit. Matrix must cover all
Step1 categories and say which renderer/compiler owns each plus props/children
and sanitization behavior. Compare at least2 feasible alternatives; identify
how dynamic HTML attributes could go through renderer/sanitizer hooks without
losing typed component semantics. Distinguish established feasibility from
unproven proposals. Include concrete dataflow and smallest next implementation
slice, with red tests and STOP conditions. Preserve trusted source boundary;
do not treat native compiled application code as untrusted CMS.

**Verify:** `rg '^## ' .agents/.plans/hybrid-preparser/003-html-routing-design.md`
returns all nine sections. `git diff --check` exits0.

### Step 3: Make a recommendation without implementing it

State one recommended default, its tradeoffs, migration implications, effect on
nested Markdown/document reference definitions, and remaining maintainer choices.
No new syntax delimiters, no promise of full mdsvex compatibility, no performance
advantage without measurement. Explicitly address uppercase components vs custom
HTML and whether static HTML remains customizable. This design does not authorize
implementing the routing contract. Subsequent lexical/scope fixes retain current
routing until a separate implementation plan is approved.

**Verify:** `trunk fmt .agents/.plans/hybrid-preparser/003-html-routing-design.md`
and `trunk check .agents/.plans/hybrid-preparser/003-html-routing-design.md` exit0;
`git diff --name-only` shows only this report for your contribution.

## Test plan

No red-first test: this is a design artifact, no runtime behavior changes.
Read-only probes establish AST/API facts. Future regression strategy must cover
renderer switching, sanitizers, normal typed props, nested references, SSR/hydration,
and zero runtime Lexer calls, with smallest testable slices.

## Done criteria

- [ ] All nine required report sections exist (rg heading check).
- [ ] Routing matrix covers all listed syntax categories and sanitizer ownership.
- [ ] At least two alternatives and one recommended contract are present.
- [ ] Facts have local evidence; unresolved feasibility is explicitly labeled.
- [ ] Trunk report lint and `git diff --check` pass.
- [ ] No source, dependencies, or plan/index/guard files changed.
- [ ] `git diff --check` exits 0.
- [ ] The contribution modifies only the listed paths; conductor artifacts excluded.
- [ ] The final report names all verification limitations and deviations.

## STOP conditions

- No feasible contract preserves customization without new delimiters: report this as an unresolved design result.
- A proposed architecture requires runtime Markdown parsing: identify conflict rather than hide it.
- Need source modification to prove feasibility: specify a future spike instead of making edits.
- Live excerpts differ without an explained predecessor change.
- A fix needs out-of-scope files or a new dependency.
- A verification failure persists after two reasonable attempts.

## Maintenance notes

The report is a decision artifact, not a public API specification or automatic
approval for implementing the proposal. Nested Markdown and packaging remain
separate plans; avoid turning this into a complete mdsvex clone roadmap.
