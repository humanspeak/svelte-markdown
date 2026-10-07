# Streaming text and Motion implementation plan

Generated with improve on 2026-10-05, against fresh origin/main `c2ca115`.
The user selected a headless streaming text API plus optional predefined renderer exports and documentation examples
using @humanspeak/svelte-motion. This is a focused feature plan, not a full audit.

## Execution order and status

| Plan                                             | Title                                               | Priority | Effort | Depends on | Status                                                            |
| ------------------------------------------------ | --------------------------------------------------- | -------- | ------ | ---------- | ----------------------------------------------------------------- |
| [001](001-streaming-text-api-and-motion-docs.md) | Headless segments, optional preset exports and docs | P1       | L      | None       | IN PROGRESS — baseline readiness races diagnosed; bounded repairs |

Status values: TODO, IN PROGRESS, DONE, BLOCKED (reason), REJECTED (reason).
Execute the single plan in step order: bookkeeping proof, helper, integration,
docs presets, full gates. API and docs ship together.

## Branch and preserved work

Branch: `feat/streaming-text-motion`, created from freshly fetched origin/main.
An unrelated local edit to .competitive-intel/state.json blocked checkout and
was restored onto this branch at the operator's request. Its saved contents
exactly match fresh main, so no additional competitive-intel diff is necessary.
The task-specific stash was dropped after verifying equality; unrelated stashes
were left intact. No source implementation, commits or pushes were
performed during planning.

## Findings considered and rejected

- Mandatory/core Motion dependency: rejected. Presets live in the explicit
  streaming/motion subpath with an optional peer. Users install Motion and import
  FadeWords, RiseWords or FadeCharacters to opt in; defaults remain unchanged.
- Existing render keys as exact character source positions: rejected; nested
  child key assignment starts at the parent offset and is not text provenance.
- Styling/timing props on SvelteMarkdown: rejected; use consumer snippets and
  the full Motion API instead of a parallel animation vocabulary.
- Typewriter pacing and exit-animation defaults: deferred; arrivals are separate
  from scheduling visibility, and append entrances need no AnimatePresence.

## Verification and scope

Recon inspected streaming lifecycle, leaf renderer dispatch, metadata keys,
public types/exports, test harness/config, CI and existing docs integration.
No general security/dependency/performance audit was performed, and no runtime
verification commands were run in this read-only planning pass. The executor
must run the gates in plan 001. Unrelated repository initiatives are not covered.

## Execution checkpoint

Sol (gpt-6.1-sol) stopped before edits at the exact-provenance STOP condition.
Parent independently reproduced marked lexer output: `**a` exposes `**a`, while
appending `** a` produces `a a`; common-suffix matching misattributes the old
letter to the newly appended letter. No implementation diff exists. An approved
plan amendment must establish a provenance approach before redispatch. Default
behavior, optional preset exports and consumer control remain required.

## Approved revision 2026-10-05

Operator approved a focused parser/HTML cleanup provenance investigation. Step 0
is a read-only Sol design checkpoint; implementation remains gated on review of
its architecture and concrete regression cases. Default behavior and optional
Motion preset requirements are unchanged.

## Reviewed architecture

Parent read the report and verified actual recursive lexer inputs and HTML
entity callback ranges with installed packages. The approved design adds opt-in
source mapping before cleanup and occurrence metadata through token reuse.
Step 1 is dispatched alone; exact-origin/parity tests must pass before proceeding
with the consumer API, presets and docs. Baseline re-stamped to d4835ee; only
plan artifacts changed since c2ca115. Report is preserved alongside the plan.

## Accepted Step 1 checkpoint

Commit 65a13ee contains Sol's reviewed provenance implementation and regression
suite. Parent reproduced 335 passing tests, pnpm check with zero errors and
clean Trunk checks; pre-commit hooks also passed. This is a checkpoint acceptance,
not overall feature completion. Steps 2–5 (headless API, source arrival ledger,
consumer metadata wiring, optional Motion presets, docs and final gates) remain.
The plan drift baseline is now 65a13ee to retain reviewed predecessor work.

## Steps 2–5 partial implementation

Sol delivered provisional API/ledger/presets but stopped after repeated preset
text-preservation failures. Parent traced extra whitespace to svelte-motion's
container template and confirmed published 2.0.0 retains that template. A separate
Motion fix is recommended; approval needed for that repository scope. Parent also
reproduced an in-scope incremental word boundary defect for can' → can't. Docs,
README, E2E fixture and final gates remain outstanding. No feature PASS.

## Resumed 2026-10-07

Operator supplied published @humanspeak/svelte-motion 2.0.1-0 addressing
[upstream issue 498](https://github.com/humanspeak/svelte-motion/issues/498).
Resolution is pending local runtime verification. This thread now works on
feat/streaming-text-motion-resume in an isolated worktree. The previous feature
branch already held checkpoint 04a7afe, including all provisional sources and
report 005. Applying the identified stash conflicted only with checkpoint
formatting; committed versions were retained after comparison. Stash is retained.
The plan authorizes root/docs Motion dependency updates to the supplied prerelease,
word-boundary correction, and completion of remaining API/presets/docs/gates.

## Final guard checkpoint 2026-10-07

Implementation snapshot c731780 contains the headless API, optional preset
subpath, fixed Motion prerelease, full-context Unicode segmentation, docs,
README, browser fixture and packaging proofs. Normal source commit hooks passed.
Parent independently reproduced 1,564 unit tests passing with coverage
97.52% statements, 92.70% branches, 97.89% functions and 98.27% lines.
Docs check has zero errors and one existing CSS warning; normal npm no-peer
installation and core/headless isolation pass. Parent docs preview exercised
all three presets, custom snippets, disabled plain output, duration/stagger/
grapheme controls and restart, with no captured runtime errors. Servers stopped.

Feature E2E cases passed in the executor's five-project run (15 tests); parent
full-suite log likewise has no streaming-text failures. Full E2E remains failed:
parent Chromium heading-metadata test expected parse-heading-heavy-done but
received idle. Executor's prior runs also each failed a different unchanged test.
Unchanged tests do not prove a baseline defect; no coverage, assertions or
projects were weakened. Verdict NO-PASS, no PR/push, batch remains active.
See the guard report and verbatim reports 007/008 for evidence and next action.

## Readiness investigation

Operator requested deeper investigation. Sol reproduced lost clicks before
hydration on baseline c2ca115 and feature HEAD with exact heading IDs after
readiness; independently reproduced lazy-image src race. Bounded fixture/test
repairs are now in scope. Report 009 preserves evidence; no pass claimed yet.
