# Preserve active streaming entrances through markdown renderer changes

Planned at: `6df6b85`
Date: 2026-10-08
Executor: Sol (`codex`, `gpt-6.1-sol`), T3 async delegation
Status: READY

## Executor instructions

Work only in `/Users/jasonkummerl/Github/streaming-text-motion-resume/svelte-markdown`, branch `feat/streaming-text-motion-resume`. Parent is guard and never edits source. Do not edit this plan or guard artifacts, commit, push, open a PR, touch other worktrees/stashes, or stop the review server on port 5260. Full-access runtime permits installations and real tests; older skill sandbox restrictions do not apply.

## Why this matters

The user requires the actual `/streaming-motion` review page to feel smooth before proceeding. Passing motion tests did not establish that visual quality. Investigation 016 identified a real discontinuity under the current whole-word, 180ms setting: the chunk `'**new '` renders plain and animated; `'thought** '` reparents/replaces it under `<strong>` while its entrance is active. The replacement receives `initial=false`, snapping opacity from about .35 to 1 and RiseWords to its final vertical position. Markdown delimiters disappearing also change horizontal layout. These are distinct issues; preserving opacity and vertical motion cannot promise removal of typography/reflow changes.

Solve the confirmed interrupted entrance against unchanged raw streaming input. A demo that groups complete markup constructs avoids this case but does not establish a fix for raw streaming. User acceptance of overall smoothness remains a live review gate.

## Baseline and evidence

- HEAD `6df6b85`, clean before this plan.
- Current RiseWords defaults: y=4px, duration=.18s, ease=[.25,.1,.25,1], batch stagger .02s capped .16s. Consumer overrides replace defaults.
- Actual review page defaults .18 / word and passes undefined transition, so the tuned defaults already apply.
- Sol016 reproduced the interrupted entrance in Chromium and WebKit using existing compiled assets. Evidence `/tmp/motion016c-chromium-target.json`, `/tmp/motion016c-webkit-target.json`, `/tmp/motion016-evidence.json`; harness `/tmp/motion016c.mjs`.
- Controlled compiled-browser cadence did not reproduce universal four-pane starvation. Parent preview showed one-second gaps with `preview_status.visible=false`, despite document visibility being visible. Foreground/preview throttling is unresolved, not a demonstrated library defect.
- Root server restarted by parent on 2026-10-08, session 53100, URL <http://127.0.0.1:5260/streaming-motion>. T3 child previews can differ from parent tab_g; do not silently equate them.
- Earlier test-only DOMRange observer overhead was fixed. The live page contains no recorder; do not reuse that diagnosis for this complaint.

## Scope

First investigate a safe, bounded mechanism for preserving an already-active optional preset entrance across a rawtext renderer replacement. In-scope implementation, only if investigation supports it:

- `src/lib/streaming/motion/**` and private helpers needed by those presets.
- Motion-specific unit tests and `tests/streaming-motion.test.ts`.
- README and existing streaming motion docs, only if behavior/limitations need documentation.
- Root `src/routes/streaming-motion/+page.svelte` only for a transparent diagnostic control needed to review the actual fix, not changing raw input/default settings or hiding the failure.

Out of scope: parser output/unfinished-markdown semantics, provenance public API changes, automatic source buffering, changed core/default renderer behavior, package/dependency changes, new whole-app animation policy, docs redesign, arbitrary FadeCharacters/RiseWords tuning, test gate relaxation. Changes to core streaming context or SvelteMarkdown require returning a concrete proposal before implementation.

## Investigation and implementation contract

1. Reproduce the identified snap against current source served at 5260, or an explicitly documented equivalent browser-test environment. Record baseline first, with lightweight probes and exact text.
2. Explain where motion lifetime is stored, how renderer replacement loses it, and whether stable exact provenance can safely associate old and replacement segments. Do not equate display-text offsets with source offsets through markdown delimiters.
3. If a bounded preset-only fix is supported, implement it. Preserve current elapsed progress/remaining timing for a still-active entrance; never replay settled or baseline content. Retain consumer initial/animate/transition/variants/custom semantics. Avoid global shared state across independent renderer instances, render requests, streams, replay epochs, panes, or optional consumer effects. Define cleanup and bounded lifetime. Reduced motion/disabled must still immediately show exact text.
4. Do not introduce repeated computed-style/layout reads per segment per frame in normal runtime. Measure the fix's own overhead separately from observer overhead.
5. If identity, lifecycle, public Motion API, or isolation cannot be solved within scope, stop source implementation and return a mechanical diagnosis with the minimal necessary expansion. Do not implement a brittle workaround merely to pass the test.
6. Add regression coverage that fails before the fix: an unfinished emphasis construct completing mid-entrance must not prematurely snap opacity/vertical motion to its endpoint. Verify completion settles normally, baseline/settled content never replays, raw final text remains identical, independent streams remain isolated, replay/reset does not retain stale motion. Include consumer override/disabled behavior as appropriate to the actual mechanism.
7. Preserve existing raw word/fragment tests, can->can't continuity, grapheme/whitespace behavior, and 400ms oldest-pending gate. Any timing assertion must distinguish legitimate delayed/staggered entrances from a premature snap.

## Done criteria

- Read full contribution diff; no out-of-scope or plan edits.
- Reproduce the original baseline snap and new continuity evidence against raw streaming in Chromium and WebKit.
- Relevant motion unit tests and all streaming-motion E2E projects pass, with original assertions preserved.
- `trunk fmt`, `trunk check`, `pnpm check`; use Trunk, never raw Prettier/ESLint or eslint-disable comments.
- Build/package/no-peer isolation if runtime exports/imports change; report commands and exact results.
- Server remains accessible at the user's original URL. No PR/push.
- Clearly report remaining horizontal layout/formatting changes and preview-throttling uncertainty. Automated mechanical success is not user visual acceptance; keep this batch open for live review.

## STOP conditions

- Baseline in-scope drift from planned SHA beyond this plan-only commit.
- Need to change core provenance/parser/context or public Motion APIs, inability to preserve overrides/isolation/cleanup, or dependency expansion.
- Proposed solution hides the raw input discontinuity instead of addressing the optional preset lifetime.
- No reliable baseline reproduction; report environment limitation instead of inventing a fix.
