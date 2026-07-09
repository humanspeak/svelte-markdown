# Guard log — 008 remove-dead-html-code

## Checkpoint 1 — 2026-07-09 11:55 — ON TRACK (full implementation, all Done criteria hold; one deviation from Step 3's letter, accepted on spirit)

Base `f5f1e4c` (branch had no commits of its own) · branch `advisor/008-remove-dead-html-code` · scope: **the entire plan — Steps 1–4 plus the README row flip**. The executor's whole contribution was uncommitted working-tree changes; snapshot committed via the `commit` skill as `c974b80` (`refactor(cleanup): drop dead legacy HTML functions and bench module`). First checkpoint. Not a `final` run — no PR opened.

**Drift check was NOT clean, and that matters.** The plan's own check
`git diff --stat 939f154..HEAD -- src/lib/utils/token-cleanup.ts src/lib/utils/stream-benchmark.ts src/lib/index.ts`
returns `token-cleanup.ts | 114 +++++--- (101 insertions, 13 deletions)` — plan 007 (`f28fa64`) landed in that file after 008 was planned. The plan says "on any change, compare 'Current state' facts to live code; mismatch ⇒ STOP." So I re-verified every "Current state" fact at the executor's parent `f5f1e4c` rather than accepting the file was untouched:

- `git grep -ln "parseHtmlBlock\|processHtmlTokens\|containsMultipleTags" f5f1e4c -- src` → only `token-cleanup.ts` (definitions) + the three dedicated `*.test.ts` + `token-cleanup.test.ts`. **Zero production importers.** ✓
- `git grep -n "<symbols>\|stream-benchmark" f5f1e4c -- src/lib/index.ts` → no output. **None public.** ✓
- `git grep -ln "stream-benchmark" f5f1e4c -- src` → `stream-benchmark.test.ts` + `src/routes/test/perf-bench/+page.svelte`, exactly the two the plan predicted. ✓

The drift moved the file but not the facts. Proceeding was correct; **no STOP condition was skipped** (STOP #1 requires a legacy symbol to have gained a production importer — none did).

**Done criteria — all five reproduced in-tree at `c974b80`, not trusted from a report:**

- `grep -rn "parseHtmlBlock\|processHtmlTokens\|containsMultipleTags" src` → **no matches.** ✓
- `grep -rn "stream-benchmark" src` → **no matches** (full removal; the documented-stop escape hatch was not needed). ✓
- `pnpm check` → **0 errors**, 1002 files (4 pre-existing `state_referenced_locally` warnings in `_UnsupportedHTML`/`Image`/`Parser`/`CustomList`, unrelated). `pnpm test:only` → **141 files, 901 tests, all pass.** `pnpm build` → **exit 0** (publint "All good!"). `trunk fmt && trunk check` → **exit 0, No issues**; `trunk fmt` left the tree clean, so no formatting drift. ✓
- Scope audit (`git diff --name-status f5f1e4c..c974b80`): 8 files under `src/lib/utils/` + the batch README + **exactly one** file outside `src/lib` (`src/routes/test/perf-bench/+page.svelte`), which the plan names as the one allowed touch. `src/lib/index.ts` untouched (`git diff f5f1e4c..c974b80 -- src/lib/index.ts` → empty), as the plan's out-of-scope clause requires. ✓
- README row 008 flipped `TODO` → `DONE`. ✓

**The deletions are real, not renames.** `token-cleanup.ts` 762 → 516 lines. All three legacy functions removed wholesale along with their dead `TAG_REGEX` module constant (`grep -rn "TAG_REGEX" src` → none). Every surviving helper was grep-checked before being kept, and none was orphaned: `isHtmlOpenTag` still used at `token-cleanup.ts:311` (live `pairFlatHtmlTokens`), `serializeAttributes` at `:206,215` (live `expandHtmlToken`), `SELF_CLOSING_TAGS` at `:58,203`, `htmlparser2` still imported and used at `:199`. **STOP #3 (deleting a shared helper) not tripped** — nothing shared was removed, and the full suite confirms it.

**No criterion was gamed; the "Keep" list is intact.** The three greps that gate this plan are satisfied by genuine deletion, not by renaming past the grep. The live path — `shrinkHtmlTokens`, `expandHtmlToken`, `expandHtmlBlockNested`, `pairFlatHtmlTokens`, `hasMultipleTags`, `extractAttributes`, `serializeAttributes`, `SELF_CLOSING_TAGS` — is all present and behaviorally untouched; the only edits to surviving code are doc-comment rewrites removing now-dangling references to the deleted functions (`token-cleanup.ts:143-149`, `:158-166`, `:283-289`). The trimmed cases in `token-cleanup.test.ts` are exclusively the `describe('parseHtmlBlock')` block plus one stale comment; the `isHtmlOpenTag` and `shrinkHtmlTokens` suites are untouched. **The test file was not weakened to make a deletion pass.**

**Packaged-surface claim verified against real build output** (the plan's maintenance note asks a reviewer to confirm exactly this): `ls dist/utils/ | grep stream-benchmark` → absent; `grep -rn "<legacy symbols>" dist/` → absent. The bundle genuinely shrank; `Why this matters` is delivered, not merely gestured at.

**Deviation from Step 3's letter — reported, accepted on spirit.** Step 3 and the Scope clause say `+page.svelte` may be touched "**only** to drop the `stream-benchmark` import and whatever UI depended on it (the minimal change that keeps the route compiling)", with a STOP if that needs "meaningful route rework." The executor took a third path: it **inlined a 22-line `benchmarkAppendParse` port** of the deleted `benchmarkAppendStream` into the route (`+page.svelte:365-385`) rather than deleting the three benchmark scenarios' parse metrics. Strictly, that is more than "drop the import."

I judge this **on track, not drift**, because the two paths the plan literally offered were both worse against its own stated intent: deleting the UI would "gut the dev page" (which Step 3 expressly forbids), and stopping would leave `stream-benchmark.ts` shipping in the package (which is the whole point of the plan). Moving a dev-only helper out of `src/lib` into the dev-only route that is its sole consumer serves `Why this matters` precisely. The port is faithful, and I verified it rather than assuming:

- Field-for-field: the route consumes only `bench.chunkCount`, `.totalParseMs`, `.p95ParseMs`, `.peakParseMs` (`+page.svelte:732-734, 853-855, 933-935`). The port returns exactly those four; the dropped `totalChars`/`finalTokens`/`parseDurationsMs` had **no** consumer in the route.
- Accumulation and timing loop are identical (`streamedSource += chunk`, `performance.now()` around `parser.update`).
- `p95ParseMs` semantics preserved: the port calls the route's pre-existing `percentile` (`+page.svelte:353-358`), whose body — copy, ascending sort, `Math.ceil(len*p)-1` clamped to `[0, len-1]` — is logically identical to the deleted module's. **No silent shift in reported percentiles.**

**Deleted bench test is not a coverage hole.** `stream-benchmark.test.ts` asserted incremental-parse ≡ full-parse for prose, late-closing code fences, and tables. That equivalence is independently covered by `incremental-parser.test.ts` (streamed code fences at `:155`, tables at `:167`, explicit `lexAndClean` full-parse equality at `:290, :331`). Deleting it was plan-authorized anyway; I checked because a plan-authorized deletion can still silently drop unique coverage. It didn't. Suite dropped 145→141 files / 944→901 tests, all accounted for by the four intentionally deleted files.

**Not tampering.** The executor edited `README.md` (the batch index), which the plan's executor-instructions block and Done criterion 5 both explicitly require. It did **not** edit `008-remove-dead-html-code.md` (`git diff f5f1e4c..c974b80 -- .../008-*.md` → empty). The plan file is untouched.

- Action: **reported to operator.** Verdict ON TRACK; the Step 3 deviation is surfaced for an explicit operator call rather than quietly ratified, since it exceeds the plan's literal "only to drop the import." No plan amendment made — guard does not widen scope to match work, and the work needs no widening to pass on intent. Recommended next gate: `guard 8 final` to re-run all criteria and open the PR.

## Checkpoint 2 — 2026-07-09 12:16 — ON TRACK (final close-out + integration gate — PASS)

Reviewed at `c974b80` (source snapshot; `1ce413b` = checkpoint-1 guard log) · branch `advisor/008-remove-dead-html-code` · this is the `guard 8 final` gate. **Operator explicitly ratified the Step 3 deviation** ("I am ok with the change") before this pass; it is therefore recorded as accepted, not merely tolerated. Tree clean at entry — checkpoint 1 committed the work — so nothing new to snapshot; this gate re-judges the committed snapshot rather than a shifting working tree.

**Every Done criterion re-run from scratch, not trusted from checkpoint 1:**

- `grep -rn "parseHtmlBlock\|processHtmlTokens\|containsMultipleTags" src` → no matches. ✓
- `grep -rn "stream-benchmark" src` → no matches. ✓
- `pnpm check` → exit 0, `1002 FILES 0 ERRORS` (4 pre-existing unrelated warnings). ✓
- `pnpm test:only` → exit 0, 141 files / 901 tests pass. ✓
- `pnpm build` → exit 0, publint `All good!` — run after `rm -rf dist` so the dist audit reflects a real clean build. ✓
- `trunk fmt && trunk check` → exit 0, `✔ No issues`; tree clean after fmt (no formatting drift). ✓
- Scope audit vs merge-base `f5f1e4c`: only in-scope files + guard's own log; exactly one file outside `src/lib` (the plan-designated dev route); `src/lib/index.ts` diff empty. ✓

**Decisive new evidence for the final gate — the diff is a pure deletion.** I filtered every added line in the surviving source: `git diff f5f1e4c...HEAD -- token-cleanup.ts | grep '^+' | grep -v <comments>` → **empty**; the same filter on `token-cleanup.test.ts` yields exactly one line, the trimmed `import { isHtmlOpenTag, shrinkHtmlTokens }`. No live-path line was rewritten anywhere in `src/lib`. This is the strongest available proof that behavior is unchanged, and it is why the green suite is trustworthy rather than merely reassuring.

**Packaged surface re-audited on a clean build** (`dist` removed first): bench module absent, no legacy symbol present. The plan's maintenance note is satisfied against real build output.

**Pre-publication safety check the plan did not ask for, but a merger needs.** The branch is 2 commits behind `origin/main` (`8ba3135` version bump, `ec9a495` `feat(streaming): streamId prop` #350 — both landed after checkpoint 1). A merge could in principle resurrect a dependency on a deleted symbol. Verified it cannot: #350 touches only `SvelteMarkdown.svelte`, `types.ts`, `SvelteMarkdown.stream-id.test.ts`, `StreamIdRaceHarness.svelte` and docs — none reference the deleted symbols — and `git diff --name-only f5f1e4c..origin/main` has **zero overlap** with this PR's files. No conflict, no reintroduced importer.

- Action: **PASS — integrated.** PR <https://github.com/humanspeak/svelte-markdown/pull/351> opened via the `pr` skill against `main` (labels `javascript,enhancement`, assignee `jaysin586`); the `pr` skill's upstream check passed (branch had no upstream; `push -u` repointed it at itself, not `main`). Close-out report written to `008-remove-dead-html-code.guard-report.md`. Guard does not merge — merging is the operator's call. No source code was authored or edited by guard at any point in this plan.
