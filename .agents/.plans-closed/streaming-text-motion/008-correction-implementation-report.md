# Sol correction implementation report

Verbatim executor report.

`````text
Round 008 corrections are complete, but **feature PASS remains blocked**: both full E2E attempts failed. I stopped at the plan’s two-attempt limit.

Changed only:

- [StreamingMotionDemo.svelte](/Users/jasonkummerl/Github/streaming-text-motion-resume/svelte-markdown/docs/src/lib/examples/llm-streaming/demos/StreamingMotionDemo.svelte): capitalized `Preset`; used `'can\u0027'`, preserving the contraction chunk boundary.
- [tree-shaking.mjs](/Users/jasonkummerl/Github/streaming-text-motion-resume/svelte-markdown/scripts/tree-shaking.mjs): removed `--legacy-peer-deps`.

Verification results:

| Command | Result |
|---|---|
| `trunk fmt <scoped files>` | Passed |
| `trunk check <scoped files>` | Passed, no issues |
| `pnpm check` | Passed: 0 errors, 10 warnings |
| `pnpm --filter docs check` | Passed: 0 errors, 1 warning |
| `pnpm build` | Passed, including publint |
| `pnpm test:tree-shaking` | Passed |
| `git diff --check` | Passed |

Normal npm installation left Motion absent. Core/root/headless bundles succeeded; explicit presets failed resolution without Motion. npm’s `legacy-peer-deps` configuration was `false`.

E2E used the unchanged five-project configuration with a temporary port override:

```text
pnpm exec playwright test --config /tmp/streaming-round008-playwright.config.ts tests/streaming-text.test.ts --reporter=line
````

**15 passed.**

```text
pnpm exec playwright test --config /tmp/streaming-round008-playwright.config.ts --reporter=line
```

- First full run: **614 passed, 1 failed**. Existing mobile Safari issue-192 test expected the image URL; `getAttribute('src')` returned `null`. Its isolated rerun passed.
- Second full run: **614 passed, 1 failed**. Existing mobile Chrome heading-metadata test timed out after 45 seconds waiting for `scenario=stream-large-done`; stats remained `scenario=idle`.

These tests were unchanged; their baseline status is not independently proven. Evidence: [first full run](/tmp/streaming-round008-full-e2e.log), [second full run](/tmp/streaming-round008-full-e2e-second.log).

T3 preview verified all three presets plus custom rendering, exact final text, intact Unicode graphemes, plain code, disabled motion, duration/stagger/granularity controls, restart baselines, and simulated reduced-motion changes with listener cleanup. Captured runtime errors were empty. Rapid resets produced two `derived_inert` warnings. Preview click tools failed; interactions continued through T3 `preview_evaluate`.

Full unit coverage was **not rerun**: round 007’s prior result remains 1,564 passes with 97.52/92.70/97.89/98.27% coverage. This round changed no library source.

Servers on 8258 and 4258 are stopped; pre-existing 8234 remains running. `.agents`, prior WIP, stash, commits, branches and worktrees were untouched. Ready for parent review, without a completion claim.

```

````
`````
