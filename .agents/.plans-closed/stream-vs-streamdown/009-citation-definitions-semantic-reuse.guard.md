# Guard log — 009 citation-definitions-semantic-reuse

## Checkpoint 1 — 2026-09-28 09:59 — ON TRACK (final: PASS, partial vs batch target)

b0fd557 · executor (opus, in-tree) delivered Parts A and B with the dev-only update counter, A/B and vs-Streamdown suites, attribution. Snapshot-committed.

- Guard reproduced: `pnpm test` 160/1192 green (98.57% lines); `pnpm check` 0 errors; `trunk check` clean on five touched source files; greps match; 120 evidence runs, 0 parity mismatches; A/B and vs-Streamdown medians match the report.
- Diff read: `SvelteMarkdown.svelte` reuse-mode dispatch; `Parser.svelte` guarded counter; `parse-and-cache.ts` null-prototype link seed; `streaming-token-reuse.ts` `reuseStableTokenTree`; `incremental-parser.ts` +493 with `parseDefinitionUpdate`/`findCitingRoots`/`relexCitingRoots`/`canTargetDefinitionUpdate` and `MAX_TARGETED_RELEX_SHARE = 0.5`, every helper returning `undefined` → full re-lex fallback.
- Action: README row → DONE (partial vs batch target; numbers recorded); Plan 010 pre-flighted and dispatched next.
