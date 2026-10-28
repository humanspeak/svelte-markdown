# Guard log: 004 pele-mermaid-engine

## Checkpoint 1 (2026-10-28 12:10), ON TRACK

`8a366c0`. Final close-out after a haiku executor ran the plan in the main checkout (no worktree, because 003's code exists only on the batch branch and harness worktrees start from `main`).

- Scope: 9 paths, all in scope (`mermaid-pele/*`, `package.json`, `pnpm-lock.yaml`, `barrel-optional-deps.test.ts`, `scripts/tree-shaking.mjs`, `README.md`, the marked-extensions svx). `git diff --stat e0fe45f..8a366c0 -- src/lib/extensions/mermaid/` is empty. `grep -c pele src/lib/extensions/index.ts` gives 0.
- pele pinned to 1.10.1, not 1.12.0. `minimumReleaseAge` refused 1.12.0 (published inside the 2-day window), and the executor followed the plan's documented fallback. The peer range is `>=1.10.1`. This is accepted and is the plan's own escape hatch.
- Deviation accepted: `scripts/tree-shaking.mjs` `buildCase` now symlinks `node_modules/pele` into the temp consumer, so an entry that imports `pele/diagrams/*` resolves the way it would in a real app. That strengthens the pele-free negative cases rather than weakening them.
- Deviation accepted: test case 5 uses a `fontFamily` pass-through, because pele 1.10.1 ignores `idPrefix`. The plan allowed this substitution.
- Reproduced: `pnpm test` gives 178 files / 1678 tests passing, with coverage of 97.38% statements, 93.06% branches and 98.3% lines. `pnpm check` gives 0 errors. `pnpm package` exits 0 and `dist/extensions/mermaid-pele/index.js` exists. `pnpm test:tree-shaking` exits 0 with `✓ extensions barrel stays pele-free`, `✓ mermaid renderer stays pele-free` and `✓ pele engine factory`. `pnpm -C docs check` gives 0 errors. Mermaid E2E gives 80/80 (port 4173 confirmed free first).
- Test assertions are real: the sync return is not a Promise, the svg starts with `<svg`, errors for syntax and unregistered types, `<img` is escaped out, option pass-through, and theme-independent output.
- README: the Step 6a move is verified (the snippet-override example and the streaming note now come before `#### Choosing an engine`). The pele subsection attributes its size figures to pele's docs.
- Action: verdict PASS. Status row updated by guard. No PR mid-batch.
