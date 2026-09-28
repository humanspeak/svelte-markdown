# Guard report — 012 code-fence-line-nodes-spike

**Recommendation: PASS** — spike kept on a repeatable paired win (−29.2% / −25.4% on `long-code-fence`, every pair positive, parity 0, style/layout 1.89 → 0.75 ms/frame) with an explicit DOM/SSR/hydration contract pinned by tests. Streamdown still does 1.31× less work on this scenario (was 1.8×); recorded, not hidden.
**Reviewed at** 9d4ef64 · 2026-09-28 12:45 · **Plan planned at** f6684cc (amended pre-flight 2026-09-28; original 7dea763)
**Integrated** — no PR: batch convention is one branch → one PR at batch close. Snapshot `9d4ef64` on `perf/stream-bench-flush-timing`.

## Done criteria

| Criterion                                                                             | Result            | Evidence                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decision recorded (kept with paired deltas, or REJECTED)                              | met — KEPT        | A/B `long-code-fence` A 2,333 / 2,301 → B 1,622 / 1,611 ms (pairs 844,735,680,638,655 and 782,584,573,466,822 — all positive); growth ratio 4.2 → 3.0–3.3; p95 5.8 → 3.9                                                                                                   |
| If kept: `grep "{#each lines" Code.svelte` matches; identity/SSR/hydration tests pass | met               | `Code.svelte:32`; `Code.test.ts:186` (completed-line node untouched — the red anchor), `:208` (server shape + exact marker snapshot), `:225`, plus hydration node-reuse assertion                                                                                          |
| `pnpm check` 0 errors; `pnpm test` exits 0                                            | met               | `0 ERRORS 3 WARNINGS`; 161 files / 1233 tests; lines 98.57%                                                                                                                                                                                                                |
| `evidence/012/README.md` archived with parity 0                                       | met               | guard re-read all 11 evidence JSONs: 98 runs, 0 parity mismatches                                                                                                                                                                                                          |
| No files outside scope modified                                                       | met               | `Code.svelte`, `Code.test.ts`, `evidence/012/**`                                                                                                                                                                                                                           |
| Gate: no other scenario worse by > 3%                                                 | met (noise-level) | `prose-mixed` paired delta −30.7 / −30.8 ms (B ≈ 1.5% more work; per-pair signs mixed: +313, +6, −366, −31, −167); `prefix-24kb` −0.3 ms; `prose-mixed-4x` −9.5 ms; `large-closed-block` +14.3 ms — guard read the per-pair values; all inside the A/A control's ±3.6–8.4% |

## Spirit

The plan demanded a measured spike with a settled DOM contract, not a promised layout win. Both delivered: attribution first (style/layout 61.7% — over the 30% go/no-go), an A/A control, two paired repeats, before/after attribution showing the mechanism (layout down 1.14 ms/frame, per-line `{#each}` JS up 0.15, uncounted paint up 0.34 — the executor reported the offset rather than overstating the gain). The DOM contract is explicit: no element children, `textContent` exact, `code.firstChild` is the first line only (documented in the component), SSR differs only by Svelte's marker comments (exact string pinned), hydration reuses the server nodes (asserted because Svelte does not validate tag names on hydrate). Spirit met.

## Scope & conduct

- In-scope only: yes.
- STOP conditions: none fired (style/layout above 30%; A/A within ±10%; no `innerHTML` assertion broke).
- One `// trunk-ignore(eslint/@typescript-eslint/no-implied-eval)` in the SSR test, the repo's sanctioned suppression form, to evaluate the server-compiled component inside jsdom; justified and localized.
- Plan amendments: pre-flight only.

## Residual risk / follow-ups

- Consumers reading `code.firstChild.nodeValue` now get one line; the component doc says to use `textContent`. Note in the release description (Plan 014 README/docs).
- `prose-mixed` shows a ~1.5% B-side cost from the per-line each on short fences; below the gate, but Plan 014's final suite will confirm it is not additive with other changes.
- Highlighted renderers (`src/lib/extensions/**`) still re-highlight the whole open fence per chunk; separate follow-up.
- Playwright e2e not run for this plan; unit + SSR + hydration coverage is the net.
