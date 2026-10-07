# Sol provenance correction checkpoint

Verbatim executor report.

```markdown
Step 1 checkpoint is complete and ready for parent review on `feat/streaming-text-motion`, HEAD `38ff2a1`. The prior source diff is preserved and finished.

Changes:

- Replayed recorded quote/list continuation transformations, including synthetic newlines with **no invented source interval**. Both reported reproducers pass.
- Extracted grammar adapters into [grammar.ts](/Users/jasonkummerl/Github/svelte-markdown/src/lib/utils/streaming-provenance/grammar.ts), eliminating resolver complexity violations.
- Cached normalized frame input and completed occurrence subtrees. Explicit invalidation handles mapping/topology changes and rebinding shared children at different offsets.
- Preserved normalized HTML tag mappings and conservative whole-parse unknown provenance for custom transforms. Supplied tokenizer instances remain unmodified.
- Fixed the typed extension fixture and all reported lint findings.

Evidence includes exact repeated origins, synthetic raw construction, targeted reference relex bases, actual clone/reuse adoption, every two-chunk split across **28 documents**, five pedantic cases, and tracked/untracked token semantic equality. The 40-heading history test visits only four reparsed-tail nodes and collects two changed leaves; subsequent capture performs no descendant traversal.

Final verification:

- Required six-file command: **335 passed, 6 files passed**, exit 0.
- `pnpm check`: exit 0; **0 errors, 3 existing warnings**.
- `trunk fmt`: exit 0.
- `trunk check`: exit 0; **no issues**.
- `git diff --check`: passed.

No known Step 1 blocker remains. Arrival ledgers, segment identity/eligibility, component metadata wiring, public API, Motion presets, and executable docs remain later-step obligations. Custom transforms intentionally retain unknown provenance; grammar adapters require parity verification when Marked changes.

No `.agents` edits, dependency changes, commits, pushes, PRs, branches, worktrees, or subagents were created.
```
