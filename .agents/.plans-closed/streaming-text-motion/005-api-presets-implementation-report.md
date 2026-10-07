# Sol API and presets implementation report

Verbatim executor report.

```markdown
Stopped at the plan’s **two failed verification attempts** condition. The partial diff is preserved; Steps 2–5 are **not complete or ready for adoption**.

Implemented provisionally:

- Headless `StreamingText`, exported readonly types, validated Unicode segmentation, keyed segments, and trailing-segment identity.
- Per-instance source ledger and provenance capture/binding after token adoption.
- Lifecycle plumbing and rawtext snippet/component metadata delivery at both fallback sites.
- Three optional presets and the Motion subpath, optional peer, and devDependency using installed Motion **1.2.1**.

The blocker is exact text preservation in presets. Both test attempts returned extra whitespace: `"a "` instead of `"a"` and `"👩‍💻  é "` instead of `"👩‍💻 é"`. Removing whitespace at the preset call site did not resolve it. The installed Motion container appears to emit trailing whitespace; that cause remains to be confirmed.

Verification:

| Gate                            | Result                                               |
| ------------------------------- | ---------------------------------------------------- |
| Headless/helper tests           | 10 passed                                            |
| Focused helper/component tests  | 24 passed after correction                           |
| Snippet, stream-ID, reset tests | 37 passed; required rawtext failure reproduced first |
| Preset tests, both attempts     | 4 passed, 4 failed                                   |
| `pnpm check`                    | 0 errors, 3 existing warnings                        |
| Dependency installation         | Exit 0, Motion 1.2.1                                 |
| `git diff --check`              | Passed                                               |

Deterministic helper evidence: unchanged text added **zero segmentation input units**; appending `three` to `one two ` segmented **six tail units**. Ledger projection performance and disabled-path counters remain unproved.

**Not delivered or verified:** executable docs, README updates, root E2E fixture, Trunk formatting/lint, full coverage, build/publint, bundle isolation, no-peer consumer, or E2E gates. Coverage thresholds remain unchanged. The minimized lockfile was not revalidated with a frozen install.

Every changed/new file:

- `package.json`, `pnpm-lock.yaml`
- `src/lib/{Parser.svelte,SvelteMarkdown.svelte,index.ts,types.ts,snippet-props.test.ts}`
- `src/lib/{StreamingText.svelte,StreamingText.test.ts,SvelteMarkdown.streaming-text.test.ts}`
- `src/lib/utils/{streaming-text.ts,streaming-text.test.ts,streaming-text-context.ts}`
- `src/lib/test/snippets/RawTextInspector.svelte`
- `src/lib/test/streaming-text/{Markdown.svelte,Segments.svelte}`
- `src/lib/streaming/motion/{index.ts,types.ts,MotionText.svelte,FadeWords.svelte,RiseWords.svelte,FadeCharacters.svelte,presets.test.ts}`

Reviewed provenance files and `.agents` are untouched. No commits, pushes, PRs, branches, worktrees, subagents, or dev servers were created.
```
