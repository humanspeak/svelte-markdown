# Plan 002: Fix missing item URLs in breadcrumb structured data

> Start with a failing regression test, follow the steps, and update the adjacent
> README on completion. Track deployment and Search Console validation separately.
>
> Drift check: `git diff 0b08a1d..HEAD -- docs/src/lib/docsNav.ts docs/package.json pnpm-lock.yaml docs/src/routes/+layout.svelte docs/playwright.config.ts docs/tests/breadcrumbs.test.ts`.
> Reconcile differences against the current-state excerpts before proceeding.

## Status

- Priority: P1; execute before Plan 001, with no dependency on it
- Effort: S–M
- Risk: Medium; shared serialization fix with consumer integration
- Category: bug / SEO
- Planned at: `0b08a1d`, 2026-09-22
- Branch: `docs/competitive-comparison-refresh`
- Implementation: DONE locally; see guard report
- Deployment / Google validation: pending

## Problem and verified evidence

The owner received a Search Console critical Breadcrumbs notice for the property
`https://markdown.svelte.page/`: missing `item` in `itemListElement`. The notice
contains no affected URLs. The property URL is not proof that the homepage itself
is broken.

Live server-rendered HTML inspected on September 22 reproduced the defect:

| URL path                             | Observation                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------ |
| `/docs/renderers/html-renderers`     | Home → Docs → Renderers → HTML; intermediate Renderers lacks item              |
| `/docs/advanced/syntax-highlighting` | Home → Docs → Advanced → Syntax Highlighting; intermediate Advanced lacks item |
| `/docs/getting-started`              | Only final breadcrumb lacks item; valid shape                                  |
| `/compare/vs-svelte-streamdown`      | Only final breadcrumb lacks item                                               |
| `/examples/github-alerts`            | Only final breadcrumb lacks item                                               |
| `/blog/rendering-markdown-in-svelte` | Only final breadcrumb lacks item                                               |
| `/`                                  | No BreadcrumbList emitted; no breadcrumb defect observed                       |

The HTML-renderer page's final two entries are:

```json
[
    { "@type": "ListItem", "position": 3, "name": "Renderers" },
    { "@type": "ListItem", "position": 4, "name": "HTML" }
]
```

[Google's requirements](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb#structured-data-type-definitions)
allow `item` to be omitted on the final entry only. A BreadcrumbList needs at
least two entries with the required names and positions. A meaningful navigation
path need not mirror every URL segment. Invalid markup affects breadcrumb
eligibility, not necessarily the page's eligibility for ordinary search listings.

## Revised ownership and implementation contract

> Revision 2026-09-22: The operator explicitly requested fixing docs-kit where
> necessary rather than a consumer workaround. The shared serializer treats
> UI-only grouping labels as schema ancestors. Fix that boundary in docs-kit,
> preserve the site's visible hierarchy, and verify the consumer against the
> exact dependency commit. This supersedes the earlier local resolver flattening.
> Baselines: svelte-markdown `0b08a1d`; docs-kit `6ed32d3` (fresh origin/main).
> Only guard edits plan/status/logs and commits. Executors never commit.

## Scope

Docs-kit `/Users/jasonkummerl/Github/docs-kit`, branch
`fix/breadcrumb-structured-data` from `6ed32d3`:

- `src/lib/components/BreadcrumbJsonLd.svelte`.
- A focused internal utility under `src/lib/utils/` if separating pure breadcrumb
  construction meaningfully simplifies testing; no new public export required.
- Focused breadcrumb tests and fixtures under `src/lib/components/` or
  `src/lib/utils/`, following existing `node:test` conventions.
- `package.json` test command only, if needed to include the new tests.
- README breadcrumb documentation describing UI-only ancestors and final crumbs.

Svelte-markdown:

- `docs/package.json` and `pnpm-lock.yaml`: pin the verified docs-kit Git commit.
- `pnpm-workspace.yaml` only if pnpm's existing exact Git build-approval entry must
  be updated for the new dependency commit; preserve the approval policy.
- `docs/playwright.config.ts` and `docs/tests/breadcrumbs.test.ts` (new).
- Plan files, evidence, index, and guard reports: guard only.

Keep `docs/src/lib/docsNav.ts`, visible hierarchy, docs-kit context types, unrelated
JSON-LD, other dependencies, package renderer source, and nightly state unchanged.
No node_modules edits, local patches, symlinks, duplicated JSON-LD, or invented
breadcrumb destinations. Do not deploy or operate Search Console in this batch.
If dependency installation requires the docs-kit commit to exist remotely, guard
may publish the verified feature branch with an explicit same-name refspec to
make the immutable pin reproducible; never push main, merge, or create a release.

## Step 1: Reproduce the shared component defect

In docs-kit, add regression coverage using existing Node test conventions and the
installed Svelte compiler/runtime, without adding a test framework. Tests must
exercise the actual BreadcrumbJsonLd output (SSR through a small context fixture
is acceptable), rather than duplicating the production mapping in tests. A pure
helper can have additional tests but cannot replace the component integration
check. Include linked Docs, unlinked Renderers, and final unlinked HTML.

Assert Renderers does not appear as a structured-data ancestor, that Home and
Docs retain real absolute item URLs, and that final HTML may omit item. Ensure
positions are contiguous after filtering. Test empty input, linked final crumb,
multiple unlinked intermediate groups, and normal already-valid trails. UI context
must remain unchanged. Test a trailing slash on the base URL and absolute hrefs
if URL normalization is touched; don't broaden into unrelated sanitization work.

First run the regression against the original component and preserve the actual
failure. The guard will independently reproduce red and green; tests should run
against the original component too, not fail merely for a missing new helper.
Do not implement the fix until the missing-item regression is demonstrated.

Commands: `pnpm install --frozen-lockfile` if needed, `pnpm test`, `pnpm check`,
`trunk fmt`, `trunk check`. Extend the existing test script to run new breadcrumb
tests as well as `src/lib/vite/*.test.mjs`; retain build-before-test behavior.

## Step 2: Fix docs-kit's serialization boundary

Skip non-final breadcrumbs without a usable destination when generating schema
entries. Retain the final current-page breadcrumb even if unlinked; the original
UI breadcrumb array and Header components are untouched. Number the filtered list
contiguously after prepending Home. Empty context emits no BreadcrumbList.
Use real item URLs, never `#` or a fabricated URL for a grouping label. Preserve
existing valid output and the schema's last-item exception.

Verify `pnpm test` now passes and `pnpm check` has no errors. Guard snapshots the
source, runs independent verification, and reviews the entire diff before making
the feature commit installable by the consumer. Use Trunk for formatting/linting,
not raw Prettier/ESLint. Replace touched legacy eslint-disable comments with the
repository's Trunk suppression convention where needed.

## Step 3: Pin the fix and add production consumer regressions

Pin docs-kit's verified immutable Git commit in `docs/package.json` and regenerate
only its required lockfile resolution changes. Preserve the pnpm release-age and
build-approval policies. No local dependency substitutions in the final result.

Add a dedicated docs Playwright config using the existing root Playwright
installation: Chromium, tests under `docs/tests`, base URL 127.0.0.1:4174, explicit
repository-root server cwd, 180-second startup timeout, no unknown-server reuse.
Its server command is `pnpm --filter docs build && pnpm --filter docs preview
--host 127.0.0.1 --port 4174 --strictPort` (one line).

Test SSR JSON-LD for every deduplicated registered docs route plus the comparison,
example, blog, and home samples in the evidence table. Obtain the route inventory
without importing Svelte-only modules into unsupported Node execution. Recursively
locate BreadcrumbList in objects, arrays, or @graph; don't validate other ItemLists
as breadcrumbs. Assert exactly one list on content pages, none on Home, >=2
ListItems, nonempty names, contiguous positions, valid absolute production-site
URLs on all non-final items. Final item may omit URL; supplied item can be a URL
string or object with @id. Report non-200s/redirect anomalies, don't silently skip.

Add hydrated-browser and actual client-navigation checks between nested docs and
another section then Home, with no stale/duplicate schema. Assert visible
Renderers/Advanced grouping labels remain: this verifies the fix is in docs-kit
instead of a consumer workaround. Use link clicks, URL assertions, retrying
assertions, and no arbitrary sleeps. Match root Playwright conventions while
keeping its package-test configuration unchanged.

Verify `pnpm exec playwright test --config docs/playwright.config.ts`,
`pnpm --filter docs check`, `pnpm check`, `trunk fmt`, `trunk check`, and
`git diff --check`. The E2E command includes a production docs build. No library
runtime unit-test additions required. Preserve ignored generated docs output.

## Done criteria

- [x] Component regression reproduces the defect against original docs-kit and
      passes against the fixed component; existing docs-kit tests and types pass.
- [x] The actual docs-kit serializer filters only non-navigable ancestors,
      preserves final unlinked crumbs, and does not mutate UI breadcrumb context.
- [x] Consumer uses the verified immutable, fetchable docs-kit Git commit.
- [x] Registered docs routes pass SSR checks; hydration/client navigation keeps
      valid, nonduplicated schema; Home emits none; visible grouping is preserved.
- [x] Root/docs type checks, Trunk, and diff checks pass with scope preserved.
- [x] Guard records cross-repository SHAs and local completion separately from
      deployment and Google validation.

## Post-deployment follow-through

After a separately authorized deployment, record the deployed commit, scan live
sitemap docs URLs, and obtain the actual Search Console affected-URL list. Run
Rich Results Test on the reproduced pages and Google's affected examples, then
URL Inspection's live test and Breadcrumbs Validate Fix. Record request date and
eventual status. Until Google's recrawl/validation completes, report deployed
with validation pending, not that Search Console has cleared the issue.

## STOP conditions and maintenance

Stop for inaccessible executor tooling after the retry budget, material baseline
drift, a required unrelated source/dependency change, inability to reproduce the
actual defect, or a verification failure after two reasonable attempts. Route
source fixes through the executor. A shared docs-kit defect is now explicitly
in scope and must not be worked around in consumer navigation.

Preserve schema final-entry semantics on future docs-kit upgrades and keep the
production-site tests as a regression boundary for shared infrastructure.
