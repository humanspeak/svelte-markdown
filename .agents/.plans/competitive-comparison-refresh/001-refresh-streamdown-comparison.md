# Plan 001: Refresh the Streamdown comparison with current evidence

> Execute each step and its verification before continuing. Honor the STOP
> conditions. Update the adjacent README status when complete.
>
> Drift check: `git diff f7d3a60..HEAD -- package.json pnpm-lock.yaml docs/src/lib/compare-data.ts scripts/stream-compare-bench.mjs src/routes/test/stream-compare/+page.svelte .competitive-intel/config.json .competitive-intel/state.json`.
> The findings commit intentionally updates state. Preserve that snapshot and
> inspect any newer nightly changes; do not restore state to the baseline.

> Revision 2026-09-22: Dispatch preflight rebaselines source to `f7d3a60`.
> Plan 002 legitimately changed the docs-kit lockfile resolution; comparison data,
> Streamdown pin and harness are unchanged. Preserve the unrelated September 22
> nightly state diff. The guard runs installation/lockfile generation and browser
> checks outside the executor sandbox; source edits remain executor-owned.
> Evidence is authored here while active, then retired with the batch under
> `.agents/.plans-closed/competitive-comparison-refresh/evidence/`; use that final
> path in durable resolution references. Latest registry version rechecked: 4.2.0.

## Status

- Priority: P1
- Effort: M (roughly half a day including measurements and review)
- Risk: Medium for benchmark comparability; low for copy corrections
- Depends on: none
- Category: docs / dependency migration / performance validation
- Planned at: `f7d3a60`, 2026-09-22, package version 1.9.1
- Branch: `docs/competitive-comparison-refresh`
- Implementation: DONE locally; see guard report

## Why this matters

Three September 17 findings remain open: the page names the wrong highlighting
engine, overstates permissiveness of URL defaults, and presents performance and
DOM measurements made against Streamdown 3.1.2 while 4.2.0 is current. Correct
the factual copy and replace current performance positioning with reproducible
4.2.0 measurements. A slower or tied result is acceptable; preserving the old
advantage is not a completion requirement.

This plan authorizes no product feature changes. The benchmark is a deliberate
interactive development task, never a new nightly job.

## Current state and conventions

`docs/src/lib/compare-data.ts` exports `competitors: Competitor[]`. Edit only the
object with `slug: 'vs-svelte-streamdown'`. Follow its existing feature objects,
single-quoted strings, and optional `note` pattern:

```typescript
// docs/src/lib/compare-data.ts:119
{
    name: 'URL Safety Defaults',
    us: 'Protocol allowlist + attribute sanitization',
    them: 'Configurable prefixes (allow all by default)',
    note: 'Svelte Streamdown exposes link and image prefix controls; their documented default is ["*"].'
}
```

Other affected locations in that object:

- Lines 98–107: measured performance and DOM rows (2–4×, roughly 59 updates/s,
  2,821 versus 3,480 descendant elements).
- Lines 147–150: `Opt-in Shiki component + copy button`.
- Lines 169–170: duplicate speedup and 19% DOM-reduction claims in `prosUs`.
- Line 173, line 194, and the verdict: comparative security wording.

`package.json` pins `devDependencies['svelte-streamdown']` to `3.1.2`.
`.competitive-intel/config.json` has one benchmark entry for this page, also
measured against 3.1.2. State records validation against 4.2.0, an old benchmark
baseline, `benchmark_valid: false`, and three open findings. Validation against
a version means the research checked it, not that the benchmark ran.

`src/routes/test/stream-compare/+page.svelte:223` mounts:

```svelte
<SvelteMarkdown source={content} streaming />
<!-- The alternative branch mounts: -->
<Streamdown
    {content}
    animation={{ enabled: false }}
    controls={{ code: false, mermaid: false, table: false }}
/>
```

Both receive cumulative content; neither enables a syntax highlighter. The
competitor's rich Code component still requires an explicit `components` prop
in 4.2.0. The existing `table: false` also disables the new fullscreen toolbar.
Preserve corpus, pacing, renderer order, and settings to retain comparability.

The benchmark script defaults to one warmup and five measured iterations per
renderer for four scenarios. It prints a final JSON block after `=== JSON ===`.
It checks normalized output lengths within 5%, but logs browser errors without
failing and does not prove semantic equivalence. DOM counts are descendant
elements, not all DOM nodes or memory usage. The corpus reaches at least its
target size; report actual `sourceBytes` alongside target size.

The docs build generates ignored Markdown comparison mirrors and `llms-full.txt`
from the same comparison data (`docs/vite.config.ts`, `docs/.gitignore`). Check
those outputs, but commit the source rather than generated mirrors.

Project conventions: Svelte 5, strict TypeScript, pnpm 11.9.0, Node >=22 (24 is
the project pin), Trunk for formatting/linting. No direct Prettier/ESLint calls,
no lint-disable comments. No full DOM sanitizer, fetching feature, or editor
work. README feature/API updates are unnecessary because this adds no public API.

## Scope

Tracked files allowed to change:

- `package.json`: only the Streamdown devDependency.
- `pnpm-lock.yaml`: resolution changes required by that upgrade.
- `docs/src/lib/compare-data.ts`: only the Streamdown object.
- `.competitive-intel/config.json`: only the Streamdown benchmark provenance.
- `.competitive-intel/state.json`: only Streamdown comparison validation and
  resolution evidence; preserve other nightly data and closed-gap history.
- `.agents/.plans/competitive-comparison-refresh/README.md`: execution status.
- New evidence files under `.agents/.plans/competitive-comparison-refresh/evidence/`.

Read, but do not change, the benchmark script and route. If v4 requires harness
changes, stop and propose a separately testable amendment. All library source,
tests, CI, other competitor objects, root README, nightly scheduler, and shared
skill files are outside scope. Do not push, deploy, publish, or open a PR without
an instruction to do so.

## Commands

Run commands from the repository root unless specified.

| Purpose                            | Command                                                  | Expected success                           |
| ---------------------------------- | -------------------------------------------------------- | ------------------------------------------ |
| Install baseline                   | `pnpm install --frozen-lockfile`                         | Exit 0, no tracked changes                 |
| Upgrade exact benchmark dependency | `pnpm add -Dw --save-exact svelte-streamdown@4.2.0`      | Exact 4.2.0 manifest and lock resolution   |
| Root types                         | `pnpm check`                                             | Zero errors                                |
| Docs types                         | `pnpm --filter docs check`                               | Zero errors                                |
| Production package and test app    | `pnpm build`                                             | Exit 0, including publint                  |
| Production server                  | `pnpm preview --host 127.0.0.1 --port 4173 --strictPort` | Listening on 4173; leave running           |
| Benchmark                          | `pnpm perf:stream-compare`                               | Four scenarios, two renderers, JSON output |
| Docs generation/build              | `pnpm --filter docs build`                               | Exit 0; regenerated mirrors                |
| Unit coverage                      | `pnpm test`                                              | Pass existing coverage gates               |
| Formatting / lint                  | `trunk fmt` then `trunk check`                           | No remaining findings                      |

## Steps

### 1. Correct the two factual claims and narrow security positioning

Use these primary sources, pinned to the version being compared:

- [v4.0.0 release](https://github.com/beynar/svelte-streamdown/releases/tag/4.0.0):
  Shiki replaced by synchronous, SSR-compatible `@tanstack/highlight`.
- [v4.2.0 README](https://github.com/beynar/svelte-streamdown/blob/4.2.0/README.md#-bundle-optimization):
  optional Code import is still required.
- [v4.2.0 URL implementation](https://github.com/beynar/svelte-streamdown/blob/4.2.0/src/lib/utils/url.ts)
  and [v4.0.1 release](https://github.com/beynar/svelte-streamdown/releases/tag/4.0.1):
  wildcard permits HTTP/HTTPS plus mailto/tel, blocking javascript/data/vbscript.

Replace the highlighting cell with
`Opt-in @tanstack/highlight component + copy button`.
Replace the URL cell with `Configurable prefixes + default protocol allowlist`.
Use this note: `The default ["*"] permits HTTP/HTTPS URLs across origins and
mailto:/tel: links; it blocks javascript:, data:, and vbscript:. Prefix lists
can restrict destinations further.`

Remove `Link and image prefix controls allow all origins by default` from
`consThem`; it does not establish a comparative disadvantage. Replace the
`Stricter URL and attribute sanitization enabled by default` pro with
`Default URL and attribute sanitizers with customizable hooks`. Replace
`and stricter security defaults` in the verdict with
`and configurable URL and attribute sanitization`. Leave the specific `us`
feature cell and our own Shiki description intact.

**Verify:** `pnpm --filter docs check` exits 0. Run
`rg -n 'allow all by default|Opt-in Shiki component|Link and image prefix controls allow all origins|Stricter URL and attribute|stricter security defaults' docs/src/lib/compare-data.ts`;
expect no matches (rg exit 1). Review `git diff -- docs/src/lib/compare-data.ts`;
only the targeted object changes.

### 2. Pin 4.2.0 and validate the existing harness

Install the baseline if needed, then run the upgrade command above. Inspect the
lockfile delta; leave the workspace's release-age policy and other direct
dependencies unchanged. Verify the installed package, not just the manifest:

```bash
node -e "const fs = require('node:fs'); const p = JSON.parse(fs.readFileSync('package.json')); const d = JSON.parse(fs.readFileSync('node_modules/svelte-streamdown/package.json')); if (p.devDependencies['svelte-streamdown'] !== '4.2.0' || d.version !== '4.2.0') process.exit(1); console.log(d.version)"
pnpm check
pnpm build
```

**Expected:** `4.2.0`, zero type errors, production build exits 0. Do not change
`measured_against` yet. If imports/props are incompatible, stop before altering
the harness or measuring a different workload.

### 3. Run the complete production comparison and retain provenance

Start the preview command in a dedicated terminal/session. Do not reuse an
unknown server. Verify the route with
`curl --fail http://127.0.0.1:4173/test/stream-compare` (HTTP 200). Install
Chromium with `pnpm exec playwright install chromium` if it is missing.

Create the evidence directory. Record in `evidence/README.md`: UTC capture date,
`git rev-parse HEAD`, `git diff --stat`, exact package versions, `node --version`,
`pnpm --version`, OS/CPU, power mode, browser version/user agent, commands,
renderer settings, warmups and iterations. Name this an append-only cumulative
prop comparison with animation, controls, and highlighting off. It does not
measure imperative chunk ingestion or pure parsing throughput.

Run two full suites sequentially under the same conditions; retain both even if
the first is unfavorable. In the following command use `run-1.log`, then repeat
with `run-2.log`:

```bash
STREAM_COMPARE_URL=http://127.0.0.1:4173/test/stream-compare STREAM_COMPARE_ITERATIONS=5 STREAM_COMPARE_WARMUPS=1 pnpm perf:stream-compare > .agents/.plans/competitive-comparison-refresh/evidence/run-1.log 2>&1
```

Extract each final JSON block into `run-1.json` / `run-2.json` (split the log at
`=== JSON ===`, then parse the remaining JSON). Retain raw per-iteration data.
Check all of these before using a number:

- Exactly four scenarios: `10kb-tiny-chunks`, `50kb-small-chunks`,
  `200kb-medium-chunks`, `50kb-frame-paced`.
- Exactly two renderer results per scenario; five runs each, one warmup.
- All elapsed/throughput values finite and positive; output lengths and element
  counts positive. Both renderers receive equal `sourceBytes` per scenario.
- No `[page error]` in either log, no output-length mismatch, and no truncated
  JSON. A script exit of 0 is necessary but not sufficient.
- Inspect each renderer's final output on the production route: headings,
  paragraph, link, nested list, blockquote, code, and table must be present;
  no controls or syntax highlighting should be enabled. Compare DOM structure
  when hashes differ; do not relax the 5% length guard to obtain a pass.

**Verify:** both commands exit 0 and each JSON file parses with
`python3 -m json.tool <path>`; the field/count checks above pass. Record the
checks and semantic spot-check in the evidence README. A second suite is a
planned repeatability check; do not rerun repeatedly to select a favorable result.

### 4. Replace every numerical claim from the captured results

In the evidence README, tabulate each suite/scenario's two `totalMsMedian`,
`p95MsMedian`, `chunksPerSecMedian`, and `domNodes` summaries, plus the ratio
`theirs.totalMsMedian / ours.totalMsMedian`. Values above one favor ours, below
one favor theirs. DOM reduction is `100 * (1 - ours.domNodes / theirs.domNodes)`;
a negative value is an increase. DOM summary comes from the last run, not a
median: verify per-run element counts are stable before publishing a count.

Update the two measured feature rows, their notes, and both measured `prosUs`
entries together. Cite 4.2.0, the date, production Chromium, workload and settings.
Use the 50 KB small-chunks scenario for the DOM claim, checking consistency with
the frame-paced 50 KB result. Derive frame-paced throughput separately.

Keep ratios scenario-specific if their direction or magnitude differs; do not
combine a frame-paced near-tie with the burst range. Round conservatively and
never round a value below 2 into a `2× faster` claim. If repeated results are
inconsistent, publish per-suite ranges or remove the generalized speedup.
If no speed or DOM advantage survives, remove its `prosUs` entry. Do not tune
the renderer to recover the previous 2–4× or 19% claim.

**Verify:** every published number maps to an evidence field or the documented
formula. `rg -n '3\.1\.2|2–4|2,821|3,480|19%' docs/src/lib/compare-data.ts`
must find no old Streamdown claim unless a coincidentally unchanged number is
independently supported and identified in the evidence README.

### 5. Close findings only after copy and measurements agree

Set the benchmark config's `measured_against['svelte-streamdown']` to `4.2.0`.
In `state.compare_validation['svelte-streamdown']`, retain
`validated_against_version: '4.2.0'`, set `validated_on` to the actual verification
date, set `benchmark_measured_against: '4.2.0'`, set `benchmark_valid: true`, remove
the three resolved strings from `findings`, and replace `findings_status` with
a dated resolved status pointing to the tracked evidence directory. Retain any
new, unrelated finding added by a concurrent nightly run.

Do not change `last_run` or replace the full snapshot: this is not a nightly
digest run. Do not move page-correction findings to `closed_gaps`, which records
product capability decisions. Leave the nightly report-only rule intact.

**Verify:** parse both JSON files and assert the manifest pin, config measured
version, and state benchmark version are all `4.2.0`, and `benchmark_valid` is
true. Review the state diff for unrelated removal. If measurement failed, keep
the benchmark baseline at 3.1.2 and the benchmark finding open; factual-copy
findings may close independently, but the plan remains BLOCKED with the reason.

### 6. Verify the docs output and run the final gates

Run `pnpm --filter docs build` and `pnpm --filter docs check`. Inspect the
generated `docs/static/compare/vs-svelte-streamdown.md` and the Streamdown section
of `docs/static/llms-full.txt` for the new wording and measured values. Open the
rendered comparison using `pnpm --filter docs preview --host 127.0.0.1 --port 4174`
and inspect `/compare/vs-svelte-streamdown`; verify rows, notes, pros/cons, and
verdict display the same facts. Use normal `build`, not deployment or IndexNow.

Run `pnpm check`, `pnpm test`, `trunk fmt`, and `trunk check`. Existing coverage
thresholds in `vite.config.ts` are 95% statements, 89% branches, 95% functions,
and 96% lines; keep them unchanged. Review `git diff --check` and the full diff.
Restore only unrelated generated tracked changes created by this run after
review; never discard pre-existing user changes. Do not force-add ignored mirrors.
Stop the preview sessions you started. Mark this plan DONE and commit logical
units with conventional messages, e.g. `docs: refresh Streamdown comparison`.

**Verify:** all gates pass, generated/rendered copy agrees, and
`git diff --name-only` contains only scope-listed paths. Commit hooks must pass.

## Test plan

No new permanent unit tests are needed for factual copy or the devDependency pin;
there is no library runtime fix requiring a red-first test. Existing type/build
checks validate dependency compatibility. The production benchmark, semantic
output inspection, and saved runs validate measurement behavior. Existing unit
coverage checks protect the baseline. If the harness needs a behavioral change,
amend scope and add a failing reproduction before that change; do not silently
skip that requirement. Timing ratios are observations, never CI pass thresholds.

## Done criteria

- [x] All three version records and installed Streamdown are exactly 4.2.0.
- [x] Two complete suites, 40 measured runs each, parseable JSON and provenance
      are committed under `evidence/`; no page errors or missing output.
- [x] Every numerical page claim reconciles to captured results.
- [x] Stale highlighting and URL wording is gone; generated mirrors agree.
- [x] `pnpm build`, root/docs checks, docs build, `pnpm test`, and Trunk pass.
- [x] Only scope-listed tracked files changed; the plan index is DONE.
- [x] Three findings are resolved with evidence; other competitor state is preserved.

## STOP conditions and maintenance

Stop and report if 4.2.0 is unavailable, a newer release makes this target stale,
in-scope code has materially drifted, the installed version cannot be verified,
the existing route cannot compile, page errors occur, output checks fail, or the
work requires a source/harness/CI change. Report a gate that fails twice after a
reasonable attempt rather than weakening it. Missing evidence must never be
replaced by upstream marketing numbers or the old baseline.

The next competitor upgrade must repeat measurement before advancing
`measured_against`. Recheck the optional Code import, table controls, actual
corpus size, and output-equivalence limitations each time. Keep generated docs
derived from the canonical comparison object. Broader feature parity, changes
to our sanitizer, and benchmark-harness improvements are deferred.
