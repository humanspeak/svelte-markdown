# Plan 004 — Shiki syntax-highlighting extension: spike design report

> **Status: spike complete, prototype working.** The renderer highlights code
> synchronously, keeps `streaming` enabled (no async-extension warning), passes
> DOM-parity and memoization tests, and stays out of the core bundle. It is
> **not shipped**: the subpath is unexported, `package.json` `exports` and the
> `extensions` barrel are untouched, and `shiki` is a `devDependency` only.
> Shipping is the follow-up decision this report scopes.
>
> The one material caveat is **per-block highlight cost** with the synchronous
> JS regex engine — see [Measured numbers](#measured-numbers) and
> [STOP condition hit](#stop-condition-hit-frame-budget). It does not sink the
> design (memoization contains it and there is a faster still-streaming-safe
> engine), but it must be a conscious ship decision.

## What was built

`src/lib/extensions/shiki/`:

- `createShikiHighlighter.ts` — wraps Shiki's **synchronous** core
  (`createHighlighterCoreSync` from `shiki/core`) with the pure-JS regex engine
  (`createJavaScriptRegexEngine` from `shiki/engine/javascript`). Consumer
  supplies explicitly-imported `langs`/`themes`. Returns a tiny
  `{ highlight(code, lang), hasLang(lang) }` facade. Unregistered/empty langs
  and any per-block failure degrade to an **escaped** `<pre class="shiki-fallback">`
  — never throws mid-stream. Also exports `escapeHtml`.
- `ShikiCode.svelte` — a `code`-token renderer with the exact `Props` shape of
  the built-in `Code.svelte` (`lang`, `text`), plus an optional `highlighter`
  prop. `html` is `$derived` purely from `(text, lang, resolved)`, so unchanged
  blocks are not re-highlighted. Renders via `{@html}`.
- `shikiContext.ts` — highlighter injection channels: `SHIKI_CONTEXT_KEY`
  (Svelte context) and a module singleton (`setShikiHighlighter` /
  `getShikiHighlighter`).
- `index.ts` — local barrel (deliberately **not** wired into the package
  `extensions` barrel).

Usage is the standard custom-renderers prop — no new component API:

```svelte
setShikiHighlighter(createShikiHighlighter({ langs: [js, ts], themes: [githubDark] }))
<SvelteMarkdown {source} renderers={{ code: ShikiCode }} />
```

Because highlighting is a renderer concern only (no marked tokenizer, no
`walkTokens`), the streaming tail-window logic in `incremental-parser.ts` is
untouched and `SvelteMarkdown`'s `hasAsyncExtension` guard never trips.

## Shiki API findings

- **Installed version**: `shiki@4.3.1`. The synchronous core API the design
  depends on **exists**: `createHighlighterCoreSync` is exported from
  `shiki/core`. STOP condition ("no synchronous core API") **not** hit.
- **Engine**: `createJavaScriptRegexEngine()` (`shiki/engine/javascript`) is a
  fully synchronous regex engine — no WASM, no top-level `await`. This is the
  piece that keeps `highlighter.codeToHtml` synchronous and therefore
  streaming-safe.
- **Langs/themes wiring**: consumer does explicit ESM imports, e.g.
  `import js from 'shiki/langs/javascript.mjs'`,
  `import githubDark from 'shiki/themes/github-dark.mjs'`, and passes them as
  `{ langs, themes }`. Only what is imported is bundled. Language **aliases**
  come for free — registering `javascript` also matches `js`/`cjs`/`mjs`
  (`getLoadedLanguages()` includes them), so `hasLang('js')` is `true`.
- **Type quirk**: Shiki's sync-mode option types demand already-resolved
  registrations (`MaybeArray<LanguageRegistration>[]`), but the sync loader also
  accepts the `{ default: … }` ESM module shape a consumer actually gets from
  `import js from 'shiki/langs/*.mjs'` (verified at runtime). The wrapper keeps
  the ergonomic `LanguageInput`/`ThemeInput` public types and bridges that quirk
  with a single documented cast.
- **SSR**: the sync core runs server-side with no special handling — the demo
  route server-renders fully-highlighted `class="shiki"` markup (confirmed via a
  server fetch, no client JS). No WASM means no SSR asset/loader concerns. This
  is a real advantage of the JS-engine path over the WASM/oniguruma path.

## Measured numbers

Measured in this worktree (`shiki@4.3.1`, Node 24, `github-dark`, JS regex
engine unless noted).

### Bundle size added (1 theme + 2 langs)

A minified bundle of `createHighlighterCoreSync` + JS engine + `javascript` +
`typescript` langs + `github-dark` theme:

| Metric   | Size         |
| -------- | ------------ |
| Minified | **516.2 KB** |
| Gzipped  | **84.8 KB**  |

This is dominated by the TextMate grammars (js/ts are large) and the JS regex
engine. It is far larger than the core package's "~15KB" positioning — which is
exactly why highlighting **must** be an opt-in, explicitly-imported subpath and
must never touch the default `Code` renderer. The tree-shaking guard
(`core component stays shiki-free`) enforces this: the core `SvelteMarkdown`
bundle contains zero `shiki`/`@shikijs` modules.

### Per-block highlight cost — JS regex engine (synchronous)

One-time highlighter setup: **~16.6 ms**. Per `codeToHtml` (warm, avg):

| Block size | ms/call | ms/line |
| ---------- | ------- | ------- |
| 10 lines   | ~16.9   | ~1.7    |
| 30 lines   | ~38.4   | ~1.3    |
| 60 lines   | ~97.9   | ~1.6    |
| 100 lines  | ~121.8  | ~1.2    |
| 200 lines  | ~137.3  | ~0.7    |

Roughly linear at **~1.2–1.7 ms/line**. A ~100-line block (~122 ms) is ~7.6×
one 16 ms frame. **A single non-trivial block exceeds the streaming frame
budget when it is (re)highlighted.**

### Per-block highlight cost — oniguruma WASM engine (comparison, not shipped)

The WASM oniguruma engine requires an **async one-time WASM load** (~70 ms), but
per-block `codeToHtml` stays **synchronous** afterward — so a "load WASM once at
setup, highlight synchronously per block" shape is **still streaming-safe** (the
async is in setup, not in a marked `walkTokens` extension). It is ~2.5× faster
per block:

| Block size | JS engine | oniguruma (sync after WASM load) |
| ---------- | --------- | -------------------------------- |
| 10 lines   | ~16.9 ms  | ~5.3 ms                          |
| 30 lines   | ~38.4 ms  | ~14.2 ms                         |
| 100 lines  | ~121.8 ms | ~48.6 ms                         |

Still over the frame budget for large blocks, but materially cheaper. This is
the single biggest lever for the ship decision (see open questions).

### Streaming test outcome

`ShikiCode.test.ts` (5 tests, all green):

- **Streaming compatibility (load-bearing)**: `<SvelteMarkdown streaming>` with
  `renderers={{ code: ShikiCode }}`, streamed word-by-word, produces **no**
  async-extension console warning and DOM **identical** to the non-streaming
  render (normalized). Proves `streaming` stays enabled and output is at parity.
- **Memoization survives token churn (load-bearing)**: after a code fence
  completes, streaming trailing prose does **not** re-invoke `highlight()` for
  the unchanged block (spy on the highlighter; zero re-highlights of the final
  code text). Confirms the `(text, lang)` `$derived` memo pays off because the
  incremental parser preserves the completed block's component/token identity.
- Component happy-path, unregistered-lang fallback, no-highlighter degradation,
  and `<script>`-never-mounted.

`createShikiHighlighter.test.ts` (10 tests, all green): happy path with token
spans, alias resolution, unregistered fallback, empty lang, `<script>` escaped
(shiki emits `&#x3C;`), and **adversarial-lang injection** — crafted info
strings (`"><img src=x onerror=…>`, `'><svg onload=…>`, etc.) never appear
verbatim, never form a raw `<img>/<svg>/<script>`, and surface only as an
escaped `data-lang` attribute value.

### Tree-shaking

`pnpm test:tree-shaking` — all 6 cases pass, including the new
`core component stays shiki-free` case asserting the core `SvelteMarkdown`
bundle excludes `node_modules/shiki` and `node_modules/@shikijs`.

## Security — the `{@html}` sink

`ShikiCode` injects the highlighter's HTML string via `{@html}`, the same sink
`KatexRenderer.svelte:40` and `MermaidRenderer.svelte:80` already use. The trust
argument is the same **and** slightly stronger:

- **Code text**: Shiki tokenizes and **escapes** the code it emits (it produces
  `&#x3C;` for `<`), so user/agent code content is never live markup. The
  unregistered-lang **fallback** independently HTML-escapes the code text.
- **The `lang` (fenced info string) is untrusted** — in this package's headline
  agent/LLM-streaming use case it is attacker-influenced. The fallback path
  **escapes, never interpolates** `lang` (emitted only as an escaped `data-lang`
  attribute); the registered path passes `lang` to Shiki as a lookup key, not
  into markup. Covered by dedicated adversarial-injection tests.
- Net: the `{@html}` sink only ever receives library-generated (Shiki) or
  explicitly-escaped markup — same trust class as the existing KaTeX/Mermaid
  renderers. **Recommendation**: document this explicitly on the ship docs page
  (as KaTeX/Mermaid are), and keep the fallback's escape-only guarantee under
  test so a future refactor can't silently start interpolating `lang`.

## Ship checklist (for the follow-up plan)

- [ ] `package.json`: move `shiki` from `devDependencies` to an **optional peer
      dependency** — mirror KaTeX exactly: `peerDependencies.shiki` +
      `peerDependenciesMeta.shiki.optional: true`.
- [ ] `package.json` `exports`: add `./extensions/shiki` subpath (mirror
      `./extensions/katex`).
- [ ] `src/lib/extensions/index.ts`: export `ShikiCode`, `createShikiHighlighter`,
      and the injection helpers from the barrel.
- [ ] README.md + docs site: usage page (explicit lang/theme imports, injection
      choice, the `{@html}`/escaping security note, the per-block cost caveat and
      recommended block-size / engine guidance).
- [ ] `docs/src/lib/compare-data.ts`: flip the three "no built-in code
      highlighting" cons (lines ~128, ~481, ~639) and the Code Highlighting row
      (~103–105) now that a first-party extension exists.
- [ ] Decide the **injection API** to document as canonical (see open questions)
      and trim the spike's other channels if desired.
- [ ] Decide the **engine** (JS vs oniguruma-WASM) — see open questions.
- [ ] Keep the tree-shaking `core component stays shiki-free` case.

## Open questions

1. **Highlighter injection — which one is canonical?** The spike ships three
   (prop, context, singleton). The renderers-map only forwards `lang`/`text`, so
   the prop is only reachable via a user wrapper. **Recommendation**: document
   the **module singleton** (`setShikiHighlighter`) as the simple default and
   **Svelte context** (`SHIKI_CONTEXT_KEY`) for apps needing per-subtree themes
   (e.g. SSR request isolation, multiple themes on one page). Keep the prop as an
   escape hatch.
2. **Engine choice — JS regex vs oniguruma WASM.** The JS engine is
   zero-WASM/SSR-trivial but ~2.5× slower per block; oniguruma is faster and
   still streaming-safe (async load once, sync per block) but adds a WASM asset
   and an async setup step. **Recommendation**: default to the **JS engine** for
   SSR simplicity and document oniguruma as an opt-in for highlight-heavy,
   client-rendered apps.
3. **Frame budget for the actively-streaming block.** Memoization protects
   _completed_ blocks, but the block currently being streamed is re-highlighted
   on each chunk, and a large block blows the budget. **Options to evaluate at
   ship time** (all renderer-level, none touch streaming internals): (a) render
   a plain escaped `<pre>` while the fence is still open and highlight once on
   completion (detectable because an open fence yields a growing `code` token);
   (b) size/line threshold above which highlighting is deferred or skipped;
   (c) oniguruma engine to cut the constant. Worker offload is explicitly out of
   scope.
4. **Dual light/dual-dark themes.** Shiki's `codeToHtml` supports a `themes`
   (multi-theme) mode with CSS variables for automatic light/dark. Not spiked;
   worth exposing so consumers get theme-aware output without re-highlighting.
5. **Lazy language registration.** All langs are registered up front. Shiki
   supports incremental `loadLanguage`, but that is async — incompatible with the
   sync render path unless pre-registered. Likely stays "import what you need."
6. **Bench corpus.** If Plan 003 landed, a code-heavy corpus in the
   `stream-extensions` bench would quantify the streaming cost of the
   actively-highlighting block — noted here, not done in this spike.

## STOP condition hit: frame budget

Per the plan's second STOP condition ("synchronous highlighting of a typical
block costs enough to visibly blow the streaming frame budget — report numbers;
a memoization-only mitigation is in scope"): **the numbers confirm the concern**
(a ~100-line block ≈ 122 ms with the JS engine, ~7.6 frames). Per the plan this
is a **report-and-continue**, not an abort: memoization (implemented) contains
the cost for completed blocks, and the report documents the residual
actively-streaming-block cost plus mitigations (open question 3) and the faster
still-sync oniguruma alternative (open question 2). No worker offload was
attempted (out of scope). No other STOP conditions were hit — the sync core API
exists, and the streaming parity test passes without touching streaming
internals.

## Verification (all green in this worktree)

| Gate                       | Result                                                      |
| -------------------------- | ----------------------------------------------------------- |
| `pnpm check`               | 0 errors (4 pre-existing warnings in unrelated files)       |
| `pnpm test`                | 144 files, 958 tests pass; coverage 96.13/90.44/96.29/97.69 |
| `pnpm test:tree-shaking`   | all 6 cases pass (incl. `core component stays shiki-free`)  |
| `trunk fmt && trunk check` | no issues on the 10 changed files                           |
| `pnpm perf:bench`          | completes; core scenarios unaffected                        |

**Demo route for human inspection**: `src/routes/test/shiki-spike/+page.svelte`
(`/test/shiki-spike`) — registered JS/TS/JSON blocks, unregistered-lang
fallback, adversarial-lang case (with the escaped sink output shown), a
sync-engaged / no-async-warning indicator, live per-block timing, and a live
code-heavy streaming demo.
