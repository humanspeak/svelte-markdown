# Implementation Plans — stream-parity-fixes

Written 2026-09-29 against commit `119cc58`, after a code review of PR #396
found five streaming shapes where the streamed output differs from a
one-shot parse. All five reproduce on `main`; none was introduced by the PR.
They are fixed on the PR branch (`perf/stream-bench-flush-timing`) because
the 2.0 release claims streaming parity.

Goal: a streamed parse equals a one-shot parse of the same cumulative source
after every chunk, for any chunk boundaries, with no loss of the per-frame
performance measured in `.agents/.plans-closed/stream-vs-streamdown/evidence/014/`.

The red tests were written first and are committed (`119cc58`):
`src/lib/utils/incremental-parser.parity.test.ts` and
`src/lib/SvelteMarkdown.parity.test.ts`, bucketed by mechanism. They use
`it.fails`; run with `PARITY_STRICT=1` to see the real failures. The batch is
done when no `red(` call remains and the suite is green.

## Execution order & status

| Plan | Title                                                               | Bucket | Priority | Effort | Depends on | Status |
| ---- | ------------------------------------------------------------------- | ------ | -------- | ------ | ---------- | ------ |
| 001  | Guard tail-window offsets with a source-length integrity check      | A      | P0       | S–M    | —          | TODO   |
| 002  | Do not freeze a block the next chunk can still continue or enclose  | B      | P0       | M      | 001        | TODO   |
| 003  | Detect reference definitions from marked's tokens, not line regexes | C, D   | P1       | M–L    | 001, 002   | TODO   |
| 004  | Regression bench and docs alignment                                 | —      | P1       | S–M    | 001–003    | TODO   |

Status values: TODO | IN PROGRESS | DONE | BLOCKED (with one-line reason) | REJECTED (with one-line rationale)

All four plans touch `incremental-parser.ts` or depend on it, so they run
serially in the working tree.

## Red tests by bucket (20 red, 10 guards at `119cc58`)

| Bucket              | Mechanism                                                                                                          | Red | Guards |
| ------------------- | ------------------------------------------------------------------------------------------------------------------ | --- | ------ |
| A. Offset integrity | marked consumed source without emitting a token of the same length (CRLF, duplicate definitions)                   | 6   | 2      |
| B. Block boundaries | a block frozen while the next chunk could still continue or enclose it (loose ordered list, HTML with blank lines) | 7   | 5      |
| C. Reference scope  | a definition the line-anchored detector cannot see (next-line URL or title, nested in a container)                 | 6   | 2      |
| D. Fuzz             | seeded random chunk boundaries over tricky documents                                                               | 1   | 1      |

## Dependency notes

- 002 depends on 001: closing an HTML block relies on the integrity guard to
  decide whether the tail window may be used afterwards.
- 003 depends on 001 and 002: it restructures the decision in `update()`,
  and the tricky-corpus fuzz it must turn green covers all three buckets.
- 004 measures the final result against the pre-fix tip.

## Findings considered and rejected

- Normalizing CRLF in the component's buffer: rejected for this batch —
  offset-mode chunks address the caller's original text. The integrity guard
  keeps CRLF documents correct at the cost of a full re-lex per update.
- Patching each cause separately (a CRLF special case, a duplicate-definition
  special case): rejected — the previous batch's plan 013 showed these are
  variants of one mechanism; the guard covers the class.
