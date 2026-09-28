# Guard report — 009 citation-definitions-semantic-reuse

**Recommendation: PASS** — the work is faithful and verified; the plan's own Step 6 "mark partial with the numbers" clause applies because `citations` is still above Streamdown (2,005–2,076 vs 1,544–1,688 ms) with 1–2 over-budget frames, not 0. The spikes the plan targeted are gone (46 → 1–2; peak 41–46 → 17–23 ms; p95 19.6 → 5.3 ms).
**Reviewed at** b0fd557 · 2026-09-28 09:59 · **Plan planned at** 5770072 (amended pre-flight 2026-09-28; original 7dea763)
**Integrated** — no PR: batch convention is one branch → one PR at batch close. Snapshot `b0fd557` on `perf/stream-bench-flush-timing`.

## Done criteria

| Criterion                                                                                                                   | Result                      | Evidence                                                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check` 0 errors; `pnpm test` exits 0 with the new tests passing                                                       | met                         | `0 ERRORS 3 WARNINGS`; 160 files / 1192 tests; lines 98.57%, branches 92.86%                                                                                                                                                                                                  |
| `grep reuseMode` shows definition and consumption                                                                           | met                         | 9 matches across `incremental-parser.ts` and `SvelteMarkdown.svelte`                                                                                                                                                                                                          |
| `grep "export const reuseStableTokenTree"` matches                                                                          | met                         | `streaming-token-reuse.ts:250`                                                                                                                                                                                                                                                |
| Paired bench `citations`: parity 0; `framesOverBudget` 0 (Part B) or ≤ 5 (Part A, justified); result vs Streamdown recorded | PARTIAL (plan clause)       | guard re-read all 12 evidence JSONs: 120 runs, 0 parity mismatches; over-budget 1–2 after Part B; ours 2,005–2,076 vs theirs 1,544–1,688 ms; plan Step 6 explicitly allows "marked partial with the numbers and the dominant attribution bucket" — JS outside the flush (46%) |
| `evidence/009/README.md` archived                                                                                           | met                         | README + 8 A/B + 4 vs-Streamdown JSON/log pairs + attribution for A / Part A / Part B                                                                                                                                                                                         |
| No files outside scope modified                                                                                             | met, one declared exception | `parse-and-cache.ts` (+15/−1: optional `links` seed parameter) — the plan permits the seeded-lexer helper there "if placed in parse-and-cache.ts (say so in the commit)"; executor said so                                                                                    |

## Spirit

The plan's purpose was to stop a definition line from re-rendering the whole document and, if needed, from re-lexing it. Both landed: `reuseMode: 'tree'` keeps every semantically unchanged object (Plan 008's comparator makes that sound), and the targeted path re-lexes only the tail plus the roots that cite a changed label, seeded with marked's link map, with a fallback to the full re-lex whenever it could disagree with a one-shot parse (nested definitions, labels the candidate regex might miss, or when the candidates are ≥ 50% of the source). The dev-only Parser update counter is the renderer-work observable the adversarial review asked for, and the red test using it went from 24 updates to within the bound. Parity holds at every chunk while URLs and titles stream. The batch-level target for this scenario is not yet met, but the remaining cost is no longer definition handling: attribution shows JS outside the flush at 46% and `isAppendOnlyUpdate` at 8.8% self time — Plan 010/011 territory. Spirit met; the outcome is honestly partial against the batch contract.

## Scope & conduct

- In-scope: yes, plus the plan-sanctioned `parse-and-cache.ts` seed parameter (declared).
- STOP conditions: none fired; the executor verified marked honors a pre-seeded link map before building on it (Step 4 tripwire test exists).
- Deviations (judged sound): (1) the 50% share rule that skips targeting when it cannot save work — conservative, and it keeps four existing full-re-lex tests valid without editing them; (2) changed labels are derived from marked's own `def` tokens rather than only a regex, with the regex used to pre-select candidates and a fallback when a changed label escapes it.
- Plan amendments: pre-flight only.

## Residual risk / follow-ups

- `prose-mixed` library flush was 5–16% higher on B in all four runs (+15–48 ms total; total-work deltas within noise). Likely the extra `def`/candidate bookkeeping per update; Plan 011's counters should confirm it is O(1) and not O(document).
- Pre-existing, found not fixed: labels spanning a line break are never detected as uses; `prevHasReferenceDefinition` misses definitions nested in blockquotes/lists on the normal tail-window path (Part B's own map handles nested definitions). Both need their own tests before a fix.
- The 1–2 remaining over-budget frames on `citations` were not identified; likely the first definition's full re-lex or a GC pause.
