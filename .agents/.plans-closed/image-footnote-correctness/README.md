# Image recovery and footnote correctness

> CLOSED 2026-09-09 — Plans 001, 002 and 003 PASS. Delivered image source recovery,
> footnote content/navigation correctness, interactive T3 demos and browser tests.
> Branch: `fix/image-footnote-correctness`; runtime/demos committed and verified.
> Local demo server remains running. Operator may open a PR when ready; T3 inline
> preview visibility needs operator confirmation because its API reports hidden
> despite open/show requests (see Plan 003 report).

Generated with the improve skill on 2026-09-09 against commit `aeaa3c3`.
Rebased on freshly fetched main `db41ab0` on 2026-09-09 at the operator's request;
in-scope runtime files are unchanged, and the package is now 1.9.0.
Execution branch: `fix/image-footnote-correctness`.
The user selected these two topics following a markstream release comparison;
no further selection or implementation approval is needed to produce these
plans. Both runtime fixes and the interactive browser demonstrations are implemented and independently verified.

## Execution order and status

| Plan                                 | Title                                            | Priority | Effort | Depends on | Status |
| ------------------------------------ | ------------------------------------------------ | -------- | ------ | ---------- | ------ |
| [001](001-image-recovery.md)         | Recover images after source changes              | P1       | S      | None       | DONE   |
| [002](002-footnote-correctness.md)   | Preserve content and correct footnote navigation | P1       | L      | None       | DONE   |
| [003](003-browser-demonstrations.md) | Inspect fixes in interactive browser test pages  | P1       | S      | 001, 002   | DONE   |

Status values: TODO, IN PROGRESS, DONE, BLOCKED (reason), REJECTED (reason).
Each executor must read its whole plan and record actual red/green gate results
before marking DONE. Plans 001 and 002 are independent; execute 001 first for a small
fix and easier review. Both touch different README sections, so coordinate that
file if implementation happens concurrently. Plan 002's content-preservation
step precedes its streaming/navigation work internally. Plan 003 follows both fixes.

## Vetted findings

| Finding                                              | Category    | Impact                                                                                          | Effort         | Fix risk | Confidence                    | Evidence                                                                        |
| ---------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------- | -------------- | -------- | ----------------------------- | ------------------------------------------------------------------------------- |
| Image state survives URL replacement                 | Correctness | A successful replacement remains styled as failed; loaded state leaks into pending replacements | S              | LOW      | HIGH                          | `src/lib/renderers/Image.svelte:35`, `:74`                                      |
| Footnote scanner consumes following blocks           | Correctness | Paragraphs and headings silently disappear, including appended content                          | M within 002   | MED      | HIGH                          | `src/lib/extensions/footnote/markedFootnote.ts:59-64`                           |
| Repeated refs share one DOM ID/backlink              | Correctness | Ambiguous fragment targets and no return path to later occurrences                              | M/L within 002 | MED      | HIGH                          | `src/lib/extensions/footnote/FootnoteRef.svelte:9`, `FootnoteSection.svelte:20` |
| Duplicate definitions become duplicate keyed entries | Correctness | Ambiguous definitions and potential duplicate-key rendering errors                              | S/M within 002 | MED      | HIGH for entries/key conflict | `src/lib/extensions/footnote/markedFootnote.ts:66`, `FootnoteSection.svelte:16` |

Plan 002 combines its related findings because boundaries, deduplication,
occurrence metadata, and integration tests share one correctness contract.

## Verification performed during planning

- `pnpm test:only src/lib/renderers/Image.test.ts src/lib/extensions/footnote --reporter=dot`
  passed: 4 test files, 41 tests. The existing Image initial-lazy capture warning
  was emitted. No regression tests were added to source during this audit.
- A read-only Node/Marked probe using the current tokenizer confirmed that
  `[^n]: Note.\n\nAfter paragraph.\n\n# Heading` becomes one section whose raw
  consumes everything while its rendered footnote text is only `Note.`.
- The same probe confirmed adjacent duplicate labels remain duplicate entries.
  The Svelte duplicate-key exception itself was not executed during planning.
- Source review confirmed repeated refs use identical `fnref-{id}` IDs and
  image error/load state never resets on href changes.
- Full coverage, build, browser E2E, and typecheck were not run during planning;
  the plans require executor verification. Existing test infrastructure is usable.

## Recon and scope

Svelte 5, TypeScript, Marked 18, pnpm 11, Vitest/jsdom, SvelteKit/package tooling,
and Trunk were inspected, along with README, CLAUDE.md, CI workflows, and relevant
streaming/cache code. No CONTRIBUTING or ADR/CONTEXT/DESIGN/PRODUCT document was
found in the searched paths. The only existing plan artifact was an unrelated
Shiki spike report, so this is a new initiative, not a duplicate batch.

This was a focused correctness/test review of image and footnote behavior.
Mermaid, wider architecture, dependency/security posture, performance against
competitors, and the remainder of the codebase were not audited. The operator explicitly requested carrying and committing the existing
`.competitive-intel/config.json` and `state.json` analysis updates on this branch.

## Findings considered and rejected or deferred

- Generic renderer rewrite for streaming completion: no separate defect was
  established. Existing stable key/reuse code already protects many cases;
  include focused footnote completion regressions instead.
- Make footnotes tail-window-safe: rejected. Cross-block relationships require
  conservative full reparsing; existing tests intentionally enforce it.
- Image placeholders, skeletons, reserved dimensions, and retry UI: deferred;
  useful visual/API work, but not required to recover on source change.
- Global automatic footnote namespaces: deferred because legacy fragment IDs
  are observable behavior. This batch isolates computation per instance while
  retaining the existing need for applications to namespace separate documents.
- Rich Markdown in footnote bodies, automatic numbering, and global endnotes
  relocation: deferred; these change the extension's feature contract.
- Count image-alt tokens as rendered footnote refs: rejected. Marked produces
  inline children for alt text, but the default image renderer does not render
  those children; counting them would create ghost backlinks.
- Direct Markstream patch transplant: rejected. Its Vue fix uses a different
  parser/component model; these plans are grounded in this repository's bugs.

## Execution evidence

Executors: append concise actual red failures, green commands, coverage results,
and remaining limitations here. Do not substitute planned commands for runs.

### Plan 001 — DONE, reviewed 415df2e (2026-09-09)

- Guard reproduced both intended baseline failures, then 4 focused files / 52 tests passed.
- Trunk and svelte-check passed (0 errors, 3 existing warnings).
- Full coverage passed with `pnpm test --reporter=dot --maxWorkers=2`: 152 files / 1,034 tests; statements 96.89%, branches 91.34%, functions 97.96%, lines 97.89%.
- Default full-suite concurrency first timed out one existing heading test; bounded-worker retry retained assertions, timeout, and coverage settings.
- `pnpm build` passed on separate retry including packaging and publint; first packaging process was killed with exit 137 after the application build completed.
- Whole implementation diff reviewed; no dependency, public prop, sanitizer, Parser, or keying changes. See the adjacent guard report.
- Plan 002 preflight rebased its drift anchor to reviewed image snapshot 415df2e and documented usable direct Vitest / unavailable companion pnpm.
- Operator requested browser test pages in T3 after completion; prepare a separate scoped demonstration handoff while Plan 002 executes.

### Plan 002 — DONE, reviewed 57f144d (2026-09-09)

- Executor observed all 3 intended red failures / 27 passing before runtime edits. Guard read the complete final diff and preserved assertions.
- Guard found and dispatched one correction for fixture types/token narrowing and a Trunk false positive on ephemeral scratch Set state; normal snapshot hooks then passed.
- Independent focused gate: 5 files / 80 passed; streaming guards: 4 files / 100 passed. Both use `--maxWorkers=2` after a default-worker focused run lost a worker with no assertion failure.
- Independent full coverage: 154 files / 1,081 passed; statements 96.88%, branches 91.68%, functions 98.05%, lines 97.93%. Thresholds, dependencies and test timeout unchanged.
- Independent Trunk/check/build/diff gates passed; check reports 0 errors / 3 existing warnings; build includes package and publint validation.
- Guard additionally exercised the actual Marked CRLF lexer boundary: continued body, following paragraph and heading preserved.
- Plan 003 preflight confirms all three demo/test paths are new and anchors to 57f144d. The operator requested these pages in T3; runtime fixes remain unchanged.

### Plan 003 — DONE, reviewed 43cf7b6 (2026-09-09)

- Two new real-library demo pages and five Playwright cases; exactly the planned three files, no runtime changes.
- Guard found and dispatched one correction for an ambiguous paragraph locator, SSR hydration readiness, a missing UI each key, unused CSS selector and globally applied body styles. Assertions remain substantive.
- Independent sequential Trunk/check/build/browser/diff gates passed. Check: 0 errors / 3 existing warnings. Build includes package/publint. Chromium: 5/5 passed in 4.8 seconds.
- T3 tab_c loads `/test/footnote-correctness`; tab_d loads `/test/image-recovery`. Both received open/show requests, and T3 Code (Nightly) was foregrounded.
- Manual T3 evidence: broken image naturalWidth 0/error true -> recovered 150/error false; appending prose retains exact image node. First reference targets fn-repeat; second backlink targets fnref-repeat:ref:2. Completion keeps 7/7 chunks, 2 refs, 2 backlinks, following paragraph and heading; reset returns the initial document.
- T3 reports its underlying tabs as hidden despite open/show requests. macOS denied fallback assistive UI access; operator visibility confirmation was requested. Both tabs and direct local URLs remain available. No browser verification was claimed solely from status text.
- Earlier Checkov scan on carried JSON stalled and its exact process was stopped. Normal final Trunk and commit hooks subsequently passed without disabling rules.
