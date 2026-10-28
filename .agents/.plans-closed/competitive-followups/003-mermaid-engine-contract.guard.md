# Guard log: 003 mermaid-engine-contract

## Checkpoint 1 (2026-10-28 11:55), ON TRACK

`3051dc1`. Final close-out after a haiku executor ran the plan in an isolated worktree (second dispatch).

- First dispatch: the worktree was based on `main` (`a560881`) and the plan file wasn't in it, so the executor correctly stopped without editing. Re-dispatched with the absolute plan path in the main checkout (read-only). That was a dispatch-shape problem, not an executor fault.
- Scope: 12 files, all on the in-scope list. `git diff bdebe69 -- src/lib/extensions/mermaid/MermaidRenderer.test.ts` is empty (0 lines), and `markedMermaid.ts` is untouched.
- Reproduced: `pnpm test:only src/lib/extensions` gives 21 files / 247 tests passing, and `pnpm test` gives 177 files / 1663 tests passing with coverage of 97.38% statements, 93.06% branches and 98.3% lines. `pnpm check` gives 0 errors (10 pre-existing warnings, none in changed files). `pnpm package` reports publint "All good!". `pnpm test:tree-shaking` exits 0 and includes `✓ mermaid renderer`. `grep -rn --include='*.ts' "from 'mermaid'" src/lib` finds nothing. No `eslint-disable` or `any` was added.
- E2E: the first run failed on missing firefox-1543 and webkit-2359 binaries, which I installed into the Playwright cache. The second run failed with CONNECTION_REFUSED because a leftover preview server still held :4173 at startup, so Playwright reused it and the new one bound to :4174. The third run, with the port free, gave 80/80 across chromium, firefox, webkit, mobile-chrome and mobile-safari.
- Test assertions are real. They check rendered SVG content, the resolution order via `data-engine`, that the sync engine never touches mermaid mocks, that a stale async result is dropped (shows B, not A), the error text, and the theme context passed to engines.
- Deviation (accepted): the new renderer test calls `vi.useRealTimers()` in `beforeEach`, the same as the existing `MermaidRenderer.test.ts`, because the global setup installs fake timers.
- Plan defect: Step 8 put `#### Choosing an engine` in the middle of the README Mermaid section, so the snippet-override example and the streaming note now sit under it. The plan caused this, not the executor. Action: the operator chose to fold the fix into plan 004 (PLAN AMENDED there, Step 6a).
- Action: verdict PASS. README status row updated by guard. No PR mid-batch.
