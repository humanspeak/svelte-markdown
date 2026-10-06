# Executor report — 003 HTML routing, round 3

Verbatim Opus 5.5 terminal report.

```text
I fixed Probe 4 and every claim that depended on it. Only `.agents/.plans/hybrid-preparser/003-html-routing-design.md` changed. Nothing is committed, and I didn't touch source, fixtures, dependencies, the plan, the index or the guard files.

**What I ran:** I ran your three inputs myself on Node 24.15.0 from the repo root, with the probe script kept outside the repo. I got the same results you did on Node 26:
- **A** (unclosed `<section …>`): one unstructured `html` token, with no `tag` and no `attributes`.
- **B** (`…>text</section>`): `{title:'{', alt:'&', q:'"', hidden:''}`. This goes through `expandHtmlBlockNested` (`token-cleanup.ts:234`), which uses `htmlparser2.Parser` (`:272`), so entities are decoded.
- **C** (blank-line separated): `{title:'&#123;', alt:'&amp;', q:'&quot;', hidden:''}`. This goes through `pairFlatHtmlTokens` (`:503`) and `extractAttributes` (`:561`, defined at `:141`), so entities stay raw.
- **Svelte:** B and C both parse as one `RegularElement` whose only child is `Text`, with decoded `data` and `hidden: true`. Bare htmlparser2 decodes the same way, but gives `''` for `hidden`.

**Changes in the design file:**
- **Evidence:** the `shrinkHtmlTokens` bullet now names both attribute paths instead of only htmlparser2.
- **Probe 4:** rewritten with the exact A/B/C inputs, a table of all five columns, and the source refs that show which input takes which path. It now says outright that the token path doesn't behave the same across the two closed shapes. A short runnable script (the token probe from Probe 2 plus the Svelte and htmlparser2 checks) follows, with its actual output. I ran the script exactly as it appears in the doc, after `trunk fmt`, and it reproduced.
- **Dataflow:** the `shrinkHtmlTokens` line now reads "htmlparser2 or flat pairing" instead of only htmlparser2.
- **Compiler integration:** says the token result depends on source shape, that both shapes qualify for slice 1, and that future tests must check rendered DOM values on both B and C, under both native compile and the routed path.
- **Red test 6:** now requires both closed shapes.
- **D7:** says the runtime path itself has two behaviors, and that routed and runtime tokens only agree for the same source shape. Any change to `token-cleanup.ts` would need its own plan.
- The round-2 fixes are unchanged: the 005 scope limits, slice 1 being Text-only, the unchanged `compiled-island` control, and the separately deferred binding analysis.

**Checks:** `rg` finds all nine headings. `trunk fmt` and `trunk check` both report "No issues" on the file. `git diff --check` is clean. `git diff --name-only` lists only the design file.

**Limitations:**
- How either attribute string ends up in the DOM is still unknown. Nothing was mounted, SSR-rendered or hydrated.
- Other entities, unquoted values, other block shapes and serialization back to HTML weren't probed.
- The Probe 2 script still needs its `CASES` list filled in by hand; only the new Probe 4 script is runnable as-is.
- The doc makes no performance or mdsvex parity claims.
```
