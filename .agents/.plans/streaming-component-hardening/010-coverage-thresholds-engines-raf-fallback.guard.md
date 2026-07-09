# Guard log — 010 coverage-thresholds-engines-raf-fallback

## Checkpoint 1 — 2026-07-09 15:06 — ON TRACK

`159ff06` · full executor work for steps 1–4 (coverage thresholds, `engines`, rAF-fallback tests), snapshotted from the working tree.

- All 7 done criteria reproduced independently, not taken on report:
    - `vite.config.ts:18-24` has `reporter: ['lcov', 'text-summary']` and a 4-key `thresholds` object.
    - `pnpm test` → 919 passed, prints coverage summary; Statements 95.98%, Branches 90%, Functions 96.19%, Lines 97.69%.
    - Threshold gate proven live, not inert: `vitest run --coverage --coverage.thresholds.lines=100` → `ERROR: Coverage for lines (97.69%) does not meet global threshold (100%)`.
    - `node -e "…engines.node"` → `>=22`.
    - `pnpm check` → exit 0 (0 errors, 4 pre-existing warnings). `trunk check --no-fix` → "No issues", 4 modified files.
    - `git status` → only the 3 in-scope files + the required batch `README.md`. No out-of-scope edits.
    - `README.md:40` row for 010 flipped `TODO` → `DONE`.
- Cancel-branch test is **not** gamed — verified against the mutation it is supposed to catch: unmount teardown (`SvelteMarkdown.svelte:411-415`) only calls `cancelScheduledStreamFlush()`; it does not clear `pendingStreamAppendBuffer`. So a missing cancel would let the timer run `flushPendingStreamChanges` → `commitPendingAppendBuffer` → parse, tripping `lexSpy`. Confirmed by lcov: `DA:152,1` / `DA:153,1` — the `kind:'timeout'` cancel branch and its `clearTimeout` are each hit exactly once, only reachable via the new unmount test.
- `requestAnimationFrame` restoration satisfied by the pre-existing `afterEach(() => vi.unstubAllGlobals())` at `SvelteMarkdown.test.ts:143-145`; both new tests sit inside that `describe`. No leak into other tests (full suite green).
- **Plan defect (minor)**: the plan's "Current state" excerpt names `scheduleAppendFlush` / `flushPendingAppendChunks`; live code (post-007/008/009) calls these `scheduleStreamFlush` / `flushPendingStreamChanges` (`SvelteMarkdown.svelte:219,202`), and the guard condition now also tests `pendingStreamFullSource`. The drift check (`git diff --stat 939f154..HEAD -- …`) reports 185 changed lines in `SvelteMarkdown.svelte`, so the STOP condition "don't match the excerpts" fired textually. Every _material_ fact the plan relies on still holds (raf branch → `setTimeout(…, STREAM_BATCH_FALLBACK_MS=16)` → `kind:'timeout'`, branch untested), so proceeding was substantively right — but the executor proceeded silently rather than reporting the mismatch.
- **Threshold headroom (soft)**: `functions: 96` against a measured 96.19% leaves ~1 uncovered function of slack (581/605 = 96.03% passes; 580/605 = 95.87% fails). The plan asked to "round down to avoid flakiness" with a ~3-point example; an integer round-down here is honest-but-brittle and will trip CI on an unrelated helper. `lines: 97` (0.69% slack) is similarly tight.
- Action: reported both to the operator. No plan amendment made — guard does not amend without explicit agreement, and neither finding lowers the bar the plan set.

## Checkpoint 2 — 2026-07-09 15:10 — PLAN AMENDED

`fbc1ea5` · operator approved amending the plan for both checkpoint-1 findings. No source code touched; the executor still owes one edit.

- Amended the stale excerpt: `Why this matters` §3, `Current state`, and the STOP conditions now name `scheduleStreamFlush` / `flushPendingStreamChanges` and quote the live `SvelteMarkdown.svelte:219-241` body (including the `pendingStreamFullSource` guard). Rationale: **plan defect**, not executor fault — plans 007–009 renamed these after `939f154`, so the drift STOP fired on a cosmetic diff. The STOP wording now says a pure rename with identical branch structure is reportable-but-not-blocking; only a behavioural change in raf/timeout scheduling halts.
- Amended Step 1, Scope, Done criteria, and Maintenance notes: floors must now sit **≥1 percentage point below measured**, not a bare integer round-down. Recorded the measured figures at `fbc1ea5` (statements 95.98 / branches 90.00 / functions 96.19 / lines 97.69) and the resulting floors `{ statements: 95, branches: 89, functions: 95, lines: 96 }`. Rationale: `functions: 96` left exactly one uncovered function of headroom, making the gate a tripwire for unrelated work instead of a rot detector.
    - This **loosens two floors but does not lower the plan's bar**: the work already passes at 96/97, so the amendment launders no failure. It serves Step 1's own stated goal ("round down to avoid flakiness"), which the integer round-down defeated.
- Added a live-gate verification to Step 1 and Done criteria (`--coverage.thresholds.lines=100` must fail), so a future executor cannot satisfy the criterion with inert config.
- Corrected `STREAM_BATCH_FALLBACK_MS` provenance: `src/lib/utils/streaming-chunks.ts:3`, not `SvelteMarkdown.svelte:82`.
- Re-stamped `Planned at` → `fbc1ea5`; drift check re-baselined to the same SHA. Batch `README.md` row for 010: `DONE` → `AMENDED — needs threshold slack`.
- Action: plan amended with operator agreement. **010 is re-opened**: the executor must change `vite.config.ts` thresholds to `functions: 95, lines: 96` (statements 95 and branches 89 already carry ≥1 point). Guard did not make that edit — it is source. Re-run `guard hardening 10 final` afterward for the close-out gate.

## Checkpoint 3 — 2026-07-09 15:10 — OUT-OF-SCOPE (operator-directed, sanctioned)

`b372498` · `package.json` — removed the `lint`, `format`, and `lint:fix` scripts.

- **Not plan 010 work.** Plan 010's scope admits `package.json` only to add `engines`. The operator directed this cleanup explicitly; it is recorded here so the `final` scope audit reads it as sanctioned rather than as "while I was in there" drift. Committed separately from the plan snapshot (`159ff06`) so the two remain separable.
- Rationale: `CLAUDE.md:73` already forbids running prettier/eslint directly, but the scripts' presence in `package.json` kept inviting agents to run `pnpm lint` anyway. `pnpm lint` (`prettier --check . && eslint .`) fails on ~34 pre-existing unformatted generated files; `pnpm format` rewrites them and pollutes the diff.
- `lint:fix` removed alongside `format` — it was defined as `pnpm run format && eslint . --fix` and would have broken on a `format`-only removal.
- Verified no callers before removal: `grep` over `.github/`, `.husky/`, `scripts/` → no hits; the pre-commit hook runs `trunk fmt` / `trunk check` / `pnpm check`. `package.json` re-validated (21 scripts, none of the three remain).
- Follow-up not taken: `CLAUDE.md:73-79` and `AGENTS.md:73-79` still describe `pnpm lint` / `pnpm format` as commands to avoid; they now describe scripts that no longer exist. `docs/package.json:16` retains its own `lint:fix` (separate workspace, untouched).
- Action: reported to the operator; guard authored this at the operator's explicit direction, outside the plan.

## Checkpoint 4 — 2026-07-09 15:35 — VIOLATING

`45d665f` · doc cleanup committed; executor work found **uncommitted** in the working tree, reviewed in place (not yet snapshotted).

- Trunk-only cleanup finished at operator direction (`45d665f`): `docs/package.json` lost the same `lint`/`format`/`lint:fix` trio, and `CLAUDE.md:73-79` now states the scripts are deliberately absent instead of warning against commands that no longer exist. `AGENTS.md` is a **symlink** to `CLAUDE.md`, so it inherits the fix — no second edit needed. Still outside plan 010; same sanctioned-not-drift status as Checkpoint 3.
- **Executor addressed the amendment correctly**: `vite.config.ts` now reads `functions: 95, lines: 96` (was 96/97), matching the amended Step 1 floors. In scope, serves `Why this matters`.
- **VIOLATION — out-of-scope edit**: `src/lib/SvelteMarkdown.issue-328.test.ts:441` bumps a test timeout `15_000` → `30_000`. That file is not in plan 010's in-scope list (`vite.config.ts`, `package.json`, `SvelteMarkdown.test.ts`), and Done criterion "No files outside the in-scope list are modified" now fails.
    - The bump is **unmotivated**: the guarded test, "matches static heading ids for a large streamed document", passes in **1551ms against the 15000ms limit** (`vitest run src/lib/SvelteMarkdown.issue-328.test.ts` → 22 passed, 5.68s total). ~10× headroom; nothing was timing out. The full suite also passed with `15_000` in place at Checkpoint 1.
    - It is **signal-weakening**: that test exists to prove heading-id work stays proportional to newly appended headings (issue #328). Doubling its time ceiling raises the bar at which a future proportionality regression would surface. This is the "criterion satisfied by loosening the test" shape, applied pre-emptively to a test the plan never asked the executor to touch.
- No tampering: the plan file and this log are unmodified by the executor; the `README.md` row flip to `DONE` is sanctioned by the plan's own "update your row when done" instruction.
- Action: reported to the operator. Guard did **not** revert the timeout — that is source. The executor should restore `15_000` at `SvelteMarkdown.issue-328.test.ts:441`, or state why 15s is genuinely insufficient. Until then `guard hardening 10 final` will fail the scope audit.

## Checkpoint 5 — 2026-07-09 15:39 — PLAN AMENDED

`7a64121` · reclassified Checkpoint 4's violation after the executor supplied the missing evidence; operator approved the amendment.

- **Correction to Checkpoint 4 (guard error).** Two claims there were wrong, and the log is append-only, so they are corrected here rather than rewritten:
    1. "The bump is unmotivated — 1551ms against a 15000ms limit." That measurement came from an **isolated** run (`vitest run <file>`), which does not reproduce the failing condition. Under full-suite coverage the same test takes **13510ms** (`pnpm test` → `matches static heading ids for a large streamed document 13510ms`), i.e. 90% of budget, ~1.5s margin. The executor's ~16s report on a loaded machine is consistent. Checkpoint 1's green `pnpm test` passed by landing under the wire, not because the timeout was comfortable.
    2. "It is signal-weakening — that test proves heading-id work stays proportional." Wrong test. The #328 proportionality guarantee is asserted by **"keeps slugger work proportional to newly appended headings across repeated flushes"** (26ms, untouched). The 15s test asserts streamed ids equal static ids on a large document; its timeout is a harness limit, not an assertion. Raising it loosens nothing the test verifies.
- **Reclassified: executor drift → plan defect.** Applying the skill's test — _is the plan wrong about reality, or the work wrong about the plan?_ — the plan is wrong about reality. It demands `pnpm test` pass under coverage as a Done criterion while an existing test sits at 90% of its timeout precisely _because_ coverage instrumentation is enabled (~4× runtime: 3.1s → 13.5s). The advisor at `939f154` could not have known this; only execution surfaced it. Reverting to `15_000` would leave the Done criterion unsatisfiable-by-construction, which is why "revert and record blocked" was rejected.
- **This amendment does not lower the bar.** No assertion is weakened, no criterion dropped, no failing work laundered. `30_000` is ~2.2× the observed 13.5s — headroom, not a number tuned to just barely pass. The executor's edit was right on the merits and wrong only on procedure: it crossed a scope boundary silently instead of stopping to report, which is what made Checkpoint 4's VIOLATING verdict correct **as to process** even though its reasoning about harm was not.
- Amended: `Scope` now admits `src/lib/SvelteMarkdown.issue-328.test.ts` for the **per-test timeout only** (assertions/fixtures/other timeouts explicitly excluded), with a new out-of-scope clause forbidding generalizing the exemption to any other test — a second marginal test is a STOP-and-report, not a precedent. Added a maintenance note recording the ~4× coverage overhead so nobody trims the margin back, and flagging a future third raise as a regression signal rather than a timeout problem. Re-stamped `Planned at` → `7a64121`.
- Action: plan amended with operator agreement. The executor's working-tree state (`vite.config.ts` at `functions: 95, lines: 96`; issue-328 timeout `30_000`) is now fully in scope. Nothing further is owed; `guard hardening 10 final` can snapshot and run the close-out gate.

## Checkpoint 6 — 2026-07-09 15:47 — ON TRACK (close-out, PASS)

`8abbed9` · final snapshot: amended coverage floors + issue-328 timeout + README row. Working tree clean afterward.

- All 9 done criteria re-run and reproduced. `pnpm test` → 142 files / 919 tests pass, summary printed. Gate proven live: `--coverage.thresholds.lines=100` → exit 1. `pnpm test:only` → 0, `pnpm check` → 0, `trunk check --no-fix` → "No issues" (9 files). Both rAF tests pass (10ms / 6ms). `README.md:40` → `DONE`.
- **Second amendment independently vindicated at review time**: "matches static heading ids for a large streamed document" ran **15637ms** this pass — it would have exceeded the old `15_000` limit outright. The executor's flake report was accurate; Checkpoint 4's "unmotivated" characterization (measured in isolation) was wrong, as corrected in Checkpoint 5.
- Drift check clean: `git diff --stat 7a64121..HEAD -- vite.config.ts package.json src/lib/SvelteMarkdown.svelte` → only `vite.config.ts`. `SvelteMarkdown.svelte` untouched, so the plan's "test the fallback, don't change it" boundary held.
- Scope audit (`git diff --stat main...HEAD`, 9 files): all in-scope, guard artifacts, or the operator-directed lint/format removal logged at Checkpoints 3–4. No unsanctioned out-of-scope file. No tampering — the executor never edited the plan or this log.
- **Criterion defect disclosed, not amended away**: the Checkpoint-2 rule "every floor ≥1 percentage point below measured" contradicts the literal block it prescribed — `statements: 95` vs measured 95.98% is 0.98pt. The executor followed the numbers guard gave it. The rule also uses the wrong unit: percentage-point slack is denominator-dependent, and `statements` in fact carries the **largest** absolute headroom of the four (18 statements vs functions' 7). Purpose met; recorded as a follow-up in the report rather than edited into agreement, since amending a plan to make its own work pass is the anti-pattern guard exists to refuse.
- Action: **PASS**. Close-out report written; PR <https://github.com/humanspeak/svelte-markdown/pull/353> opened via the `pr` skill against snapshot `8abbed9`. Guard stops here — merging is the operator's.
