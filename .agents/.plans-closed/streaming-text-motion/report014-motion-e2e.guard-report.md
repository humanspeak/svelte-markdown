# Guard report — motion browser coverage correction

**Recommendation: PASS for browser behavior and recorder correction.** Perceived
animation quality remains open following the user's feedback; this is not a
claim that motion looks better than plain streaming.

**Reviewed at:** `83c34ea` · 2026-10-07 15:01.
**Correction baseline:** `2495bbf`; original feature plan at `c731780`.
No PR, push or merge: user has not requested one.

## Done criteria

| Criterion                                               | Result | Parent evidence                                                            |
| ------------------------------------------------------- | ------ | -------------------------------------------------------------------------- |
| All three actual preset entrances and settled output    | met    | 60 motion E2E tests passed, 12 per configured project                      |
| Real can-to-can't updates retain nodes without replay   | met    | default and long-duration frame assertions passed                          |
| Baseline visible; exact whitespace and Unicode retained | met    | every recorded frame assertions and exact final text passed                |
| Disabled and live reduced motion remain readable        | met    | tests passed for each preset in all five projects                          |
| Replay/reset and plain code preserved                   | met    | actual browser assertions passed                                           |
| Default cadence settles within unchanged 400ms guard    | met    | all five projects passed with actual preset defaults                       |
| Assertion, timeout, retry and config integrity          | met    | full diff read; only one Range allocation moved out of frame/span loop     |
| Formatting, lint, types and clean diff                  | met    | normal commit hooks passed; git diff --check passed                        |
| Review pages reachable                                  | met    | docs8260 and comparison5260 HTTP200; collaborative tab_g available/visible |

Parent command: `pnpm test:e2e tests/streaming-motion.test.ts`, exit0,
**60 passed in1.8m**, no failures/skips. Log `/tmp/motion014-guard-e2e.log`.
The E2E web-server gate also builds/package-validates the current tree.

## Spirit and scope

The user wanted a useful motion review page and real browser tests beyond the
metadata fixture. The docs demo now has explicit local styling and a simultaneous
plain comparison, and `/streaming-motion` presents all three real presets on the
same source/cadence. Parent inspected desktop/mobile layouts in round011.
No core/preset implementation changed in these corrections. All consumer choices
and ordinary core defaults remain intact. Scope after diagnostic2495bbf is solely
tests/streaming-motion.test.ts plus parent reports; executor never edited plans.

The recorder itself was creating live DOM Ranges per span per frame, perturbing
Safari activation under later DOM mutations. Parent independently reproduced the
539ms-to326ms settling improvement with one reusable Range on unchanged code.
Round014 applies that proven minimal correction without weakening any assertion.

Original feature unit/coverage/bundle/no-peer gates and earlier620-case E2E pass
remain recorded in the original guard report. This correction reruns all60 newly
added motion cases; it does not claim a new combined680-case run.

## Residual risk and disposition

Fades temporarily lower newly arrived text opacity and rise moves it by6px.
Those choices can be less readable than plain streaming even when correct.
No measured library defect emerged from the recorder investigation. Browser
assertions do not settle subjective smoothness or the user's preference. The
comparison pages remain live for visual review, and plain streaming stays the
library default. Optional effects require explicit imports and Motion install.
No additional presets/default changes were invented to override the user's control.
