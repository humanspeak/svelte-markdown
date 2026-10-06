# Executor report — 003 HTML routing, round 2

Verbatim Opus 5.5 terminal report.

```text
I've corrected the plan 003 design report for all five guard findings. Its recommendation is unchanged, and it still doesn't authorize implementing the routing. `.agents/.plans/hybrid-preparser/003-html-routing-design.md` is the only file changed (260 lines added, 55 removed). Nothing was committed, and I didn't touch source, fixtures, plans or guard files.

## Corrections

1. **Plan 005 dependency.** The report no longer says plan 005 provides scope analysis. It now says 005 only keeps authored snippet declarations at document scope and places root-only Svelte metadata at the component root. It has no general binding or import analysis and no resolver for classifying components. Routing components by page scope (matrix rows 4/5, decision D1) now needs its own binding-analysis design and plan beyond 005, and the report says 005 must not be enlarged for it. I fixed this in the routing matrix, the recommended contract, the dataflow, Compiler integration and Deferred work. Slice 1 doesn't depend on it, because it never reclassifies a component.

2. **Slice 1 versus the browser test.**
   - The report now defines three terms and uses them throughout: **Text-only static element** (slice 1), **nested-static** (a later slice) and **nested-compiled** (row 14, a later slice).
   - The matrix says its Recommended column is the eventual target. Rows 1 and 2 are marked "slice 1 = Text-only subset", and the report states that slice 1 doesn't solve the matrix.
   - The browser test now uses a new Text-only section and a `section` renderer toggle, which a future plan would add to `+page.mdproof` and `+layout.svelte`. I didn't edit those files.
   - The existing `compiled-island` section is ineligible for slice 1 and is now control C3: it must stay compiled and its plan 001/002 assertions must pass unchanged. A new STOP condition fires if slice 1 would need to change or re-baseline it.

3. **Red tests versus controls.** The heading is now "Expected-red regression tests" (six tests, each required to fail for the intended reason, not a mock or import error). A separate "Unchanged green controls" list holds C1–C5: typed props, the dynamic-attribute section, `compiled-island`, a nested-static section, and zero lexer calls on mount.

4. **Attribute literals.** The unproven claim about entity decoding is gone. A new Probe 4 table records what I actually observed:
   - An unescaped `{` in source starts an expression, so the element stays compiled. An encoded `&#123;` is static text, which Svelte decodes to `{`.
   - Svelte and bare htmlparser2 agree on `&#123;`, `&amp;` and `&quot;`.
   - One real difference: the path slice 1 would use (`shrinkHtmlTokens`, which reads attributes with the regex `extractAttributes`) keeps entities undecoded (`'&#123;'`). It also gives a boolean attribute as `''` where Svelte has `true`. The runtime CMS path uses the same function, so build-time and runtime tokens would match each other.
   - How these values render in the DOM is marked unknown. I added red test 6 and a new decision D7 for it.

5. **Rerunnable probes.** The deleted `/tmp` paths are replaced by commands you can run from the repo root:
   - the AST classification probe and the undeclared-component compile probe, both rerun on Node 24.15.0 with the same results (zero warnings for all three inputs);
   - a self-contained script for the build-time token probe, using `registerHooks` to retry `.js` imports as `.ts` and loading `marked` from the repo.

   The report now explains that `Attribute.value` is `true` for a boolean attribute, an array for quoted or mixed values, and a single `ExpressionTag` object (not an array) for one expression. I also fixed the `{@const}` row, since it only appears inside a block, never at top level.

## Checks
- All nine `##` headings are present.
- `trunk fmt` on the report exited 0 and reformatted it. `trunk check` on the report exited 0 with no issues.
- `git diff --check` exited 0, and `git diff --name-only` lists only the design report.
- `git diff --stat 5fae1e2 031d0ff` over `src`, `tests` and config files was empty, so the round 1 evidence still holds.

## Limitations
- Nothing was mounted, server-rendered or hydrated. Routed rendering, nested markers, renderer switching, sanitizers on routed HTML, and how attribute entities render are all unverified.
- One round 1 case (a marker inside a raw HTML block with no blank lines) wasn't rerun. The report labels it as round 1 only.
- The token script in the report is a sketch that leaves the input list out, so it needs that list added before it runs.
- I didn't run the full test suite or a build, since this is design-only. There's no performance or mdsvex-parity claim, and the slice 1 STOP conditions still apply.

Three connectors need authorizing before they can be used, though none were needed here: claude.ai Granola and claude.ai Slack (in claude.ai connector settings), and plugin:posthog:posthog (via `claude mcp` or `/mcp`).
```
