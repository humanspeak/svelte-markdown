# Guard log — 009 lint-test-files-and-typed-lint

## Checkpoint 1 — 2026-07-09 13:53 — DRIFTING · PLAN AMENDED

`0418585` · first checkpoint; executor's full working tree snapshotted and reviewed against the whole plan

### Drift check

- `git diff --stat 939f154..HEAD -- eslint.config.mjs` → empty. No source drift since planning. "Current state" excerpt still matches live code.

### Done criteria, re-run by guard (not taken on report)

- `'**/*.test.ts'` removed from top-level `ignores` — confirmed at `eslint.config.mjs:27-31`.
- `no-floating-promises` provably active. Guard ran plan Step 3 itself with three throwaway files, then deleted them (`git status` clean afterward):
    - `src/lib/__guard_scratch.ts:2:5` → `error @typescript-eslint/no-floating-promises`
    - `src/lib/__guard_scratch.test.ts:4:9` → `error` (proves the newly-linted test files reach type info)
    - `src/lib/__GuardScratch.svelte:4:9` → `error` (proves the `.svelte` parser path reaches type info — the plan's stated risk)
- `trunk fmt && trunk check` → exit 0. `trunk check --all` → 574 files, 0 ESLint issues, ~39s.
- `pnpm check` → 0 errors (1004 files). `pnpm test:only` → 142 files, 917 tests, all pass.
- No `eslint-disable` introduced: `git diff 1ba528d..HEAD | grep '^+.*eslint-disable'` → none.
- Batch `README.md` row for 009 flipped TODO → DONE.

### Findings

- **Blanket rule disabling (drift).** `eslint.config.mjs:94-102` sets seven `recommendedTypeChecked` rules to `'off'`: `await-thenable`, `no-unnecessary-type-assertion`, `no-unsafe-{argument,assignment,call,member-access,return}`, `require-await`. The plan's Done criteria require violations be "fixed or justified via Trunk inline ignore"; the maintenance note explicitly tells the reviewer to check "that no rule was blanket-disabled to force green". Turning the rule off is a third path the plan did not sanction. `await-thenable` is the one that bites: it is promise-correctness, it is squarely within `Why this matters` ("promise-heavy streaming library"), and it has exactly **one** report repo-wide — `src/lib/utils/parse-and-cache.ts:128`, `await Promise.all(results)`. That report is very likely a false positive (marked types `walkTokens` as returning `void`, so `Marked.walkTokens`'s result array is typed non-thenable even though async callbacks put real promises in it at runtime — lines 122-124's comment describes the intended behavior, and it holds). The correct remedy per this plan is one `// trunk-ignore(eslint/@typescript-eslint/await-thenable)` with that rationale, not a global `'off'` that also silences every future `await <non-promise>` in this library.
- **Out-of-scope edit.** `.coderabbit.yaml:71` (`labels: ['coderabbit']` → `[coderabbit]`) is a cosmetic yaml requote, incidental to `trunk fmt`. Not in the plan's In-scope list. Harmless, but it is a boundary crossing.
- **Executor edited a plan file.** `008-remove-dead-html-code.md:36` (` ``` ` → ` ```text `) — a markdownlint MD040 fix. Cosmetic, changes no contract text, but plans are guard's to write. Flagged, not escalated.

### Cleared (suspected, then disproved by evidence)

- `rendererKeys.ts:41` `Object.keys(Html) as HtmlKey[]` → `Object.keys(Html)` first read as a public-API type regression (`htmlRendererKeysInternal` is re-exported as `htmlRendererKeys` at `index.ts:106`). It is **not**: `HtmlRenderers` carries an index signature `[key: string]` (`src/lib/renderers/html/index.ts:107`), so `HtmlKey = keyof typeof Html & string` collapses to `string`. The assertion was genuinely unnecessary and its removal is a no-op on the exported type. The retained `as RendererKey[]` on `rendererKeysInternal` is correct and the asymmetry is principled, not arbitrary. Same reasoning clears the `as any` removals in `unsupportedHtmlRenderers.test.ts:59,66`. `tsc --noEmit -p tsconfig.json` is clean, and `src/**/*.ts` (test files included) is inside the checked project.
- `eslint.config.mjs:107-110` `{files: ['*.ts'], ...disableTypeChecked}` reads like a glob that would disable typed rules everywhere. It does not — flat-config `*.ts` matches only repo-root files (`playwright.config.ts`, `vite.config.ts`, `vitest.setup.ts`), which is a deliberate and correct exemption. Proven by the Step 3 scratch file at `src/lib/__guard_scratch.ts` still erroring.
- `void`-marked promises each carry a one-line rationale as the plan required (`MermaidRenderer.svelte:38,45,61`, `incremental-parser.ts:540`, `parse-and-cache.ts:78`, plus the three test routes). `incremental-parser.ts:540` also silently fixes a latent bug: `newTokens.forEach(this.options.walkTokens)` passed `(token, index, array)` into a one-arg callback; the `for…of` rewrite passes only `token`.

### Plan amendment (operator-directed)

Operator instruction: "We dont use eslint... we use trunk fmt and trunk check", then "Please update all the plans for this".

- Plan 009 was the sole remaining plan hardcoding raw ESLint; the batch README's 2026-07-07 revision had converted `pnpm lint` → Trunk everywhere but missed four `pnpm exec eslint .` call sites (commands table, Step 1 verify ×2, Step 3). All four replaced with `trunk check` / `trunk check --all`. Plans 010-012 held no raw ESLint references.
- Step 3 strengthened to require proving the rule fires in all three parser paths (`.ts`, `.test.ts`, `.svelte`), since each can be silently inactive independently — this is what guard actually had to do to trust the criterion.
- Done criteria strengthened, not weakened: added `trunk check --all` (this plan enables repo-wide rules, so a changed-files-only gate under-verifies) and added a criterion requiring every `'off'` rule to be reported with a rationale and violation count. This closes the hole the first finding came through.
- `Planned at` deliberately **not** re-stamped, matching the README's 2026-07-07 precedent: a tooling-command correction changes no source baseline, so the drift check must keep pointing at the audited commit `939f154`.

### Action

Reported to operator. Plan amended per operator agreement (revision notes added to `009-...md` and batch `README.md`).

Not a PASS as it stands. The plan's own maintenance note asks the reviewer to reject blanket-disabled rules, and seven are disabled with no rationale recorded. **To flip to PASS**, the executor should either restore `@typescript-eslint/await-thenable` to `error` and suppress the single `parse-and-cache.ts:128` report with an inline `// trunk-ignore(eslint/@typescript-eslint/await-thenable)` carrying the marked-types rationale, or record a written justification for each of the seven `'off'` rules with its violation count (new done criterion). The `no-unsafe-*` family is a defensible migration-time exemption; `await-thenable` and `require-await` are cheap and on-theme, and should carry an explicit argument if they stay off.

No PR opened — this is a mid-run checkpoint, not `guard final`.

## Checkpoint 2 — 2026-07-09 14:13 — ON TRACK

`0f77f55` · final close-out; executor's corrective work snapshotted, every done criterion re-run, full three-dot diff read

### Corrective work landed

Checkpoint 1's blocking finding is resolved, and the fix paid for itself:

- `eslint.config.mjs:95` — `await-thenable` restored to `['error']`.
- `parse-and-cache.ts:128` — the single false positive suppressed with an inline `// trunk-ignore(eslint/@typescript-eslint/await-thenable)` carrying the marked-types rationale, exactly as the plan's Done criteria require. It is the **only** suppression added anywhere in the diff (`git diff 1ba528d...HEAD -- src tests | grep '^+.*trunk-ignore'` → 1 hit; `eslint-disable` → none).
- Re-enabling the rule caught **four real `await <non-Promise>` sites** the executor then fixed: `tests/issues/issue-192.test.ts:12,17` and `tests/reactivity.test.ts:135,139` awaited a Playwright `Locator`, which is not thenable. Behaviourally inert, but exactly the class of confusion the plan exists to prevent. This vindicates checkpoint 1's call that `await-thenable` was not a free disable.

### Done criteria, re-run against `0f77f55`

- Step 3 re-proved against the _final_ config (it changed since checkpoint 1), this time through the amended plan's own command: `trunk check` on three throwaway files → `no-floating-promises` fires in `.ts` (2:5), `.test.ts` (4:9) and `.svelte` (4:9). Files deleted; `git status` clean.
- `trunk check --all` → 575 files, `✔ No issues`.
- `pnpm check` → 1004 files, 0 errors. `pnpm test:only` → 142 files, 917 tests, all pass.
- `'**/*.test.ts'` absent from top-level `ignores`; batch README row 009 = DONE.

### Rule-disable audit (the criterion added at checkpoint 1)

Six `recommendedTypeChecked` rules remain `'off'`. Guard measured them rather than accepting them, scoped to `src/lib/utils` + `SvelteMarkdown.svelte`:

| Rule                            | Violations (subset) | Assessment                                             |
| ------------------------------- | ------------------- | ------------------------------------------------------ |
| `no-unsafe-member-access`       | 29                  | Migration exemption — driven by marked's `Token` union |
| `no-unnecessary-type-assertion` | 17                  | Stylistic; not correctness                             |
| `no-unsafe-argument`            | 6                   | Migration exemption                                    |
| `no-unsafe-assignment`          | 4                   | Migration exemption                                    |
| `no-unsafe-return`              | 3                   | Migration exemption                                    |
| `require-await`                 | 2                   | Stylistic; an `async` fn without `await` is harmless   |
| `no-unsafe-call`                | 2                   | Migration exemption                                    |

None is promise-correctness. The `no-unsafe-*` family (44 in this subset alone) is the standard, well-understood cost of adopting typed lint against `marked`'s types and `HtmlRenderers`' `[key: string]: Component<any,any,any>` index signature; fixing them is a separate body of work, not this plan's. The one rule where a disable genuinely hid promise risk — `await-thenable` — is now on.

### Findings carried forward (non-blocking)

- `eslint.config.mjs` carries no inline rationale comment for the six remaining `'off'` rules. The rationale and counts now live in the close-out report instead. Recommend a follow-up plan to either fix or comment them.
- `.coderabbit.yaml:71` (`labels: ['coderabbit']` → `[coderabbit]`) — out-of-scope, cosmetic, incidental to `trunk fmt`. Reverting would only make `trunk fmt` redo it.
- Executor edited `008-remove-dead-html-code.md:36` (fence → ` ```text `), a markdownlint fix. Plans are guard's to write. Cosmetic, no contract text changed. Flagged both checkpoints; not escalated.

### Pre-existing condition (not caused by this plan)

`pnpm exec playwright test tests/issues/issue-192.test.ts tests/reactivity.test.ts --project=chromium` → 9 failed locally, all `Test timeout … waiting for getByRole('link', { name: 'image' })`. Guard checked out the **pre-edit** version of `issue-192.test.ts` from `0418585` (the version still carrying `await page.getByRole(...)`, identical to `1ba528d`'s) and re-ran it: **fails identically**. The failure therefore predates this branch and is not attributable to the executor's `await` removals — `await` on a non-thenable `Locator` cannot change behavior. Tree restored, clean. E2E is outside this plan's Done criteria; CI is the authority.

### Action (close-out)

Close-out report written. PASS → PR opened via the `pr` skill. Merging remains the operator's call.
