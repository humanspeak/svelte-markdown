# Guard log — 002 breadcrumb structured data

## Checkpoint 1 — 2026-09-22 06:29 — PLAN AMENDED

`2302cef` · preflight and operator-directed ownership correction.

- Operator requested a docs-kit fix rather than a consumer workaround.
- Shared component blindly emitted unlinked intermediate UI groups in JSON-LD.
- Plan amended to preserve UI context and fix the shared serialization boundary.
- Action: dispatched GPT executor through the Codex companion, serially.

## Checkpoint 2 — 2026-09-22 06:29 — ON TRACK

Docs-kit `2e6c93b8672a2f670c058efe122a2f245a5c3d3b` · shared source snapshot.

- Source changes are only the breadcrumb serializer, component regression tests,
  fixture, test command and README. Reviewed full diff from `6ed32d3`.
- Independently compiled original `6ed32d3` component with the new tests in ignored
  `.svelte-kit/guard-red-002`: 2 intended assertion failures, 4 passes.
- Independently ran `pnpm test`: 12/12 pass after package build. Logs retained in
  `evidence/breadcrumbs/`. Commit hooks ran Trunk formatting/checks and svelte-check.
- Original UI context is frozen and compared before/after in tests; no mutation.
- Existing URL construction remains unchanged; absolute hrefs/trailing base slash
  are explicitly outside this fix's scope and documented as caller constraints.
- Toolchain: global pnpm launcher rejected old native-binary metadata; using the
  already-installed pinned pnpm 11.4.0 via PATH completed frozen install/checks.
- Action: publish explicit docs-kit feature branch for immutable consumer pin;
  dispatch consumer integration next. No main push, release, or deployment.

## Checkpoint 3 — 2026-09-22 06:42 — DRIFTING

Consumer `f7d3a60` · immutable docs-kit pin and production regression snapshot.

- Frozen install passed with the new fetchable commit; exact build approval was
  updated, preserving policy. Pnpm generated an obsolete old-SHA placeholder;
  executor removed it and a subsequent frozen install passed without re-adding it.
- Snapshot hooks passed Trunk formatting/checks and root svelte-check.
- Guard production browser suite: 30 pass, 1 fails. `/docs` expects 200 but receives
  the intentional 301 from `docs/src/routes/docs/+page.server.ts` to getting-started.
  All registered content paths and hydration/SPA/visible grouping checks passed.
- Correction dispatched: explicitly assert that one redirect and validate its
  expected destination; retain strict no-redirect checks on content pages.
- Docs svelte-check: 0 errors, 1 existing unused-CSS warning. Navigation source
  and layout unchanged. Nightly state remains outside this source snapshot.

## Checkpoint 4 — 2026-09-22 06:46 — ON TRACK (final PASS)

Consumer `97de3f8`; shared docs-kit `2e6c93b8672a2f670c058efe122a2f245a5c3d3b`.

- Reviewed the complete consumer diff and explicit redirect correction.
- Guard reran production build + browser suite: 31/31 pass, including 25 registered
  docs routes, the docs redirect destination, comparison/example/blog/home samples,
  hydration and actual SPA transitions. Visible grouping labels are preserved.
- Root types and Trunk passed source commit hooks; docs types have 0 errors and
  1 existing unused CSS warning. `git diff --check` passed.
- Original nightly state is byte-for-byte identical to pre-dispatch backup.
- Consumer navigation/layout/library source unchanged. Feature ref is remotely
  available at the exact pinned SHA. No deployment, release, or Search Console action.
- Guard updated index/status. PR deferred under dispatch batch workflow.

## Checkpoint 5 — 2026-09-22 08:42 — ON TRACK (release pin PASS)

Consumer `9682d73` · docs-kit release `2026.9.1`.

- Operator clarified that consumer dependencies must use released version tags.
- After the requested five-minute wait, GitHub reported PR 21 merged at
  2026-09-22T12:23:53Z and release 2026.9.1 published at 12:24:26Z.
- Tag resolves to `e65933a409be4be8d4663220d0271e3f0e654ab5`; its complete tree
  `6cae5078f299075b6d9f1ebf2008bbd38ca1fe81` is identical to tested 2e6c93b.
- Executor replaced the manifest SHA with `github:humanspeak/docs-kit#2026.9.1`
  and updated the exact pnpm build-approval key. Guard generated the lockfile.
  The lockfile and build approval retain the resolved commit, as pnpm requires.
- Pnpm generated an obsolete old-SHA approval placeholder; executor removed only
  that line. Final frozen install passes with the existing policy preserved.
- Initial browser run passed 30 SSR cases but failed hydration. Browser diagnostics
  showed HTML initializing `__sveltekit_40fm8j` while client code accessed
  `__sveltekit_1417rha.data`. Guard had run type generation concurrently with the
  build. A serial production rebuild and unchanged test suite passed 31/31.
  Both test outputs are retained; no test assertion or source was changed.
- Docs types: 0 errors, 1 existing CSS warning. Source commit hooks passed Trunk
  and root types. Full source diff is only three dependency/lock/policy files.
- Unrelated nightly state remains byte-identical to the pre-update backup.
  Deployment and Google validation still pending.
