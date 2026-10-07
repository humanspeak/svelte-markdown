# Guard report — subtle RiseWords tuning

**Recommendation: PASS** — requested tuning implemented with consumer overrides
intact and independently reproduced browser regressions.
**Reviewed at:** `a4cb8fc` · 2026-10-07 19:17.
**Planned at:** `6fa18d4`. No PR, push or merge requested.

## Done criteria

| Criterion                                        | Parent result and evidence                                                                                                       |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Smaller rise and gentle easing apply to arrivals | 4px lift and cubic-bezier `[0.25, 0.1, 0.25, 1]`; full source diff read                                                          |
| No added reflow, replay, reset or text loss      | default-cadence browser assertions bound monotonic rise, tracked-word layout, retained nodes, baseline visibility and exact text |
| Fade defaults unchanged                          | only rise branch adds easing; fade transition identical                                                                          |
| Full consumer overrides preserved                | 14 preset unit tests passed, including custom vertical targets and opacity-only overrides                                        |
| Review page and docs demonstrate tuning          | root uses actual defaults at0.18s; docs supplies rise easing with adjustable duration                                            |
| All60 motion E2E across five projects            | 60 passed in1.8m, exit0; unchanged400ms guard, retries and timeouts                                                              |
| Root/docs types and Trunk                        | normal source hooks passed; docs check0errors/1existing warning                                                                  |
| Build/package                                    | E2E web-server build/package/publint completed, All good                                                                         |
| Bundle and optional-peer boundary                | pnpm test:tree-shaking exit0 including no-peer core/root/headless                                                                |
| Collaborative preview                            | parent refreshed root/docs, exercised replay and inspected screenshots; both pages remain live                                   |

Logs: `/tmp/rise015-guard-unit.log`, `/tmp/rise015-guard-docs.log`,
`/tmp/rise015-guard-e2e.log`, `/tmp/rise015-guard-tree.log`.

## Spirit and scope

User asked for a modest RiseWords improvement and liked FadeCharacters. Travel
reduces from6px to4px and easing becomes gentler, preserving0.18s duration and
capped stagger. Plain rendering, fade presets and complete consumer overrides
retain their behavior. Documentation explains adjusted defaults and replacement.

Parent read all six changed files and scoped drift since6fa18d4. All files are
authorized; no parser, transport, provenance, dependencies, config or unrelated
edits. Executor did not edit plans or commit. No STOP condition encountered.
Parent source snapshot committed with normal hooks.

## Practical limits

This adjusts the entrance, not stream cadence. Tests establish motion behavior
and continuity, not universal visual preference. Updated live pages allow user
review. Existing inline-block word wrapping tradeoff is unchanged. No full
unrelated E2E or coverage repeat needed for scoped tuning; coverage gates unchanged.
