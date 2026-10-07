# Hybrid preparser implementation batch

> CLOSED 2026-10-06 — Plans001–005 PASS, all DONE. Delivered synchronous
> preparsed-array SSR, production SSR/hydration regressions, an advisory HTML
> routing design, lexical-aware literal masking and authored snippet/root
> placement. Final source22cd4dc:1470 tests, coverage gates pass,0 type errors,
> Trunk/build/publint pass and10 browser cases across five projects pass.
> Archived by conductor after independent guard verification. No push or PR.
> Maintainer next decisions: routing design D1–D7 and a separate implementation
> plan; packaging/productionization and deferred compiler limits remain below.

Created 2026-10-06 after a read-only improve audit. User selected dispatch to
Claude Opus 5.5. Scope is the recommended set: audit findings1,2,3,8 and an
HTML-routing design spike. Conductor/guard owns plans, index, commits and reports;
executors own in-scope implementation. Run serially on the current branch.

## Execution order and status

| Plan | Title                                   | Priority | Effort | Depends on | Status |
| ---- | --------------------------------------- | -------- | ------ | ---------- | ------ |
| 001  | Preparsed SSR with async context        | P1       | S      | none       | DONE   |
| 002  | Production hydration regression         | P1       | S      | 001        | DONE   |
| 003  | HTML-routing design report              | P1       | M      | none       | DONE   |
| 004  | Context-aware literal masking           | P1       | M      | 002, 003   | DONE   |
| 005  | Svelte declaration scope/root placement | P1       | M      | 004        | DONE   |

## Dependency notes

Recommended serial order is 001→002→003→004→005. 004 may not start until 002 is
DONE, even though003 is its architectural dependency: the production test is
its integration gate. 005 uses 004's lexical changes; rebaseline source anchors
with a dated revision after predecessor PASS. Design 003 is advisory and does
not authorize implementing HTML routing. No PR until the user asks; no push.

## Baseline

Proof checkpoint e6195d0, branch investigate/issue-372-md-preprocessor.
Observed prior to dispatch: 1441 tests pass, coverage 97.52/92.96/98.28/98.71,
zero type errors/three existing warnings, Trunk/build/publint pass. Pre-existing
import.meta.env packaging warning permitted. Do not infer executor green from
this historical baseline; guard reruns each plan's done criteria.

## Considered and deferred

- Generated identifier collisions, GFM bare autolinks, leading indented script
  examples and original-wrapper metadata escaping: confirmed findings, outside
  the selected batch; do not silently fix them.
- JavaScript regex/division heuristic and code-span re-pairing approximation
  remain bounded experimental behavior; TypeScript in template expressions and
  snippet parameters is unsupported. Only runes is accepted in root options.
- General component binding analysis, nested-static/compiled HTML routing and
  dynamic HTML adapters remain separate work specified by design003. That
  design was verified as an artifact; its proposed routing is unimplemented.
- Nested Markdown, styles, source maps, HMR, YAML, consumer package entry points
  and compressed bundle comparisons: separate productionization work.
- Quadratic matching for recreated token arrays: existing runtime performance
  debt; immutable compiled module arrays do not exercise that replacement path.
- Native authored HTML bypassing sanitizer hooks: documented trusted application
  source contract, not an untrusted-runtime XSS finding; design003 addresses
  customization/routing deliberately.
- Dependencies audit flagged tooling advisories; reachability was not vetted
  and no dependency-upgrade plan is included here.

## Guard records

Each plan gets its own .guard.md log and .guard-report.md close-out. Status
values:TODO, IN PROGRESS, DONE, BLOCKED, REJECTED. Only conductor updates them.
