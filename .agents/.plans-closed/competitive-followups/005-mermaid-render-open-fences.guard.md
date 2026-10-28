# Guard log: 005 mermaid-render-open-fences

## Checkpoint 1 (2026-10-28 12:28), ON TRACK

`6981bda`. Final close-out after a haiku executor ran the plan in the main checkout.

- Scope: every changed path is on the in-scope list. Forbidden files (`incremental-parser.ts`, `tail-window.ts`, `mermaidEngine.ts`, `mermaid-pele/`) are untouched. `MermaidRenderer.test.ts` and `MermaidRenderer.engine.test.ts` are unmodified (0-line diff). `incremental-parser.test.ts` has additions only. In `markedMermaid.test.ts`, the only removed lines are the helper signature, which gained an optional `options` argument as the plan allowed. Existing call sites are unchanged.
- Design fidelity: the closed-fence token is byte-identical. The open-fence branch exists only behind `renderOpenFences`, keeps only complete lines, and sets `closed: false`. For `closed = true`, the renderer's display order (diagram, then error, then loading) is equivalent to before.
- Reproduced: `pnpm test` gives 179 files / 1690 tests passing, with coverage of 97.4% statements, 93.11% branches and 98.31% lines. `pnpm check` gives 0 errors. `pnpm package && pnpm test:tree-shaking` exits 0. Mermaid E2E (three files) gives 95/95 across 5 projects. The streaming E2E with `--repeat-each=4` gives 60/60, so it is stable.
- Test assertions are real. Parity is checked against a fresh one-shot lex (fresh options) at every 5-char prefix, and the tail window stays enabled. The renderer cases cover the skipped engine, last-good retention, and no error box while open. The E2E records `diagram-before-done` and an error-box observer.
- Deviation accepted: the E2E `beforeEach` waits for `networkidle` before clicking, so the click doesn't happen before hydration. This matches `imperative-streaming.test.ts`, and no assertion changed.
- Note: README says snippet overrides receive `closed`, but no test covers that (it follows mechanically from the `{...token}` spread). Recorded as a follow-up.
- Action: verdict PASS. Status row updated by guard. No PR mid-batch.
