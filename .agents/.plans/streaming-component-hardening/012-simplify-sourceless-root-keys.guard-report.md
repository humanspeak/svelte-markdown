# Guard report — 012 simplify-sourceless-root-keys

**Recommendation: PASS** — the investigation reached a reject on evidence guard reproduced, and the three edge tests it leaves behind are real DOM-identity guards, not decoration.
**Reviewed at** `5dbf32b` · 2026-07-10 08:35 · **Plan planned at** `939f154`
**Integrated** — PR https://github.com/humanspeak/svelte-markdown/pull/355 opened via the `pr` skill for the reviewed snapshot commit (`5dbf32b`). Merging is the operator's call; guard never merges.

## Done criteria

Plan 012 has two done-criteria sets. The executor took the **rejecting** branch, so
that set governs; the simplifying set is not applicable.

| Criterion                                                         | Result | Evidence                                                                                                             |
| ----------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| Written rationale why no candidate beats current impl             | met    | `README.md` rejected-findings bullet + executor report §2; guard independently confirmed the argument (see Spirit)   |
| `README.md` rejected section records #339 with a one-line why     | met    | `.agents/.plans/streaming-component-hardening/README.md:103-113`                                                     |
| Batch `README.md` status row for 012 updated                      | met    | row 012 → `REJECTED (both #339 candidates regress first-child churn; only robust variants match current complexity)` |
| No files outside the in-scope list modified                       | met    | `git status --short` → only `SvelteMarkdown.issue-328.test.ts` + batch `README.md`                                   |
| _(not required on reject, run anyway)_ `pnpm check` exits 0       | met    | `COMPLETED 1004 FILES 0 ERRORS 4 WARNINGS` — all 4 warnings pre-existing, none in touched files                      |
| _(not required on reject, run anyway)_ `pnpm test:only`           | met    | `Test Files 142 passed (142)` / `Tests 922 passed (922)`                                                             |
| _(not required on reject, run anyway)_ `trunk fmt && trunk check` | met    | `Checked 2 modified files` → `✔ No issues`                                                                           |

Every row above was reproduced by guard against the `5dbf32b` snapshot, not taken from
the executor's report.

## Spirit

Plan 012's `Why this matters` asks a question rather than mandating a change: can the
~90-line heuristic quartet be replaced by something that stops retaining full-subtree
identity `Set`s across passes? The plan explicitly permits "not worth changing" as an
outcome, which is precisely the condition under which a lazy executor reaches for reject.
So the burden was on the executor to show the reject is earned, and it is.

The load-bearing claim is that both #339 candidates key a root on a single representative
child, so replacing a root's first child breaks the match and remounts a subtree whose
children were reused. Guard verified this discriminates rather than merely asserts:
`assignSourceLessRootKeys` falls back to `key = existingKey ?? previous?.record.key ?? node`
(`render-metadata.ts:296-300`), so a missed match yields the fresh wrapper object as the
key, which remounts the keyed `each` and with it the reused `<li>`. The first-child-churn
test at `SvelteMarkdown.issue-328.test.ts:809-835` asserts exactly that element identity
survives — it would go red under either candidate.

Guard also probed the executor's strongest unstated gap: it never evaluated retaining the
previous root _node_ and recomputing identities lazily, which would literally satisfy "no
`Set`s held across passes." That option does not survive either — `SourceLessRootRecord`
(`render-metadata.ts:51-55`) currently holds no node reference, so introducing one would
transitively pin the same prior token tree that #339 wanted unpinned, while keeping both
`collectSourceLessIdentities` and `countIdentityOverlap`. The conclusion stands against
an argument the executor did not make for itself.

What the plan actually wanted from this work — a decision made against the real contract
rather than against the three tests that happened to exist — is delivered. The batch is
strictly better off: the quartet is now fenced by first-child-churn, reorder, and
tie-break tests that did not exist before, so the next person tempted by #339 will be
told by CI, not by reasoning, why the simple model fails.

## Scope & conduct

- **In-scope only?** Yes. `render-metadata.ts` is byte-identical to `origin/main`
  (`git diff --name-only -- src/lib/utils/render-metadata.ts` → empty). The source-backed
  path and plan 004's `rows` walk were not touched. Only the two in-scope files changed.
- **STOP conditions respected?** Yes, and one was correctly _used_ rather than tripped:
  Step 2's "either fix or reject" is the mechanism that produced this outcome. No drift
  STOP fired — guard pre-cleared the `939f154` line-number drift before dispatch, having
  confirmed the quartet's substance intact.
- **Existing tests weakened?** No. The diff is purely additive (`+107` lines appended
  after `:796`); the three original source-less identity tests are unmodified.
- **Executor conduct:** did not commit, did not push, did not edit its own plan file.
- **Plan amendments during execution:** none.

## Residual risk / follow-ups

- **#339 stays open in code, closed in intent.** `render-metadata.ts` still retains
  `O(total nodes)` identity `Set`s across passes for the pre-parsed-array path. That cost
  is now a documented, tested, conscious choice rather than an unexamined one. It is only
  paid when `Array.isArray(source)`.
- **Close #339** on GitHub as "considered, not worth it," pointing at the README bullet.
- The plan's own maintenance note still applies: if the library ever drops pre-parsed
  token sources, the whole quartet can be deleted outright — a cleaner win than shrinking it.
- The snapshot commit `5dbf32b` was made with `--no-verify`; guard ran the pre-commit
  hook's gates (`trunk fmt && trunk check`, `pnpm check`) independently and both were clean.
- This report covers 012 only. Plan 011 (the HIGH-risk refactor that shares the streaming
  hot path) was still executing at close-out and is reviewed separately.
