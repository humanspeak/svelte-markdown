# Plan 002: Fix missing item URLs in breadcrumb structured data

> Start with a failing regression test, follow the steps, and update the adjacent
> README on completion. Track deployment and Search Console validation separately.
>
> Drift check: `git diff 68985e3..HEAD -- docs/src/lib/docsNav.ts docs/package.json pnpm-lock.yaml docs/src/routes/+layout.svelte docs/playwright.config.ts docs/tests/breadcrumbs.test.ts`.
> Reconcile differences against the current-state excerpts before proceeding.

## Status

- Priority: P1; execute before Plan 001, with no dependency on it
- Effort: S–M
- Risk: Low; the visible breadcrumb trail becomes shorter
- Category: bug / SEO
- Planned at: `68985e3`, 2026-09-22
- Branch: `docs/competitive-comparison-refresh`
- Implementation: TODO
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

## Root cause and selected fix

`docs/src/lib/docsNav.ts:74` defines `buildBreadcrumbs`. The nested-docs branch
currently returns (`:103`):

```typescript
const sectionTitle = sectionBreadcrumbOverrides[section.title] ?? section.title
return [
    { title: 'Docs', href: '/docs/getting-started' },
    { title: sectionTitle },
    { title: itemTitle }
]
```

`docs/src/routes/+layout.svelte` uses docs-kit's RootLayout. Its installed
`BreadcrumbJsonLd` prepends Home and serializes every context breadcrumb, emitting
an item only when href exists:

```typescript
// docs/node_modules/@humanspeak/docs-kit/dist/components/BreadcrumbJsonLd.svelte
...(b.href ? { item: `${config.url}${b.href}` } : {})
```

The installed dependency is pinned in `docs/package.json` to Git tag `2026.8.5`.
Renderers, Advanced, and API are sidebar groups without section landing pages.
The Examples group has a real `/docs/examples` page; however, no intermediate
section is necessary for a valid, consistent Docs → current-page navigation path.

Smallest fix: return linked Docs followed by the current page title for every
matched docs page, omitting section-only group entries. Preserve leaf-title
shortening, sidebar sections, and other route families. Remove unused depth and
section-override code; update the resolver comment. The shared serializer will
continue prepending Home. Both visible and structured breadcrumbs become shorter.

Do not invent missing landing-page URLs, use `#`, or point every intermediate
crumb to the current page. If retaining section labels becomes a requirement,
revise the design to distinguish UI grouping from structured data in docs-kit.
Do not edit node_modules or add a competing BreadcrumbList to this site.

## Scope and conventions

Allowed tracked changes:

- `docs/src/lib/docsNav.ts`: resolver and obsolete helpers/comments.
- `docs/playwright.config.ts` (new): isolated production docs test configuration.
- `docs/tests/breadcrumbs.test.ts` (new): SSR and client navigation regressions.
- This plan and the adjacent README: implementation/validation status and evidence.

Read-only references: root `playwright.config.ts`, `tests/accessibility.test.ts`
for Playwright style, docs root and section layouts, `docs/src/lib/docs-config.ts`,
and installed docs-kit components. No docs Playwright config currently exists.
Root Playwright serves the package test app, which cannot validate docs routes.

Out of scope: dependency upgrades, lockfiles, docs-kit source, library renderers,
other schema types, comparison Plan 001, and nightly competitive state. No public
API or README feature change is needed. Use Trunk for formatting/linting, strict
TypeScript, and no lint-disable comments. No deployment or Search Console writes
are part of implementation.

## Step 1: Add a failing production-output regression

Create a docs Playwright config using the existing root `@playwright/test`
dependency: Chromium only, `testDir: './tests'`, base URL
`http://127.0.0.1:4174`, explicit repository-root web-server cwd, 180-second startup
timeout, and no unknown-server reuse. Use this web-server command:

```bash
pnpm --filter docs build && pnpm --filter docs preview --host 127.0.0.1 --port 4174 --strictPort
```

The config lives under docs so root test discovery remains unchanged. Do not add
dependencies or package scripts. Use the normal build, not deploy/IndexNow.

Create `docs/tests/breadcrumbs.test.ts`. Fetch raw HTML with Playwright's request
fixture; parse application/ld+json scripts, locating BreadcrumbList nodes through
objects, arrays, and `@graph`. Validate only breadcrumb lists, not unrelated
ItemLists. Assert at least two entries, nonempty names, ListItem types, contiguous
one-based positions, and absolute production-site HTTP(S) URLs on every non-final
item. The last item may omit its URL. If present, it must be valid too. Accept
string item URLs or objects with a valid `@id`.

Enumerate deduplicated `/docs` page hrefs from `docsSections`, and the sampled
comparison, example, blog, and home routes above. Require exactly one breadcrumb
list on known content pages and none on home; silently removing all markup must
not pass. Distinguish non-200/redirect failures from schema failures and report
rather than silently skipping routes.

Add hydrated-browser checks and real client navigation between nested docs pages,
then another route family and Home. Use links and assert URL transitions; full
page.goto reloads do not test SPA navigation. Assert valid, nonduplicated JSON-LD
updates with no stale trail on Home. Use retrying assertions rather than sleeps.

**Verify:** `pnpm exec playwright test --config docs/playwright.config.ts` fails
specifically because an intermediate Renderers/Advanced item has no URL. Capture
that red result before editing the resolver. Startup errors are not reproduction.

## Step 2: Simplify the matched-docs breadcrumb trail

Return `[{ title: 'Docs', href: '/docs/getting-started' }, { title: itemTitle }]`
for matched docs pages, preserving existing leaf title overrides. Remove
`sectionBreadcrumbOverrides` if unused and update comments. Keep sidebar groups
and all routes unchanged. Expect Home → Docs → HTML and Home → Docs → Syntax
Highlighting on the two reproduced pages.

**Verify:** the same docs Playwright command now passes; `pnpm --filter docs check`
reports zero errors. Inspect the visible breadcrumbs and confirm sidebar section
labels remain. The final breadcrumb's missing item is deliberately still legal.

## Step 3: Final local verification and review

Run `pnpm check`, `pnpm --filter docs check`, `trunk fmt`, `trunk check`, and
`git diff --check`. The E2E command already exercises the production docs build;
repeat it only for changed inputs or unresolved failures. Inspect the diff for
scope and preserve other JSON-LD types. Do not force-add ignored generated docs.
Record red/green results and mark local implementation complete in the index.

**Verify:** all checks exit 0, regression coverage exists, and changed paths are
limited to scope plus preserved pre-existing user changes. Use a conventional
commit such as `fix(docs): omit non-navigable breadcrumb groups`. Do not stage
nightly state. No new library unit tests are needed: the regression belongs to
the production docs surface and must fail before the fix.

## Step 4: Deployment and Search Console follow-through

After review and authorized deployment, record the deployed commit and check live
SSR output for all docs URLs in the sitemap. Compare with the affected-URL list
from Search Console when access is available. That list is currently unknown;
it need not block fixing the independently reproduced defect.

Run [Rich Results Test](https://search.google.com/test/rich-results) on both
reproduced URLs and Search Console's affected examples. Run URL Inspection's live
test, then the Breadcrumbs issue's Validate Fix action. Record the request date
and eventual status separately from local implementation.

Until Google finishes recrawling/validating, report “deployed; Google validation
pending.” Do not claim the Search Console issue is closed from a local test or
promise ranking gains. Do not initiate deployment or Google actions during this
planning task.

## Done criteria

- [ ] Regression fails before the resolver change and passes afterward.
- [ ] Registered docs routes pass SSR validation; hydration and SPA navigation
      retain valid, nonduplicated breadcrumb data.
- [ ] Only the final breadcrumb may omit item; Home emits no breadcrumb list.
- [ ] Root/docs checks, Trunk, and diff checks pass, with scope preserved.
- [ ] Local implementation status recorded; deployment and Google validation
      remain separately pending until verified.

## STOP conditions and maintenance

Stop and revise if the pinned serializer/resolver has changed materially, if the
reported shape cannot reproduce locally, or if the fix needs shared docs-kit or
unrelated routing changes. Report a gate that fails after two reasonable attempts
rather than weakening assertions. If retaining section hierarchy is required,
resolve real destinations or a separate UI/schema representation first.

Future non-navigable sidebar headings must stay out of structured breadcrumb
ancestors. Keep the final-entry exception in tests to avoid incorrectly changing
already-valid comparison/blog trails. Recheck this contract on docs-kit upgrades.
