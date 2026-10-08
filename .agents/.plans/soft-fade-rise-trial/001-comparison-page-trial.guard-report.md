# Soft fade and rise trial — implementation PASS, visual review pending

Date: 2026-10-08
Source snapshot: `b2cd6f9`

Delivered an opt-in custom treatment in the existing RiseWords pane on <http://127.0.0.1:5260/streaming-motion>. It starts at 2px lift over .14s easeOut and .24s linear opacity fade, with separate controls and the existing capped batch stagger. The existing preset remains the page default; parent selected the trial for this live review. Four panes, raw source, pacing, library defaults, and consumer API remain unchanged.

Parent read the full contribution diff and reproduced normal Trunk/type hooks plus all 90 motion browser checks across five projects. Tests cover actual intermediate motion, independently varied timings and lift, exact text/Unicode, baseline visibility, disabled/reduced motion, re-enabling, and retained partial-word motion. Original 60 cases and the 400ms timing gate are unchanged.

First full parent run had one original Chromium timing miss at 416.6ms, with all 30 new cases passing. Full rerun with three concurrent workers passed all 90; pending maxima in default partial-word tests were about 259–267ms. This concurrency sensitivity is recorded, not hidden or resolved by relaxing the assertion. Logs `/tmp/soft-fade-rise-guard-e2e.log` and `/tmp/soft-fade-rise-guard-rerun.log`.

Scope satisfied: only review route, private route-local consumer component, and motion tests changed. No library/dependency/public API edits, stream grouping/buffering, parser changes, weakened gates, or unrelated work.

The known formatting-remount snap and embedded-preview exposure concern remain separate. This aesthetic trial does not fix those defects. User must judge perceived smoothness on the live page. Keep the batch active for that review; no PR, push, or feature progression.

Full executor report is preserved verbatim at `/tmp/streaming-motion-sol019-report.md`.
