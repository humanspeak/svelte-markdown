# Sol provenance research report

Verbatim executor report, preserved as a text block.

````markdown
A feasible architecture exists without forking Marked, but it requires **grammar-aware source mapping before HTML cleanup**, plus a per-instance arrival ledger. Marked hooks and token `raw` alone cannot provide the complete guarantee. This is more work than renderer metadata plumbing, and implementation should remain paused until the parent approves that scope.

I read the full committed plan and README, inspected the parser, cleanup, reuse and regression paths, and ran read-only Node experiments against installed **Marked 18.0.14** and **HTMLParser2 12.0.0**. HEAD is `d4835ee7b9525772906197629daa695f3ba979da`, branch `feat/streaming-text-motion`; the working tree remains clean. No files, dependencies, branches, commits or PRs were changed.

**Observed evidence**

| Experiment                            | Result and implication                                                                                                                                                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `**a` → `**a** a`                     | The surviving bold `a` originates at source `[2,3)`; the appended final `a` originates at `[6,7)`. An executable inline mapping experiment correctly classified the first as old and the final as new.                         |
| `[a a](/a` → `[a a](/a) a`            | Label origins remain `[1,2)` and `[3,4)`; the final appended `a` is `[10,11)`. Mapping the label from its grammar capture distinguishes every repeated `a`, including the URL’s `a`.                                           |
| `\* &#97; &amp; &#x1F600;`            | Marked emits escape text `*`, numeric entity text `a` and `😀`, but keeps the named entity `&amp;` literal in this ordinary Markdown text path. One universal HTML decoder would change existing output.                       |
| `[a\]a](/a)`                          | Marked passes `a]a` to the recursive inline lexer. The label transformation removes the backslash before `]`; child offsets cannot simply begin one character after `[`.                                                       |
| `> - a\n>   **a**\n`                  | Recursive block inputs are `- a\n  **a**`, then `a\n**a**`. Both quote and list prefixes have already disappeared before nested tokenization.                                                                                  |
| `- [x] a\n\ta`                        | Marked initially queues `[x] a` and `  a`, then runs inline tokenization on `a\n  a`. Task-list processing mutates the queued source after registration; capturing only `lexer.inline()` is insufficient.                      |
| Duplicate definitions followed by `a` | In `[x]: /x\n[x]: /x\na`, `a` begins at source offset 16, while final root `raw` lengths sum to 10. Observing consuming tokenizer calls recovered offset 16; summing emitted tokens did not.                                   |
| HTML entity callbacks                 | HTMLParser2 exposes exact input ranges for `&amp;` and `&#x1F600;`. For `&NotEqualTilde;`, it emits `≂` with the entity’s range and then `̸` with an empty range. Those callbacks must share one decoding origin.               |
| HTML cleanup                          | `<DIV>…<BR>…</DIV>` becomes lowercase structured tags, `<br/>`, and decoded text. Inline `a <SPAN>a&amp;a</SPAN> a` instead retains literal `a&amp;a` in its Marked text leaf. Provenance must follow the actual cleanup path. |
| Incremental parsing                   | Appending to `# Fixed\n\n**a` used the tail window, reused two roots, and reported divergence offset 9. Appending a reference definition produced `reuseMode: 'tree'`. Both paths need provenance support.                     |
| Token reuse                           | The existing helper cloned a changed parent and reused its old child. WeakMap metadata attached only to fresh parser objects was absent on both adopted objects.                                                               |
| Offset transport                      | Actual transport produced `"      world"` from `{offset:5,value:' world'}`, then `"Hello world"` from `{offset:0,value:'Hello'}`. Repeating the identical patch preserved the string.                                          |
| Graphemes                             | `e`→`é`, `👩`→`👩‍`→`👩‍💻`, and `🇺`→`🇺🇸` each extend one trailing grapheme. A split high surrogate also becomes one complete emoji.                                                                                              |

The inline-origin and decoding experiments included assertions. The repository modules were transpiled and loaded in memory; the incremental experiment stubbed the unused token-cache binding, while exercising the actual incremental parser, cleanup and reuse functions. These were focused experiments, not the project test suite or a complete provenance implementation.

**Recommended parsing architecture**

Use an opt-in **mapped-input tracer** around an individual Lexer instance. Leave the existing disabled path intact.

The actual construction point is [parse-and-cache.ts:40](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/parse-and-cache.ts:40), especially Lexer creation at line 52 and cleanup at line 59. `markdown-parser.ts` currently supplies exports and renderer defaults; it does not own this parsing pipeline.

The tracer should record:

- Each block/inline input frame.
- Consuming tokenizer calls and their position within that frame.
- Recursive calls and deferred inline token arrays.
- The successful built-in rule responsible for each result.
- Final merged tokens and final queued inline input.

For block calls, the normal first `space()` probe receives the full remaining input; for inline calls, `escape()` does. Their remaining-input lengths establish the current position within the known frame. Extension probes precede these and must also be observed. Do **not** calculate every rule’s position from its argument length: paragraph and inline-text arguments can be clipped by extension start hints.

Record recursive calls provisionally, then resolve their mappings through the successful parent rule. Recursive calls happen before the parent returns, and some attempted results are discarded. Only mappings reachable from the final accepted token tree belong in the result.

Use mapped-string operations rather than string matching:

```ts
type SourceInterval = {
    readonly start: number
    readonly end: number
}

type MappingRun = {
    readonly outputStart: number
    readonly outputEnd: number
    readonly mode: 'copy' | 'replacement' | 'synthetic'
    readonly sources: readonly SourceInterval[]
}

type MappedView = {
    readonly value: string
    readonly runs: readonly MappingRun[]
}
```

All offsets are UTF-16, with half-open ranges. `copy` represents an affine correspondence; `replacement` covers decoding or expansion; `synthetic` represents generated output without an exact source character. Multiple intervals support composed transformations.

The necessary built-in adapters are:

| Construct                   | Mapping algorithm                                                                                                                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ordinary text/paragraph     | Preserve input positions; compose numeric-reference decoding only where Marked performs it. Account for block-token merging before deferred inline lexing.                                                                     |
| Strong/emphasis/deletion    | Slice the accepted token’s delimiter-bounded interior. The successful token determines delimiter width; no repeated-text search.                                                                                               |
| Link/reference label        | Use the anchored label grammar capture, then apply Marked’s bracket-unescape transformation with mapping. Reference lookup changes interpretation, not label provenance.                                                       |
| Autolink                    | Map the known interior of angle delimiters, or the accepted bare URL range.                                                                                                                                                    |
| Escape                      | Map emitted punctuation to the escaped character; retain the consumed escape span separately.                                                                                                                                  |
| Heading/setext              | Map captured heading content through trimming and the installed rule’s trailing-hash handling.                                                                                                                                 |
| Table                       | Scan row delimiters with escape parity, trim individual cells, remove escaped-pipe backslashes, and preserve each cell’s distinct source range. Padded empty cells have no text provenance.                                    |
| List                        | Locate returned item raws sequentially within the parent input, then replay only their content transformations: marker removal, indentation decisions, tab expansion, continuation handling, trimming and task-marker removal. |
| Blockquote                  | Replay marker removal and setext-protection operations by source line position. Handle continuation and nested-token replacement explicitly.                                                                                   |
| CRLF/pedantic normalization | Map carriage-return normalization and tab/blank-line transformations before descendant mappings are composed.                                                                                                                  |

List and blockquote adapters are the largest unresolved implementation work. Their transforms are executable grammar logic, not constant prefix removal. Marked’s source map contains the relevant installed source: `Tokenizer.ts` list transformation at lines 343–451 and task processing at 487–540; blockquote transformation and continuation at 206–290.

These adapters need not select tokens or replace Marked’s grammar. Marked still produces the authoritative tokens. However, the adapters necessarily mirror its **text transformation rules**, creating maintenance work when Marked changes.

Validate each adapter’s generated text against the actual recursive input or leaf text. This detects drift, but **text equality alone does not prove provenance** when characters repeat. Exactness comes from recorded input positions and the specified transformation operations.

**HTML cleanup integration**

Extend cleanup additively with an optional provenance collector:

- [token-cleanup.ts:242](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/token-cleanup.ts:242): nested HTML expansion receives the mapped original HTML input.
- [token-cleanup.ts:264](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/token-cleanup.ts:264): `flushText()` attaches accumulated text mapping.
- [token-cleanup.ts:311](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/token-cleanup.ts:311): collect `ontext` input ranges and compose them through the parent mapped view.
- [token-cleanup.ts:503](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/token-cleanup.ts:503): flat pairing retains child provenance while constructing its new parent.
- [token-cleanup.ts:622](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/token-cleanup.ts:622) and [token-cleanup.ts:655](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/token-cleanup.ts:655): carry sidecars across copied list items and table cells.

Group empty-range entity continuation callbacks with their preceding decoding event. Preserve the entire original entity range for all emitted codepoints.

Do not derive character positions from normalized tag `raw` or existing root `sourceLength`. The latter deliberately absorbs dropped whitespace and trailing source to maintain incremental block spans; it is not text provenance.

Whitespace discarded by current cleanup produces no visible leaf. Implied closes and flattened unclosed children keep their original mappings. Inline flat pairing retains the existing Marked text mapping and its current entity behavior.

**Preservation through incremental parsing and reuse**

Carry provenance as a tree of **parsed occurrences**, parallel to the cleaned token tree:

```ts
type ProvenanceNode = {
    readonly sourceSpans: readonly SourceInterval[]
    readonly text?: MappedView
    readonly raw?: MappedView
    readonly exact: boolean
    readonly tokens?: readonly ProvenanceNode[]
    readonly items?: readonly ProvenanceNode[]
    readonly header?: readonly ProvenanceNode[]
    readonly rows?: readonly (readonly ProvenanceNode[])[]
}
```

Keep this internal and outside enumerable token fields. Existing semantic comparison must not start treating arrival bookkeeping as token semantics.

Thread a collector/base offset through:

- [incremental-parser.ts:974](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/incremental-parser.ts:974): tail lexing.
- [incremental-parser.ts:1193](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/incremental-parser.ts:1193): targeted reference-root relexing.
- [incremental-parser.ts:1246](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/incremental-parser.ts:1246): full parsing.

Stable tail-window prefix occurrences retain their sidecars. Newly parsed tail occurrences use `boundary.reparseOffset`; targeted citation roots use their original source start.

After token adoption in [SvelteMarkdown.svelte:229](/Users/jasonkummerl/Github/svelte-markdown/src/lib/SvelteMarkdown.svelte:229), bind occurrence provenance to the **adopted** nodes with a paired walk of changed subtrees. This handles both reused children and cloned parents without changing the reuse algorithm.

A cache hit requires both stable token identity **and equivalent occurrence provenance**. Identical token text can occur at a different source location; token identity alone is insufficient.

**Arrival identity and public metadata**

Maintain a per-component source ledger, separate from token identity:

1. Seed supplied/reset content as baseline.
2. Give appended source runs distinct identities and batch birth records.
3. For an offset patch, compare only its overwritten range at corresponding source positions. Preserve equal units; give changed units new revision identities.
4. Treat synthetic gap padding conservatively as baseline; filling an existing gap is a revision. Actual supplied content beyond the previous end is an append.
5. Project mapped leaves through this ledger before rendering and record their first visible batch.
6. Preserve reveal history through wrapper changes and temporary grammar hiding. Remove overwritten/deleted source identities and clear everything at epoch changes.

A source identity can be represented internally by `{pieceId, offsetWithinPiece}`. Reset replaces the ledger and advances a local epoch. No singleton, random identifiers or wall-clock dependence is needed.

Recommended exported metadata:

```ts
type StreamingTextRange = {
    readonly start: number
    readonly end: number
    readonly originId: string
    readonly change: 'baseline' | 'append' | 'revision'
    readonly batchId: number
    readonly revealedBeforeBatch: boolean
}

type StreamingTextMetadata = {
    readonly epoch: number
    readonly leafId: string
    readonly renderBatchId: number
    readonly provenance: 'exact' | 'unknown'
    readonly ranges: readonly StreamingTextRange[]
}
```

Ranges describe the exact text supplied to the helper, not mutable tokens. Copy ranges can be compact affine runs internally; exported origins must distinguish repeated occurrences.

Keep the planned segment fields, including `change`. Segment identity comes from its source anchor and segmentation policy, independently of the Markdown wrapper. Retain an unfinished segment’s ID when its trailing word or grapheme extends.

Distinguish **creation eligibility** from source birth: an existing mounted segment retains its creation fields across unrelated updates, while an old segment recreated under a new wrapper receives `isNew=false`. Prepare reveal state before snippets run; rendering and metadata reads must not mutate it.

For `**a` → `**a** a`, the bold `a` inherits the already revealed source identity at offset 2. The final `a` has an appended identity at offset 6. The same rule handles repeated link labels.

When an entity or grapheme completes, previously revealed contributions keep the resulting segment revealed. Additional combining marks, ZWJ components or the low surrogate extend that segment rather than creating another entrance.

Non-append `source` replacement already rebuilds the component’s stream state; it should start a baseline epoch. Offset patches remain revisions within the epoch. Reset, `streamId`, disable/re-enable, token-array source and effective streaming/async transitions discard stale state. Relevant lifecycle hooks are [SvelteMarkdown.svelte:334](/Users/jasonkummerl/Github/svelte-markdown/src/lib/SvelteMarkdown.svelte:334), [SvelteMarkdown.svelte:347](/Users/jasonkummerl/Github/svelte-markdown/src/lib/SvelteMarkdown.svelte:347), and the synchronous `streamId` check at line 456.

**Renderer and extension boundaries**

Project only leaves that follow the actual renderer routing. Metadata belongs at both rawtext fallbacks, [Parser.svelte:573](/Users/jasonkummerl/Github/svelte-markdown/src/lib/Parser.svelte:573) and [Parser.svelte:601](/Users/jasonkummerl/Github/svelte-markdown/src/lib/Parser.svelte:601), and at supported leaf renderer/snippet props. Reserve it after passthrough props and exclude it from inherited child props and DOM attributes.

Escape uses its own renderer; code and codespan do not ordinarily use rawtext. Supply appropriate leaf metadata where promised, while retaining the plan’s exclusion of code from default word animation.

For custom tokenizers, extensions or text-mutating callbacks without a provenance adapter:

- Preserve rendering.
- Mark affected provenance unknown.
- Suppress automatic entrance eligibility for unknown text.
- Do not infer exactness from token type, matching `raw`, or matching repeated text.
- Invalidate descendants whose transformed input cannot be established.

This is an explicit conservative fallback, not exact extension support. A future extension adapter API can provide validated mappings; it is unnecessary for the initial public API.

**Cost and disabled behavior**

With tracking disabled, use the current Lexer/cleanup path, allocate no ledger or provenance collector, perform no projection or segmentation walks, and preserve `inlineTextOk`. Core and the headless helper import no Motion. No default wrappers or animation are introduced.

With tracking enabled:

- Source-ledger append cost is proportional to appended input, with compact interval bookkeeping.
- Provenance work follows reparsed frames and changed occurrences; stable completed blocks keep cached mappings.
- HTML mapping rides the existing parser callbacks.
- Segmentation runs only for changed leaves. Completed leaves are not revisited.
- Arbitrary custom segmenters require resegmenting the changed leaf unless they explicitly promise incremental behavior.
- Revisions and existing full-parse fallbacks may cost O(document). Long open paragraphs/lists may themselves contain most of the document.

The credible guarantee is **no additional unconditional historical-text flattening on ordinary tail appends**. Constant work per chunk for every grammar shape is not achievable with the existing parser. Add deterministic counters for mapped units, projected leaves and segmentation input; distinguish stable completed blocks from the open reparsed block.

SSR uses deterministic local epochs and IDs, baseline eligibility, and no browser-only mutation during render. Explicit locale helps consistency, but differing server/browser Intl data can still alter segmentation; deterministic custom segmentation is the strongest option when that matters.

**Required scope and regression changes for parent review**

Approve provenance work in `parse-and-cache.ts`, a dedicated internal provenance module and tests, `token-cleanup.ts`, and `incremental-parser.ts`. The current Step 1 instruction to project and reconcile visible prefix/suffix text must be replaced by source-origin projection; it cannot remain the primary identity algorithm. Neither the sanitizer nor Marked token semantics need to change.

Require these tests before UI/preset implementation:

- Exact origins and eligibility for both decisive repeated-text completion cases.
- Escaped brackets; numeric entities, invalid numeric values and literal named Markdown entities.
- HTML named/numeric entities, especially two-codepoint callbacks; normalized void tags; whitespace dropping; unclosed flattening and later closure.
- Nested quote/list origins, tabs, lazy continuations, task markers, loose lists, setext protection and repeated table cells with escaped pipes.
- Dropped duplicate definitions and split CRLF input.
- Provenance parity between one-shot and incremental parsing at every tested chunk boundary, including targeted reference relexing and actual token adoption.
- Identical offset patches, overwritten interiors, untouched suffixes, extension past end, synthetic gaps and out-of-order fills.
- Same-text reset seeds, same-tick `streamId`/write, two isolated instances, toggles and source replacement.
- Combining marks, ZWJ emoji, regional flags and split surrogate pairs; stable segment IDs and no replay.
- Unknown extension fallback; rawtext snippet/component parity; sanitizer and disabled DOM parity.
- Work counters proving stable completed blocks are neither projected nor segmented on later appends.

Keep all original product requirements: `FadeWords`, `RiseWords`, `FadeCharacters`, the isolated Motion subpath, optional peer plus test devDependency, executable preset/custom docs, and unchanged default core behavior.

The remaining objection is **proof coverage**, not an identified impossibility. Inline origins, decoding callbacks, incremental boundaries and the reuse hazard were demonstrated. A complete list/blockquote/merge tracer was not implemented or exhaustively proved here. Parent approval should authorize that provenance implementation and its parity gates first; full correctness should not be claimed until those pass.
````
