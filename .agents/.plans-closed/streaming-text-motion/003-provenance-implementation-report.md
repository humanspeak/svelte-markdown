# Sol provenance implementation checkpoint

Verbatim executor report.

````markdown
Stopped at the plan’s STOP condition. **Step 1 remains incomplete; the partial diff is not ready for adoption.**

Files changed:

- [streaming-provenance.ts](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/streaming-provenance.ts): mapped-string operations, occurrence sidecars, paired adoption binding, counters.
- [tracer.ts](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/streaming-provenance/tracer.ts): provisional lexer frames, consuming probes, deferred inline ownership, built-in transformation adapters.
- [streaming-provenance.test.ts](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/streaming-provenance.test.ts): origin assertions, split parity, actual clone/reuse binding, work counters.
- [parse-and-cache.ts](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/parse-and-cache.ts), [token-cleanup.ts](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/token-cleanup.ts), [incremental-parser.ts](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/incremental-parser.ts): optional collection, HTML decoding transfer, exact tail/reference relex bases.

Passing assertions include `[2,3)` versus `[6,7)` for `**a** a`, repeated link labels, escaped brackets, numeric/literal named Markdown entities, two-codepoint HTML entities, duplicate definitions, tables, task/tab handling, CRLF, and every two-chunk split of the current 15-document corpus. Actual adoption helpers exercise cloned parents and reused children.

The precise blocker is the contiguous-raw assumption at [tracer.ts:285](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/streaming-provenance/tracer.ts:285). Minimal reproducer:

```text
> - a
b
>   a
```

Installed Marked constructs root `raw` as `"> - a\nb\n\n>   a"`, introducing a newline during nested-list continuation replacement. Slicing the input by returned `raw.length` cannot map that construction. The adapter must replay this raw construction with synthetic runs before resolving descendants. This is a specific unfinished adapter, not evidence that exact provenance is impossible.

Verification:

- Required six-file test command: **276 passed, 1 failed**—the continuation case.
- `pnpm check`: **1 error**, missing `renderers`/`childTokens` in the custom-extension test fixture; three existing warnings.
- `trunk fmt`: passed.
- `trunk check`: failed with **9 new issues**, including resolver complexity and unused-variable/prefer-const findings.

Remaining work includes that continuation adapter, broader recursive/pedantic and normalized-container proofs, stronger reference-relex assertions, and type/lint cleanup. Unsupported custom transforms currently conservatively invalidate the whole parse.

No plans, dependencies, generated tracked files, API, presets, docs, commits, branches, pushes, or PRs were changed.
````
