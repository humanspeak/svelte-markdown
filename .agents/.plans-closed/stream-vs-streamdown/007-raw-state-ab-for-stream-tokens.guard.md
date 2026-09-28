# Guard log — 007 raw-state-ab-for-stream-tokens

## Checkpoint 1 — 2026-09-28 08:58 — ON TRACK (final: PASS)

840b204 · executor (opus, in-tree) delivered Steps 1–5: two-URL A/B runner, DOM-identity guard test, the one-line `$state.raw` change, A/A control, two paired repeats, attribution. Snapshot-committed. Stale 19-hour preview on 4173 killed by guard.

- Guard reproduced: `pnpm test` 160/1177 green (98.5% lines); `pnpm check` 0 errors; `trunk check` clean on the three touched files; done-criteria greps (`:140` match; zero `$state<Token[]>`; zero in-place mutation sites); re-read all `ab-run-*.json`: A/B totals and deltas match the report to the decimal; 80 A/B runs, 0 parity mismatches.
- Diff read: `SvelteMarkdown.svelte` +3/−1 (declaration + comment). Sound.
- Action: README row → DONE (KEPT); Plan 009 pre-flighted and dispatched next.
