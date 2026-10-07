# Plan 004: Keep Markdown code literal without corrupting Svelte JavaScript

> **Executor instructions:** Read this entire plan; follow steps in order and
> run each verification. Honor STOP conditions. The conductor maintains index.
>
> Revision 2026-10-06: Rebaseline to reviewed54eff01 after001-003 PASS. The only
> in-scope predecessor change is001's six README lines documenting synchronous
> preparsed arrays with async context; preserve that behavior/text. Hybrid code,
> tests and fixture are unchanged. Routing design003 remains advisory; no scope
> or acceptance criterion changed.
>
> **Drift check (first):** `git diff --stat 54eff01..HEAD -- src/lib/preprocess/hybrid.js src/lib/preprocess/hybrid.test.ts src/lib/preprocess/hybrid-render.test.ts src/routes/test/preprocess/hybrid/+page.mdproof README.md`.
> Compare the current-state excerpts if paths changed; STOP on unexplained drift.
> Also inspect `git status --short`; unrelated pre-existing edits must not be
> staged, reformatted, or included in your report as your work.

## Status

- **Priority:** P1
- **Effort:** M
- **Risk:** MED
- **Depends on:** 002 and 003 DONE
- **Category:** bug
- **Planned at:** commit `54eff01`, 2026-10-06

## Why this matters

The delimiter-free preparser must distinguish Markdown literals from JavaScript
inside Svelte syntax. Currently valid component props fail compilation. Make
literal detection aware of lexical boundaries without exposing code examples
to compilation or changing the renderer contract.

## Current state

`hybrid.js:19` masks every mdast code/inlineCode/definition/image node;
:33 calls fromMarkdown(body) without knowing Svelte lexical contexts;
:41 masks regex backslash+[{}<>]; :55 parses masked input as Svelte. This rejects
native-valid expressions `{`hello`}` and `<Counter value={`hello`} />` because
Markdown backtick ranges erase JavaScript template literals. Existing tests
hybrid.test.ts:92 verify literal inline/fenced code and :98 verify UTF16 offsets.
The fixture supplies data.greeting and state changes; hybrid-render.test.ts:39
asserts greeting strong. The HTML routing report is advisory: this plan must
retain existing native-HTML routing. Do not implement its proposed routing.

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

- `src/lib/preprocess/hybrid.js`
- `src/lib/preprocess/hybrid.test.ts`
- `src/lib/preprocess/hybrid-render.test.ts`
- `src/routes/test/preprocess/hybrid/+page.mdproof`
- `README.md`

Everything else is out of scope, including dependencies, lockfile, unrelated
streaming/parser optimizations, published package exports, and productionizing
nested Markdown. Do not silently widen scope.

## Steps

### Step 1: Add red regressions for contextual backticks

Add tests that native compile accepts and hybrid compile/render must accept:
standalone template literal expression, nullish fallback template literal,
component expression attribute with template literal, nested interpolation with
braces/backticks, and JavaScript strings/comments containing Markdown syntax.
Pin surrounding inline/fenced code as unchanged literals and UTF16 offsets.
Extend fixture greeting through a template literal expression so runtime tests
observe actual value and bold rendering, not just compiler acceptance.

**Verify:** `pnpm test:only src/lib/preprocess/` → new template-literal tests FAIL
with js_parse_error before implementation, existing protection tests still pass.

### Step 2: Make the protection pass lexical-context aware

Refactor masking within hybrid.js using installed Svelte parser facilities or a
bounded scanner which understands expression/attribute JS contexts (quoted
strings, comments, template literals/interpolation, braces). Do not globally
remove inlineCode protection or hardcode the demonstrated strings. Preserve
original UTF16 positions/newlines and recover original source for compiled nodes.
Respect genuine Markdown escapes; even-backslash parity must not suppress a
following live expression, odd parity must keep the escaped syntax literal.
Do not add dependencies, extend custom Marked-extension syntax, alter HTML
routing, or implement nested Markdown. If a correct solution exceeds this
bounded contract, STOP with concrete cases.

**Verify:** focused preparser tests all pass, including new cases and existing
literal/code/reference/inline strong tests.

### Step 3: Document and verify composition

Update experimental README text only as needed to describe the supported
expressions and literal boundary without claiming general custom-extension
compatibility. The fixture remains delimiter-free and its typed counter/events
unchanged. Run full gates and production fixture tests.

**Verify:** `trunk fmt`, `trunk check`, `pnpm check`, `pnpm test`, `pnpm build`,
`pnpm exec playwright test tests/preprocess-hybrid.test.ts --project=chromium`
all succeed.

## Test plan

Red-first compiler and runtime cases must cover JS template literals, nested
interpolations, strings/comments, literal Markdown fences/codespans (including
blockquotes), odd/even escapes, emoji offsets and bold expressions. Match existing
hybrid tests; tests must fail current code before the fix. Keep zero runtime Lexer
spies. GFM bare-autolink alignment and custom extension literal regions are deferred.

## Done criteria

- [ ] Red failure recorded; template literal component/expression tests now pass.
- [ ] Literal code, escapes, UTF16 offsets and inline bold regression pass.
- [ ] Existing zero-runtime-Lexer assertions remain and pass.
- [ ] Focused production hybrid Chromium test passes.
- [ ] `pnpm test`, `pnpm check`, `trunk check`, `pnpm build` exit0.
- [ ] `git diff --check` exits 0.
- [ ] The contribution modifies only the listed paths; conductor artifacts excluded.
- [ ] The final report names all verification limitations and deviations.

## STOP conditions

- A test passes before implementation: confirm remaining red cases reproduce before proceeding.
- Solution requires new parser dependency, global HTML routing change or nested Markdown support.
- Ambiguous syntax has no consistent lexical boundary: present examples and alternatives.
- Live excerpts differ without an explained predecessor change.
- A fix needs out-of-scope files or a new dependency.
- A verification failure persists after two reasonable attempts.

## Maintenance notes

Svelte grammar evolves; isolate boundary detection and expand paired JS-vs-Markdown
regressions with future syntax. Do not fix future extension incompatibility by
silently treating arbitrary Markdown as executable Svelte.
