# Guard report — 004 regression-bench-and-docs

**Recommendation: PASS** — parity is 0 on every run, no scenario is slower by more than 3% in both repeats against the pre-fix commit, the two new scenarios exist, and the docs state what was measured.
**Reviewed at** working tree on 5516170 · 2026-09-29 · **Plan planned at** 5516170
**Integrated** — no PR action: the work is on the existing PR #396 branch.

## Done criteria

| Criterion                                                        | Result | Evidence                                                                                    |
| ---------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------- |
| Evidence README with A/A, paired A/B, ours vs Streamdown, load   | met    | `evidence/004/README.md`, 22 run logs with JSON                                             |
| Parity 0 on every run; no scenario worse by > 3% in both repeats | met    | closest: `long-code-fence` −6.32% / −1.41%; every other scenario flips sign between repeats |
| Two new bench scenarios exist and run                            | met    | `loose-ordered-list`, `html-blocks`; parity 0 of 31 checks each                             |
| Docs wording updated; docs check 0 errors                        | met    | reproduced by guard                                                                         |
| `Incomplete Markdown` compare row corrected                      | met    | diff reviewed                                                                               |
| `pnpm check`, `pnpm test`, `trunk check`                         | met    | reproduced by guard                                                                         |
| No files under `src/lib/` modified                               | met    | `git status`                                                                                |

## Spirit

The plan asked for proof that correctness did not cost speed, and for docs that say exactly what is true. The executor reported the one result that is against us (HTML blocks, 0.60–0.64) in the docs instead of leaving it out, and explained why it is not like-for-like. Spirit met.

## Scope & conduct

- One deviation, accepted: a second caveat and an adjusted intro sentence on the benchmarks page, needed to keep the page consistent with the new row.
- Guard extended one more compare row for the same reason (docs only).

## Residual risk / follow-ups

- A/B noise on this machine is about ±5% per repeat, so a real regression below that size cannot be excluded. `long-code-fence` is the one to watch: B was slower in both repeats (−6.32%, −1.41%).
- HTML-heavy streams are now the slowest shape: while the document ends inside an open element, every update parses the whole document. On the 24 KB `html-blocks` scenario the library's own work is about 2,000 ms of the total. This was the price of correct nesting (plan 002); an incremental path for open elements is a candidate for a later performance batch.
- There is no A/B for the two new scenarios, because the pre-fix commit's bench page does not have them.
