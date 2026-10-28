# Guard report: 001 rebenchmark-streamdown-5

**Recommendation: PASS**. The streamdown comparison is re-measured against 5.0.0. Every scenario keeps its winner, every published number now comes from the 5.0.0 capture, and I recomputed every table cell from the logs and found an exact match.
**Reviewed at** `0973f2c` · 2026-10-28 14:08 · **Plan planned at** `7b36d0e` (re-stamped from `bdebe69`, amended at `128d1d7`)
**Integrated**: committed to `chore/competitive-intel-2026-10-28` (`82af5a1` bump and evidence, `0973f2c` docs). No PR until the operator asks.

## Done criteria

| Criterion                                                                | Result | Evidence                                                   |
| ------------------------------------------------------------------------ | ------ | ---------------------------------------------------------- |
| `package.json` pins `"svelte-streamdown": "5.0.0"`, `pnpm check` exits 0 | met    | `package.json:189`. 0 errors                               |
| Evidence dir has the control log, both suite logs and README             | met    | 4 files in `evidence/2026-10-28-streamdown-5.0.0/`         |
| Every log shows svelte-markdown parity mismatches of 0                   | met    | 130 runs, 0 non-zero (control also 0)                      |
| `5.0.0` appears in both the svx and compare-data                         | met    | settings table and Streaming Speed note                    |
| `config.json` `measured_against` is `5.0.0`                              | met    | `node -e …` gives `5.0.0`                                  |
| `pnpm -C docs check` exits 0, trunk no new issues                        | met    | 0 errors (1 pre-existing warning). Pre-commit trunk passed |
| Only in-scope files changed                                              | met    | 3 docs/config files, plus bump and evidence in `82af5a1`   |
| Index status row updated                                                 | met    | by guard                                                   |

## Spirit

The intent was that every claim on the compare page names, and is true for, the streamdown version people actually install. It now is. The table, the speed range and the frames-run-long figure all come from 5.0.0, and the measurement note names the version and the machine. The re-measurement also answered the competitive question: 5.0.0 did not take any scenario from us, and on long lists and tables it still runs long on 16–42% of frames while ours stays at 0.

## Scope & conduct

- In scope only: yes.
- STOP conditions respected: yes. Case C stopped the first executor before any docs edit, and the decision went to the operator.
- Plan amendments: Revision 2 (pre-flight re-stamp) and Revision 3 (the operator chose to publish the i9 capture, with exact figures). Both are recorded in the plan.

## Residual risk / follow-ups

- The "about 1.4 ms per frame at 24 KB and 1.9 ms at 384 KB" caveat and the "Where the time goes" table come from the original i7 trace run, not from this capture. They are Svelte Markdown-only and still labeled per-frame, but a future trace run on the current machine would make the page fully consistent.
- Frame-over-budget figures depend on the machine. Future re-checks should keep a same-machine control of the previous version.
- The nightly digest will see `measured_against` 5.0.0 and stop flagging HUM-2. Close HUM-2 when this PR merges.
