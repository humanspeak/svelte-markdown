# Guard log: 002 compare-title-meta-tiptap-marked

## Checkpoint 1 (2026-10-28 10:58), ON TRACK

`a977135`. Final close-out after a haiku executor ran the plan in an isolated worktree.

- The executor's worktree was based on `main` (`a560881`), not the batch branch, so the plan file wasn't in it. The executor read the plan with `git show df2956da:…` and didn't edit it. That is a dispatch-shape problem, not tampering.
- The diff is limited to `docs/src/lib/compare-data.ts`, in the vs-tiptap, vs-marked and vs-svelte-exmarkdown entries only (`git diff --stat df2956d..a977135` shows 1 file, +17/−5). `description`, `tagline`, `features` and `verdict` are untouched.
- I reproduced every done criterion: 3 `seoDescription:` lines, an exmarkdown title count of 1, an old-titles count of 0, and the length guard printed `ok` (155/149/145 chars).
- My first `pnpm -C docs check` in the main checkout failed with 4 errors in `examples/streaming-text-motion` and `examples/highlight-engines`. The cause is a stale, gitignored `docs/src/lib/demo-loaders.ts` / `demo-manifest.json`, so it is environmental and unrelated to the diff. After `pnpm -C docs build` regenerated them (ignored files only, `git status` clean), the check gave 0 errors and 1 pre-existing warning.
- The rendered HTML contains the new `<title>` and meta description for all three pages, and the vs-tiptap overview paragraph is unchanged.
- `trunk check docs/src/lib/compare-data.ts` reported no issues.
- Action: verdict PASS. I updated the README status row myself (the executor was told not to). There is no PR mid-batch, by the one-branch digest convention.
