# Soft fade and rise trial — implementation PASS, visual review pending

Date: 2026-10-08
Source snapshot: `e89f59d`

Delivered independently selectable custom treatments in the existing RiseWords and FadeWords panes on <http://127.0.0.1:5260/streaming-motion>. Both use the same private SoftFadeRise rendering: easeOut lift, linear opacity fade, and existing capped batch stagger. New FadeWords trial starts at the user's 3px/.4s/.5s; RiseWords source defaults remain 2px/.14s/.24s. Parent selects both at the screenshot values 3px/.4s/.5s for live review. Both toggles remain default off in source; existing presets stay available. Four panes, raw source, pacing, library defaults, and consumer API remain unchanged.

Parent read the full revised plan and two-file contribution diff, reproduced normal Trunk/type hooks, and independently ran all 110 motion browser checks across five projects: all passed with three workers. New coverage includes simultaneous matching movement, settings independence, intermediate motion and settlement, preset fallback, exact text/baseline/Unicode, disabled/reduced motion, re-enabling, and retained partial-word entrances. All 90 inherited cases and the 400ms gate remain. Log `/tmp/fade-words-trial-guard-e2e.log`; artifacts `/tmp/fade-words-trial-guard-results`.

The prior RiseWords-only checkpoint recorded one timing miss at 416.6ms with five workers, then all 90 passing with three. This latest 110-case run passed without retries or source changes; default partial-word pending maxima were about 261–272ms. Historical timing sensitivity is recorded in the guard log, not resolved by weakening the assertion.

Revised scope satisfied: only review route and motion tests changed this round; the inherited private component is reused unchanged. No library/dependency/public API edits, stream grouping/buffering, parser changes, weakened gates, or unrelated work.

The known formatting-remount snap and embedded-preview exposure concern remain separate. This aesthetic trial does not fix those defects. User must judge perceived smoothness on the live page. Keep the batch active for that review; no PR, push, or feature progression.

Full latest executor report is preserved verbatim at `/tmp/streaming-motion-sol020-report.md`; prior report at `/tmp/streaming-motion-sol019-report.md`.
