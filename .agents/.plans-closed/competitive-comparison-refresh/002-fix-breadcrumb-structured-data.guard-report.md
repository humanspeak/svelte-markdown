# Guard report — 002 breadcrumb structured data

**Recommendation: PASS** — shared serializer fixed and consumer production checks pass.
**Reviewed at** `97de3f8` · 2026-09-22 06:46 · **Plan planned at** `0b08a1d`.
**Shared snapshot:** docs-kit `2e6c93b8672a2f670c058efe122a2f245a5c3d3b`,
based on `6ed32d3`, published on `fix/breadcrumb-structured-data` for immutable installation.
PR deferred under dispatch batch workflow; no merge or deployment performed.

## Done criteria

| Criterion                                                                                                                                              | Result | Evidence                                                                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component regression reproduces the defect against original docs-kit and passes against the fixed component; existing docs-kit tests and types pass.   | met    | Original component: 2 expected failures, 4 passes; fixed `pnpm test`: 12/12 pass; type/Trunk hooks pass. [Red](evidence/breadcrumbs/docs-kit-red.log), [green](evidence/breadcrumbs/docs-kit-green.log). |
| The actual docs-kit serializer filters only non-navigable ancestors, preserves final unlinked crumbs, and does not mutate UI breadcrumb context.       | met    | Full source diff reviewed; actual component SSR tests freeze and compare context, test empty/absent input, linked final and multiple unlinked groups.                                                    |
| Consumer uses the verified immutable, fetchable docs-kit Git commit.                                                                                   | met    | Manifest and lock pin 2e6c93; remote feature ref matches; [frozen install](evidence/breadcrumbs/install.log) passes.                                                                                     |
| Registered docs routes pass SSR checks; hydration/client navigation keeps valid, nonduplicated schema; Home emits none; visible grouping is preserved. | met    | [31/31 production browser tests](evidence/breadcrumbs/consumer-final.log), including explicit 301 destination verification for `/docs`.                                                                  |
| Root/docs type checks, Trunk, and diff checks pass with scope preserved.                                                                               | met    | Source snapshot hooks pass; [docs check](evidence/breadcrumbs/docs-check.log): 0 errors, 1 existing unused-CSS warning; diff check clean.                                                                |
| Guard records cross-repository SHAs and local completion separately from deployment and Google validation.                                             | met    | SHAs above; deployment and Google validation pending.                                                                                                                                                    |

## Spirit

The shared component now omits UI-only ancestor labels from schema while retaining
the current page. Consumer navigation data is unchanged. Production tests confirm
Renderers and Advanced remain visible while JSON-LD contains valid destinations
for every ancestor. The defect was corrected at its owner rather than flattened
out of this site's navigation.

## Scope and conduct

Only the amended shared/component/test/docs scope and consumer pin/tests changed.
Guard independently reproduced red and green and read complete source diffs. The
first consumer run caught a test assumption about the intentional docs redirect;
the executor added precise redirect/destination checks and the full rerun passed.
September 22 ownership amendment followed the operator's instruction. No STOP was
skipped. Pre-existing nightly state remains unchanged and uncommitted.

## Residual risk and follow-ups

Deploy the reviewed consumer and coordinate integration of the docs-kit feature
branch. The commit pin is fetchable; it is not a docs-kit release. After deployment,
scan live sitemap docs URLs, obtain Search Console affected URLs, run Rich Results
Test/URL Inspection and request Validate Fix. No claim that Google has cleared the
issue is made. Existing URL construction requires site-relative hrefs and a base
URL without a trailing slash; normalization was outside this fix.
