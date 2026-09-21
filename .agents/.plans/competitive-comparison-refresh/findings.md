# Competitive comparison findings

Verified 2026-09-21 against freshly fetched `origin/main` (`1767041`, package
version 1.9.1). Branch: `docs/competitive-comparison-refresh`.

This records the three findings reported on September 17 and still open on
September 21. It is research and planning, not a benchmark rerun or a claim that
the comparison has been corrected.

## Evidence and priority

| Finding                                    | Impact                                      | Effort | Fix risk                              | Confidence | Local evidence                                                                                                        |
| ------------------------------------------ | ------------------------------------------- | ------ | ------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------- |
| URL-safety wording overstates the wildcard | Misrepresents competitor defaults           | S      | Low                                   | High       | `docs/src/lib/compare-data.ts:120`, `:194`                                                                            |
| Highlighting engine is stale               | Names a dependency removed in v4            | S      | Low                                   | High       | `docs/src/lib/compare-data.ts:147`                                                                                    |
| Performance and DOM counts use v3.1.2      | Current comparative advantage is unverified | M      | Medium: measurement and compatibility | High       | `docs/src/lib/compare-data.ts:98`, `:104`, `:169`; `package.json` devDependency; `.competitive-intel/config.json:143` |

### URL safety

The current cell says `Configurable prefixes (allow all by default)` and its note
only identifies the `["*"]` default. That conflates unrestricted origins with
unrestricted protocols.

The [v4.2.0 URL transformer](https://github.com/beynar/svelte-streamdown/blob/4.2.0/src/lib/utils/url.ts)
limits wildcard protocols to HTTP, HTTPS, mailto, and tel. The
[v4.2.0 component](https://github.com/beynar/svelte-streamdown/blob/4.2.0/src/lib/Streamdown.svelte)
defaults both prefix lists to `['*']`. The
[v4.0.1 release](https://github.com/beynar/svelte-streamdown/releases/tag/4.0.1)
added mailto/tel under the default; javascript/data/vbscript remain blocked.

Proposed cell: `Configurable prefixes + default protocol allowlist`.
Proposed note: `The default ["*"] permits HTTP/HTTPS URLs across origins and
mailto:/tel: links; it blocks javascript:, data:, and vbscript:. Prefix lists
can restrict destinations further.`

Remove the related unrestricted-origin con from `consThem`: arbitrary HTTP(S)
origins alone do not establish a disadvantage. Review the related `Stricter URL
and attribute sanitization` pro and `stricter security defaults` verdict language;
use concrete descriptions of our hooks rather than an unproven overall security
ranking. No full sanitizer or runtime security change is proposed.

### Highlighting

The current cell says `Opt-in Shiki component + copy button`.
The [v4.0.0 release](https://github.com/beynar/svelte-streamdown/releases/tag/4.0.0)
replaced Shiki with synchronous, SSR-compatible `@tanstack/highlight`.
The [v4.2.0 README, Bundle Optimization](https://github.com/beynar/svelte-streamdown/blob/4.2.0/README.md#-bundle-optimization)
still requires explicitly supplying the optional Code component. The opt-in
description remains accurate; the engine name is wrong.

Proposed cell: `Opt-in @tanstack/highlight component + copy button`.
Our own Shiki extension remains correctly named and is outside this correction.

### Benchmark freshness

The dependency and recorded benchmark baseline are both exactly 3.1.2. Fresh npm
metadata and the [latest release](https://github.com/beynar/svelte-streamdown/releases/tag/4.2.0)
confirm 4.2.0. This is **one major-version transition**, not two.

Affected claims include the 2–4× burst speedup, frame-paced tie near 59 updates/s,
2,821 versus 3,480 descendant elements, and the derived 19% DOM reduction in
`prosUs`. Old version-qualified observations are historical, not evidence for
4.2.0. Upstream's v4.0.0 parsing-performance claims use a different workload and
cannot replace our measurements.

The existing production harness is usable:

- `scripts/stream-compare-bench.mjs` defaults to one warmup and five measured runs
  per renderer/scenario; prints raw runs and summary JSON.
- `src/routes/test/stream-compare/+page.svelte:48` defines three burst scenarios
  (10/50/200 KB) and one 50 KB frame-paced scenario.
- The page supplies cumulative strings to both renderers. It does not measure
  the imperative `writeChunk()` API or parser time in isolation.
- The competitor mount disables animation and sets `code`, `mermaid`, and
  `table` controls to false. It does **not** supply the optional Code component;
  syntax highlighting is therefore absent on both sides. Keep that parity.
- v4.2.0 adds table fullscreen controls, but the existing `table: false` setting
  already disables that entire toolbar, per its release notes.
- `domNodes` actually counts descendant **elements** with `querySelectorAll('*')`.
  It is not a byte-size or memory measurement.
- The script checks final normalized text lengths within 5%, not semantic
  equality, and merely logs page errors. A successful exit alone is insufficient
  if the log contains browser errors or the rendered fixture is incomplete.
- JSON metadata contains time, URL, iteration counts, and user agent, but no
  package versions, commit, OS, or CPU. Record those alongside the run.

The follow-up should pin 4.2.0 exactly, run the production benchmark interactively,
archive evidence, update all affected claims from measured values, and only then
advance `measured_against` and clear the finding. Keep nightly runs report-only.

## Other competitors: no correction indicated

Fresh metadata was fetched once at `2026-09-21T14:33:51Z` using the competitive
intel skill's package fetcher. All four configured competitor/watchlist requests
succeeded. Relevant observations:

| Package           | Latest | Svelte peer | Latest publication | GitHub pushed date | Archived |
| ----------------- | ------ | ----------- | ------------------ | ------------------ | -------- |
| svelte-streamdown | 4.2.0  | ^5.0.0      | 2026-09-14         | 2026-09-14         | No       |
| svelte-exmarkdown | 5.0.2  | ^5.1.3      | 2025-08-09         | 2026-09-20         | No       |
| svelte-markdown   | 0.4.1  | ^4.0.0      | 2023-12-25         | 2024-07-17         | No       |

Sources: [Streamdown npm metadata](https://registry.npmjs.org/svelte-streamdown/latest),
[Exmarkdown npm metadata](https://registry.npmjs.org/svelte-exmarkdown/latest),
[legacy npm metadata](https://registry.npmjs.org/svelte-markdown/latest),
[Exmarkdown repository metadata](https://api.github.com/repos/ssssota/svelte-exmarkdown),
[legacy repository metadata](https://api.github.com/repos/pablo-abc/svelte-markdown).

Exmarkdown's Svelte 5 and active-maintenance framing remains consistent with its
peer range and recent repository activity; recent repository activity is not a
new package release. The legacy package's Svelte 4/dormant framing also remains
consistent. Neither repository is archived. This is not a complete compatibility
test or a review of every feature claim on those pages.

## Persistence and scope

The pre-existing nightly update to `.competitive-intel/state.json` is preserved
with this findings commit, including its original snapshot time and unrelated
SEO/gap observations. Those unrelated observations were not independently audited
here. Only the incorrect major-version count was corrected. The three findings
remain open and `benchmark_valid` remains false.

`docs/src/lib/compare-data.ts` is the source for the rendered comparison and its
generated Markdown/LLM mirrors (`docs/vite.config.ts`). The generated mirrors are
ignored by `docs/.gitignore`; regenerate and inspect them during implementation,
without force-adding them. This scoped review did not audit the library runtime,
the other comparison pages, SEO, or open GitHub issues.
