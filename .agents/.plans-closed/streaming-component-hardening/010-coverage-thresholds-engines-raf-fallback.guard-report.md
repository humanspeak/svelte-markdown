# Guard report — 010 coverage-thresholds-engines-raf-fallback

**Recommendation: PASS** — every criterion reproduced green; the coverage gate is proven live, and the rAF-fallback tests provably fail if the code they cover is removed.
**Reviewed at** `8abbed9` · 2026-07-09 15:47 · **Plan planned at** `7a64121` (originally `939f154`; re-stamped by two amendments)
**Integrated** — PR <https://github.com/humanspeak/svelte-markdown/pull/353> opened via the `pr` skill for the reviewed snapshot commit `8abbed9`. Merging is the operator's call; guard never merges.

## Done criteria

| Criterion                                                                     | Result                                       | Evidence                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vite.config.ts` coverage has `thresholds` (4 keys) + `text-summary` reporter | met                                          | `vite.config.ts:18-24` — `reporter: ['lcov','text-summary']`, `{statements:95, branches:89, functions:95, lines:96}`                                                                                                                                        |
| …with every floor ≥1 percentage point below its measured value                | met in substance; letter fails on one metric | Slack: branches 1.00, functions 1.19, lines 1.69 — **statements 0.98** (95.98 − 95). See "Criterion defect" below; absolute headroom is 18 statements, the largest of the four.                                                                             |
| `pnpm test` prints a coverage summary and enforces thresholds                 | met                                          | 142 files / **919 tests passed**; summary printed: statements 95.98%, branches 90%, functions 96.19%, lines 97.69%. No threshold error.                                                                                                                     |
| …forcing `--coverage.thresholds.lines=100` fails, proving the gate is live    | met                                          | `pnpm exec vitest run --coverage --coverage.thresholds.lines=100` → **exit 1**, `ERROR: Coverage for lines (97.69%) does not meet global threshold (100%)`                                                                                                  |
| `package.json` has `"engines": { "node": ">=22" }`                            | met                                          | `node -e "…engines.node"` → `>=22`; `package.json:186-188`                                                                                                                                                                                                  |
| New rAF-fallback test(s) pass and restore `requestAnimationFrame`             | met                                          | Both pass: "uses timeout fallback when requestAnimationFrame is unavailable" (10ms), "cancels timeout fallback flushes on unmount" (6ms). Restored by `SvelteMarkdown.test.ts:143-145` `afterEach(() => vi.unstubAllGlobals())`; full suite green, no leak. |
| `pnpm check` exits 0; `pnpm test:only` exits 0; `trunk check` exits 0         | met                                          | `pnpm check` → 0 (0 errors, 4 pre-existing warnings). `pnpm test:only` → 0. `trunk check --no-fix` → "✔ No issues", 9 modified files.                                                                                                                       |
| No files outside the in-scope list are modified                               | met                                          | `git diff --stat main...HEAD` → 9 files, all in-scope, guard artifacts, or operator-directed (see "Scope & conduct")                                                                                                                                        |
| The batch `README.md` status row for 010 is updated                           | met                                          | `README.md:40` → `DONE`                                                                                                                                                                                                                                     |

## Spirit

The plan's `Why this matters` names three independent rots, and the diff closes all three at the root rather than at the checkbox.

The coverage gate is the one that could most easily have been faked, and wasn't. A `thresholds` block that vitest never enforces would satisfy a naive reading of the criterion; forcing `lines=100` returns exit 1 with a real threshold error, so the gate genuinely gates. The floors are pinned to reality (95/89/95/96 against measured 95.98/90.00/96.19/97.69), not to CLAUDE.md's aspirational 90 — which the plan explicitly forbade inventing. Worth recording: branches currently sit at exactly 90.00%, so the aspiration is met on every metric today.

The rAF-fallback tests are the part I scrutinized hardest, because "assert no late flush occurred" is the classic shape of a vacuous assertion — it passes if the flush could never have happened anyway. It isn't vacuous here. Unmount teardown (`SvelteMarkdown.svelte:411-415`) cancels the handle but does **not** clear `pendingStreamAppendBuffer`, so had the `kind:'timeout'` cancel branch been absent, the pending timer would have fired, committed the buffer, parsed, and tripped `lexSpy`. lcov confirms from the other side: `clearTimeout` at `SvelteMarkdown.svelte:153` is hit **exactly once** across all 919 tests, reachable only via the new unmount test. The tests document the SSR/non-browser scheduling contract that the plan said had no behavioral coverage, and they discriminate against the mutation they exist to catch.

`engines` is trivial and correct. No gap between the diff and the intent.

## Criterion defect (guard's own, disclosed)

The second amendment introduced the rule "every floor ≥1 percentage point below measured" **and** prescribed the literal block `{statements: 95, …}`. Those two contradict each other: 95.98 − 95 = 0.98pt. The executor followed the prescribed numbers exactly; the inconsistency is guard's, not the executor's, and it would be unjust to fail work for complying with the instruction it was given.

More importantly the rule uses the wrong unit. Percentage-point slack is denominator-dependent, so it does not measure what the amendment was actually protecting against — one accidental uncovered unit reddening CI. In absolute terms:

| Metric     | Covered / total | Floor needs | Headroom |
| ---------- | --------------- | ----------- | -------- |
| statements | 1819 / 1895     | 1801        | **18**   |
| branches   | 846 / 940       | 837         | 9        |
| functions  | 582 / 605       | 575         | 7        |
| lines      | 1399 / 1432     | 1375        | 24       |

`statements` has the **largest** absolute headroom of the four despite the smallest percentage slack. The original defect this amendment fixed was `functions` with headroom of **1**; it is now **7**. The criterion's purpose is met with room to spare, so this does not block the gate. It is disclosed rather than papered over, and left as a follow-up rather than silently amended into agreement — amending the plan to make the work pass is the one move guard must never make.

## Scope & conduct

- **In-scope only? Yes**, once the two amendments are accounted for. `git diff --stat main...HEAD` = 9 files:
    - Plan in-scope: `vite.config.ts`, `package.json` (engines), `src/lib/SvelteMarkdown.test.ts`, `src/lib/SvelteMarkdown.issue-328.test.ts` (timeout only — verified: the diff is the single line `15_000` → `30_000`; the two assertions above it are untouched), batch `README.md`.
    - Guard artifacts: `010-….md`, `010-….guard.md`.
    - **Operator-directed, outside plan 010** (logged as sanctioned at Checkpoints 3 and 4, committed separately at `b372498` / `45d665f` so they remain revertible independently of the plan's work): removal of `lint`/`format`/`lint:fix` from `package.json` and `docs/package.json`, and the corresponding `CLAUDE.md` rewrite. `AGENTS.md` is a symlink to `CLAUDE.md` and inherits it.
- **STOP conditions respected? One was skipped, and it cost a round-trip.** The drift STOP fired at Checkpoint 1 (the plan's excerpt named `scheduleAppendFlush`; plans 007–009 had renamed it to `scheduleStreamFlush`) and the executor proceeded silently. Substantively right — the rename is cosmetic and every material fact held — but it should have been reported, not walked past. Separately, the issue-328 timeout was raised without first reporting the constraint; had the 16s measurement accompanied it, that would have resolved in one step instead of a violation followed by an amendment.
- **Source drift since planning:** none. `git diff --stat 7a64121..HEAD -- vite.config.ts package.json src/lib/SvelteMarkdown.svelte` → only `vite.config.ts`. `SvelteMarkdown.svelte` is untouched, so the plan's "test the fallback, don't change it" boundary held.
- **Tampering:** none. The executor never edited the plan file or this log.
- **Plan amendments during execution:** two, both operator-approved.
    1. **2026-07-09 (`9a432ca`)** — corrected the stale `scheduleAppendFlush` excerpt (plan defect: renamed after `939f154`) and replaced the bare integer round-down with a slack rule after `functions: 96` proved to leave headroom of exactly one function. Added the live-gate check. Re-stamped `Planned at` → `fbc1ea5`.
    2. **2026-07-09 (`c9af986`)** — admitted `src/lib/SvelteMarkdown.issue-328.test.ts` for a **per-test timeout only**. Plan defect: v8 coverage instrumentation takes "matches static heading ids for a large streamed document" from ~3.1s standalone to **13.5–15.6s** against a 15s budget, so `pnpm test` — itself a Done criterion — flaked before reaching the coverage gate. Confirmed at this review: the test ran **15637ms**, which would have exceeded the old limit outright. The timeout is a harness limit, not an assertion; the #328 proportionality guarantee is asserted by a separate 26ms test, untouched. Scope was bounded to the timeout line, with an explicit clause that a second marginal test is a STOP-and-report, not a precedent. Re-stamped `Planned at` → `7a64121`.

## Residual risk / follow-ups

- **Coverage thresholds are now a live CI gate.** Any PR that lowers coverage below 95/89/95/96 fails `pnpm test`. Headroom is 18 statements / 9 branches / 7 functions / 24 lines — comfortable, but contributors adding uncovered helpers will now see red where they previously saw green. This is the intended behavior.
- **Guard's `≥1 percentage point` rule is mis-specified** (see "Criterion defect"). Recommend restating it in absolute units (e.g. "≥5 uncovered units of headroom") or dropping `statements` to 94 in a follow-up. No action needed to merge.
- **The `30_000` timeout must not be trimmed back** toward the measured ~13.5–15.6s. The margin absorbs coverage overhead and CI load variance; the plan's maintenance notes record this. A future _third_ raise should be read as a regression in the streamed-heading path, not as a timeout problem.
- **`engines: ">=22"` is now published metadata.** Consumers on Node 20 will get an install warning (or an error under `engine-strict`). CI runs 22 and 24, so this matches reality — but it is a consumer-visible change riding in a "test hygiene" PR. Note it in the release.
- **Branches sit at exactly 90.00%.** Whether the gate should encode CLAUDE.md's 90% aspiration rather than today's measured floor is a deliberate choice the plan forbade the executor from making. Worth deciding separately.
- The `lint`/`format` script removal is **not** plan 010 work. If 010 is ever reverted, `b372498` and `45d665f` should be revisited independently.
