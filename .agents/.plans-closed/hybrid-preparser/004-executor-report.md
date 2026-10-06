# Executor report — 004 literal masking, round 1

Verbatim Opus 5.5 terminal report.

```text
Plan 004 is implemented: JavaScript inside a Svelte expression or tag no longer gets mistaken for Markdown inline code. `{`hello`}` and `<Counter value={`hello`} />` now compile the way native Svelte does. Every gate passed when run one at a time, and nothing is committed.

**Changed files** (only the five in scope):
- `src/lib/preprocess/hybrid.js`
- `src/lib/preprocess/hybrid.test.ts`
- `src/lib/preprocess/hybrid-render.test.ts`
- `src/routes/test/preprocess/hybrid/+page.mdproof`
- `README.md`

**Drift check:** `git diff --stat 54eff01..HEAD -- <scope>` printed nothing and `git status --short` was clean at the start.

**Red first** (`pnpm test:only src/lib/preprocess/`, before touching `hybrid.js`):
- **Native grammar:** a scratch script confirmed `compile()` accepts every new test input first.
- **Result:** 2 files failed, 10 tests failed, 29 passed.
  - The standalone, nullish, component-prop, nested-interpolation, quoted-attribute/regex, UTF-16/bold/reference and paired-literal cases failed with `js_parse_error` ("Unexpected token" or "Unterminated string constant").
  - The comments case failed with "Unterminated comment".
  - Escape parity failed an assertion: `expected [] to deeply equal ['{data.name}', '<Counter />']`.
  - `hybrid-render.test.ts` failed because the fixture wouldn't compile: `CompileError: :19:39 ... +page.mdproof - Unexpected token`. That is the intended red, not an import or mock problem.
  - All 29 existing tests still passed.
- **STOP checkpoint hit and resolved:**
  - The first comments case passed before the fix because its backticks happened to balance. I made it use an odd backtick, and it then failed.
  - My first fixture edit (`{`${data.greeting ?? `missing`}`}`) also passed before the fix: the broken masking happened to leave valid JavaScript. I switched it to `**{`${data.greeting}`}**`, which fails.
- **Extra case:** I added a `value++ / `…`` case afterwards and confirmed it fails when the `++` handling is turned off.

**The fix:** scanning goes left to right, and whichever starts first wins.
- **Markdown literal first:** a code span, fence, autolink, definition, image or link destination stays literal. On a tie, Markdown wins.
- **Svelte first:** an unescaped `{` or `<` tag runs to its end by JavaScript rules. The scanner understands quotes, comments, template literals with nested `${}`, braces and regular expressions. Inside attributes it also handles quoted values that contain `{}`.
- **Re-pairing:** if a Svelte region overlaps a Markdown code span, the code spans are recomputed with that region blanked out, so backticks inside JS strings or comments can't pair with real code spans.
- **Escapes:** an odd number of backslashes keeps `{`, `}`, `<` or `>` literal; an even number lets a following expression stay live.
- **What didn't change:** character positions (including emoji) and newlines, the original island text, HTML routing, renderers, and dependencies.
- **Lint:** I split the code into small helpers to get under Trunk's complexity limit; there are no lint suppressions.

The fixture's inline greeting now goes through a template literal, and the runtime tests assert the exact visible text `Inline page data: Initial load.` (and `Updated load.` after rerender). The counter, events, conditional, custom headings and links, and the zero-Lexer spy assertions are unchanged and pass. The README describes this boundary under the experimental heading, and the earlier token-array paragraph from plan 001 is untouched.

**Green, run in sequence:**

| Gate | Result |
|---|---|
| focused tests | 4 files, 41 tests pass |
| `trunk fmt` | exit 0 |
| `trunk check` | exit 0, no issues |
| `pnpm check` | 0 errors, the 3 baseline warnings |
| `pnpm test` | exit 0, 168 files, 1451 tests (was 1441) |
| coverage | 97.32% statements, 92.84% branches, 98.3% functions, 98.64% lines |
| `pnpm build` | exit 0, publint "All good!" (only the existing chunk warnings) |
| Playwright (chromium) | 2 passed; port 4173 was free beforehand, so assets were built fresh |
| `git diff --check` | exit 0 |

**Limitations and assumptions:**
- **Regex vs. division:** this uses the usual guess based on the previous token (keywords, punctuation, `++`/`--`). Unusual code such as a keyword used as a property name right before `/` could be misread. If an expression looks unterminated, the scanner falls back to the old masking and Svelte reports the error.
- **`{/` in markup** is always a closing block, which matches what Svelte itself does. In attribute values, `{/regex/}` works.
- **Text inside elements** (between tags) still gets the old masking. That's HTML routing, which is out of scope.
- **Re-pairing approximation:** code spans that would start before a blanked region but end after it are ignored.
- **Deferred as instructed:** GFM bare autolinks, custom-extension literal regions, root/snippet placement (plan 005), styles, source maps and HMR.

No other deviations, and no checks were blocked.
```
