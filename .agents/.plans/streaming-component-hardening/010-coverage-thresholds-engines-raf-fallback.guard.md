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
