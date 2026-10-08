# Heading readiness investigation

Verbatim executor report.

```text
**The heading failure is reproducible as a lost click before hydration on both HEAD `0f0e442` and baseline `c2ca115`.** The diagnostic runs found no incorrect heading IDs.

The mechanism is concrete:

- SSR renders enabled benchmark buttons.
- SvelteKit starts hydration through dynamic imports. Browser `load` can finish while route modules remain pending.
- Playwright’s immediate click passes actionability checks and dispatches a DOM event before the handler exists.
- Hydration does not replay that click. Stats remain `scenario=idle`, with zero source and heading counts.

Both benchmark handlers assign `scenario` before parsing; `resetStat()` does not restore `idle`. Only the explicit Clear handler does that. The benchmark page and heading tests are unchanged from baseline. These cases also leave `streamingText` disabled, so the opted-in hydration initialization does not execute.

I deterministically withheld route JavaScript while preserving the real SSR page and renderer. The probe used the original default `page.goto()` lifecycle, recorded DOM clicks and `onMount` observer calls, then released the modules. In Chromium:

| Build | Browser load | Lost click | `onMount` observed |
|---|---:|---:|---:|
| Current | 742 ms | 908 ms | 1,114 ms |
| Baseline | 56 ms | 124 ms | 190 ms |

After hydration finished, the original 5-second completion assertion still failed with the same idle/zero signature. A subsequent click completed successfully with **all 2,000 expected IDs**. The large stream similarly completed with **121 headings and zero mismatches** after a hydrated click. There were no page errors or console errors in those probes.

Validation completed without retries or expanded timeouts:

| Run | Result |
|---|---|
| Unchanged heading tests, current, three repetitions across five projects | 30 passed |
| Unchanged heading tests, baseline, three repetitions across five projects | 30 passed |
| Controlled hydration probe, both scenarios × both builds × five projects | 20 passed |
| Initial heading-only controlled probe | 10 passed |
| Separate image readiness probe, both builds × Chromium/mobile Safari | 4 passed |

The controlled tests pass by asserting the lost-click behavior and then validating successful rendering after readiness. Scripts, configs, timings, and captured assertion errors remain in [/tmp/heading-diagnosis](/tmp/heading-diagnosis), particularly [probe-expanded.log](/tmp/heading-diagnosis/probe-expanded.log).

**Minimal corrective proposal:** expose a genuine readiness attribute from the benchmark page, set in its existing `onMount`, and have both heading tests wait for that attribute before clicking.

The required files would be:

- [Benchmark page](/Users/jasonkummerl/Github/streaming-text-motion-resume/svelte-markdown/src/routes/test/perf-bench/+page.svelte:1218): initialize readiness false; set true on mount; expose it on a stable element.
- [Heading tests](/Users/jasonkummerl/Github/streaming-text-motion-resume/svelte-markdown/tests/heading-metadata.test.ts:4): synchronize both clicks with that signal, retaining every existing ID assertion and timeout.

Regression coverage should delay route-module delivery, verify readiness stays false until hydration, then perform one synchronized click and preserve the exact 2,000-ID comparison. Disabling controls until mount could additionally prevent early human clicks. Disabling SSR is unnecessary.

The issue-192 image failure has a **separate asynchronous readiness mechanism**. With hydration complete and `networkidle` satisfied, withholding the real `IntersectionObserver` callback kept `src=null`; delivering it populated the correct URL on both builds. Its immediate `getAttribute('src')` assertion should become an awaited `toHaveAttribute('src', expectedUrl)`. Benchmark hydration synchronization alone would not resolve that race.

The historical failing run lacks runtime timing evidence, so I cannot prove its exact event sequence retrospectively or exclude a feature-related increase in hydration duration. However, the failure signature is deterministically reproduced on baseline, and heading correctness passes after readiness.

No source, tests, plans, commits, branches, or worktrees changed. HEAD and git status remain unchanged. Both isolated servers were stopped; port 8234 was untouched.
```
