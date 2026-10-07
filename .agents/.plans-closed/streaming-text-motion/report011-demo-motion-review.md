# Motion demo corrective checkpoint — 2026-10-07

Snapshot: `ea5a817`. Verdict: **NO-PASS** for corrective visual/browser review.

The previous functional PASS did not establish visual quality. User rejected the
unstyled docs controls, diagnostic fixture as a review destination, and motion
quality compared with plain streaming. User explicitly requested real motion E2E.

Sol round011 restyled the docs demo, added `/streaming-motion` with simultaneous
plain/FadeWords/RiseWords/FadeCharacters panes, and actual browser animation tests.
Parent read the entire three-file contribution and snapshot committed through the
commit skill; normal hooks passed. No core/dependency edits. Stash retained.

Parent reproduction: docs check 0 errors/1 existing warning. Chromium focused
E2E: 9 passed/1 failed. `tests/streaming-motion.test.ts:284` expects an impossible
`baseline + 'W'` frame: fragment splitting emits `We`, then whitespace. Existing
recorder target also never exercises a changing word. Its setup uses duration 2s,
so it cannot support a claim about default-duration streaming quality.

Parent inspected docs screenshots at 1280x800 and 390x844. Controls now fit;
mobile demo scrollWidth/clientWidth both 341px. Output uses Inter. Comparison
page is visible at <http://127.0.0.1:5260/streaming-motion>. Sampled preview frames
have equal plain/motion text and settled opacity 1; preview sampling alone does
not establish perceived smoothness or absence of visibility backlog.

Next correction: exercise actual `can` to `can't` word updates with retained node
and no entrance restart, stable graphemes for character preset; record default
0.18s duration at realistic cadence, intermediate and settled states, and exact
text/baseline visibility. Reproduce across all five configured projects. Report
any actual motion defect for a scoped executor fix. Visual-quality acceptance
remains open. No PR or push authorized/requested.
