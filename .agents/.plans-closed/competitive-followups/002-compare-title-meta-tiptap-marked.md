# Plan 002: Rewrite the search title and snippet for /compare/vs-tiptap, /compare/vs-marked and /compare/vs-svelte-exmarkdown

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report. Do not improvise. When done, update the status row for this plan
> in `.agents/.plans/competitive-followups/README.md`, unless a reviewer
> dispatched you and told you they maintain the index.
>
> **Drift check (run first)**: `git diff --stat bdebe69..HEAD -- docs/src/lib/compare-data.ts`
> If the file changed, compare the excerpts below with the live
> `vs-tiptap`, `vs-marked` and `vs-svelte-exmarkdown` entries. A mismatch inside those three entries is
> a STOP condition. Changes elsewhere in the file (for example plan 001
> editing `vs-svelte-streamdown`) are fine.
>
> **Revision 2026-10-28**: Git workflow re-pointed to the shared digest branch `chore/competitive-intel-2026-10-28` (operator's standing rule: digest follow-ups ship as one PR). The reviewer owns git. No change to scope or steps.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Wave**: 1
- **Category**: docs (SEO)
- **Planned at**: commit `bdebe69`, 2026-10-28
- **Tickets**: HUM-3 (`vs-tiptap-title-meta`), HUM-4 (`vs-marked-title-meta`), HUM-5 (`vs-svelte-exmarkdown-title-meta`)

## Why this matters

Google Search Console data, 28 days to 2026-10-20:

- `/compare/vs-tiptap` is the site's highest-impression page (533 impressions)
  with 1 click (0.19% CTR). The query "tiptap svelte" got 178–197 impressions
  and 0 clicks at position ~11–13. The people searching want to **use Tiptap in
  Svelte**. Our title, "Tiptap vs Svelte Markdown: Editor or Renderer?", reads
  as a product comparison they did not ask for. A rich-text editor is an
  explicit non-goal for this library, so the aim is not to win editor users.
  It is to answer their question in the snippet ("Tiptap is the editor; here
  is when you'd want a renderer instead or alongside").
- `/compare/vs-marked` ranks at position ~7 with 167 impressions and 0 clicks
  in two consecutive windows. The query "svelte marked" means "how do I use
  marked in Svelte". The title "marked vs Svelte Markdown: Parser or Svelte
  Component?" frames it as a rivalry. Svelte Markdown _is_ marked in Svelte,
  and the snippet should say so.
- `/compare/vs-svelte-exmarkdown` is the **only** compare page without a
  `seoTitle`, so Google shows the generic default
  "svelte-exmarkdown vs Svelte Markdown | Compare". The page is small: 57
  impressions at position ~5.8 in Sep 1–28 (10 of them from the query
  "svelte-exmarkdown"), and 0 impressions since. Search Console URL Inspection
  (2026-10-28) shows it **is indexed and valid**, so this is not an indexing
  problem. A specific title and snippet is a cheap fix, in line with the other
  compare pages. Nothing beyond that is planned.

Done-when, from the tickets: vs-tiptap CTR > ~1% on ≥1,000 impressions, or
"tiptap svelte" earns clicks. vs-marked earns ≥2 clicks on ≥150 impressions in
a later 28-day window. Those outcomes take weeks to observe and are not this
plan's done criteria.

## Current state

- `docs/src/lib/compare-data.ts` holds every compare page's data as a
  `Competitor` object (type from `@humanspeak/docs-kit`).
- The `@humanspeak/docs-kit` `ComparisonPageV2` component wires SEO like this
  (from `node_modules/@humanspeak/docs-kit/dist/components/ComparisonPageV2.svelte:84-85`):
    ```ts
    seo.title = competitor.seoTitle ?? `${competitor.name} vs ${ours.name} | Compare`
    seo.description = competitor.seoDescription ?? competitor.description
    ```
    The JSON-LD `Article.description` also uses `seoDescription ?? description`.
    The docs-kit type comment says: "`description` doubles as the overview
    paragraph, which is usually too long for a search snippet (~155
    characters)". **`seoDescription` changes only the meta and JSON-LD
    description. It leaves the on-page overview paragraph alone.** No entry
    in this repo uses `seoDescription` yet, but it is a supported optional field.
- `vs-tiptap` entry, `docs/src/lib/compare-data.ts:335-413`:
    ```ts
    slug: 'vs-tiptap',
    name: 'Tiptap',
    seoTitle: 'Tiptap vs Svelte Markdown: Editor or Renderer?',
    tagline: 'Do you need to edit markdown, or just render it?',
    description:
        'Tiptap is a ProseMirror rich-text editor; Svelte Markdown is a zero-config Svelte 5 renderer for read-only markdown. Editing vs rendering — which do you need?',
    ...
    keywords: [
        'tiptap svelte',
        'svelte rich text editor',
        'tiptap vs svelte-markdown',
        'svelte wysiwyg',
        'svelte-tiptap'
    ]
    ```
- `vs-marked` entry, `docs/src/lib/compare-data.ts:513-608`:
    ```ts
    slug: 'vs-marked',
    name: 'marked',
    seoTitle: 'marked vs Svelte Markdown: Parser or Svelte Component?',
    tagline: 'The Engine Under Our Hood',
    description:
        'Compare marked and @humanspeak/svelte-markdown: direct markdown parsing versus a Svelte 5 component layer with renderers, caching, and safety controls.',
    ...
    keywords: [
        'marked js',
        'svelte markdown renderer',
        'marked svelte',
        'marked vs svelte-markdown'
    ]
    ```
- `vs-svelte-exmarkdown` entry, `docs/src/lib/compare-data.ts:689-772`. It has
  **no** `seoTitle` line:
    ```ts
    slug: 'vs-svelte-exmarkdown',
    name: 'svelte-exmarkdown',
    tagline: 'Two Runtime Renderers, Different Engines',
    description:
        'Compare svelte-exmarkdown and @humanspeak/svelte-markdown: unified-based runtime rendering versus marked-powered Svelte 5 renderers and streaming support.',
    github: 'https://github.com/ssssota/svelte-exmarkdown',
    ...
    keywords: [
        'svelte exmarkdown',
        'svelte markdown component',
        'svelte-exmarkdown vs svelte-markdown'
    ]
    ```
- The production title tag is exactly `seoTitle` with no site suffix. The
  prerendered output
  `docs/.svelte-kit/cloudflare/compare/vs-tiptap.html` currently contains
  `<title>Tiptap vs Svelte Markdown: Editor or Renderer?</title>`.

## Commands you will need

| Purpose        | Command                                                                      | Expected on success |
| -------------- | ---------------------------------------------------------------------------- | ------------------- |
| Install        | `pnpm install`                                                               | exit 0              |
| Docs typecheck | `pnpm -C docs check`                                                         | exit 0, 0 errors    |
| Docs build     | `pnpm -C docs build` (fetches GitHub stats over the network; needs internet) | exit 0              |
| Lint / format  | `trunk fmt && trunk check`                                                   | no new issues       |

Do not use `npx prettier` or `npx eslint`. Trunk is the lint authority.

## Scope

**In scope**: `docs/src/lib/compare-data.ts`, **only** the `vs-tiptap`, `vs-marked` and `vs-svelte-exmarkdown` entries.

**Out of scope**:

- The `description`, `tagline`, `features`, `verdict`, and pros/cons fields of
  all three entries. The on-page content is fine; only the search-result surface
  changes. Use `seoDescription` so the overview paragraph is untouched.
- Every other entry. In `vs-svelte-exmarkdown`, change only the three items
  listed in Step 2b. Its content is deliberately left alone, because the page is too low-volume to justify a rewrite.
- `vs-svelte-streamdown`. Plan 001 edits it in parallel.
- docs-kit itself.

## Git workflow

- All work from this batch integrates onto the existing branch
  `chore/competitive-intel-2026-10-28` (the 2026-10-28 digest's state.json
  branch). Digest follow-ups ship as one PR, per the operator's standing rule.
- The dispatching reviewer (guard) owns git. Do NOT create branches, commit,
  push, or open PRs yourself.
- For reference, commit messages use Conventional Commits, e.g. `docs(compare): …` / `feat(mermaid): …`.

## Steps

### Step 1: Retarget vs-tiptap

In the `vs-tiptap` entry:

- Replace `seoTitle` with `'Tiptap in Svelte 5: Editor vs Markdown Renderer'` (47 chars).
- Add, directly below `description`:
    ```ts
    seoDescription:
        'Using Tiptap with Svelte 5? Tiptap is a rich-text editor; Svelte Markdown renders markdown and streaming AI output. See when to use each, or both together.',
    ```
    (155 chars, at the snippet limit. Do not lengthen it.)
- Add `'tiptap svelte 5'` and `'tiptap markdown'` to the end of `keywords`.

**Verify**: `pnpm -C docs check` → exit 0.

### Step 2: Retarget vs-marked

In the `vs-marked` entry:

- Replace `seoTitle` with `'Using marked in Svelte 5: Render Markdown as Components'` (55 chars).
- Add, directly below `description`:
    ```ts
    seoDescription:
        'Using marked in Svelte? Svelte Markdown runs marked for you and renders each token as a Svelte 5 component: no {@html}, safe links, built-in caching.',
    ```
    (149 chars.)
- Add `'svelte marked'` and `'marked svelte 5'` to the end of `keywords`.

**Verify**: `pnpm -C docs check` → exit 0.

### Step 2b: Give vs-svelte-exmarkdown a specific title and snippet

In the `vs-svelte-exmarkdown` entry:

- Add `seoTitle: 'svelte-exmarkdown vs Svelte Markdown: unified or marked?',` (56 chars) directly after `name: 'svelte-exmarkdown',`,
  matching where the other entries put `seoTitle`.
- Add, directly below `description`:
    ```ts
    seoDescription:
        'svelte-exmarkdown uses remark/rehype plugins; Svelte Markdown uses marked with Svelte 5 snippet renderers, LLM streaming, and safe HTML defaults.',
    ```
    (145 chars.)
- Add `'svelte-exmarkdown'` (the hyphenated query form, which is the one GSC
  records) to the end of `keywords`.

**Verify**: `pnpm -C docs check` → exit 0.

### Step 3: Length guard and rendered-output check

```bash
grep -n "seoTitle: 'Tiptap in Svelte 5\|seoTitle: 'Using marked in Svelte 5\|seoTitle: 'svelte-exmarkdown vs\|seoDescription:" docs/src/lib/compare-data.ts
```

Expected: one `seoTitle` line for each of the two retargeted titles, and
exactly three `seoDescription:` lines. Then confirm the length limits:

```bash
python3 - <<'EOF'
import re
src = open('docs/src/lib/compare-data.ts').read()
for m in re.finditer(r"seoDescription:\s*'([^']*)'", src):
    print(len(m.group(1)), m.group(1)[:40]); assert len(m.group(1)) <= 155
for t in ['Tiptap in Svelte 5: Editor vs Markdown Renderer', 'Using marked in Svelte 5: Render Markdown as Components', 'svelte-exmarkdown vs Svelte Markdown: unified or marked?']:
    assert t in src and len(t) <= 60
print('ok')
EOF
```

**Verify**: prints three lengths ≤ 155, then `ok`.

If network access is available, also run `pnpm -C docs build`, then:
`grep -o '<title>[^<]*</title>\|<meta name="description" content="[^"]*"' docs/.svelte-kit/cloudflare/compare/vs-tiptap.html docs/.svelte-kit/cloudflare/compare/vs-marked.html docs/.svelte-kit/cloudflare/compare/vs-svelte-exmarkdown.html`
→ the new titles and descriptions. If the build cannot reach the network,
skip this check and note that in the status row.

### Step 4: Full gate

`pnpm -C docs check && trunk fmt && trunk check`, then `git diff --stat`.

**Verify**: exit 0. The diff touches only `docs/src/lib/compare-data.ts` and
`README.md` (status row).

## Test plan

No red-first test applies. This is static SEO metadata with no runtime
behavior. The Step 3 length guard is the regression check. Real validation is
the GSC CTR outcome tracked on HUM-3 and HUM-4 by the nightly digest.

## Done criteria

- [ ] `grep -c "seoDescription:" docs/src/lib/compare-data.ts` → `3`
- [ ] `grep -c "seoTitle: 'svelte-exmarkdown vs Svelte Markdown: unified or marked?'" docs/src/lib/compare-data.ts` → `1`
- [ ] The two new `seoTitle` strings are present, and the old ones are gone: `grep -c "Tiptap vs Svelte Markdown: Editor or Renderer?\|marked vs Svelte Markdown: Parser or Svelte Component?" docs/src/lib/compare-data.ts` → `0`
- [ ] The Step 3 length script prints `ok`
- [ ] `pnpm -C docs check` exits 0, and `trunk check` reports no new issues
- [ ] Only `docs/src/lib/compare-data.ts` changed (plus the index status row)
- [ ] `README.md` status row updated

## STOP conditions

- `seoDescription` is rejected by the installed docs-kit `Competitor` type
  (a `pnpm -C docs check` error mentioning it). The docs-kit version may have
  changed. Report back and do not fall back to editing `description`.
- The `vs-tiptap`, `vs-marked` or `vs-svelte-exmarkdown` entry no longer matches the excerpts above (for example, exmarkdown already has a `seoTitle`).

## Maintenance notes

- vs-svelte-exmarkdown: if it still shows 0 impressions around 2026-11-25,
  check whether `vs-svelte-streamdown` now serves its queries (both answer
  "which Svelte 5 runtime renderer?"). Treat it as cannibalization then, not as a title problem.
- Review the outcome against GSC no earlier than about 4 weeks after deploy
  (the tickets' Done-when). Expect a lag before Google re-crawls the pages.
- If this works, apply the same intent-first pattern ("Using X in Svelte 5…")
  to the other editor pages that have high impressions and low CTR:
  `vs-milkdown`, `vs-bytemd`, `vs-carta`. Deliberately deferred so this
  change can be measured in isolation.
- Plan 001 edits the `vs-svelte-streamdown` entry of the same file. The hunks
  are disjoint and merge cleanly.
