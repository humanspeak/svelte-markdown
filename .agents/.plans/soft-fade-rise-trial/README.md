# Soft fade and rise trial

| Plan                      | Executor | Status                             |
| ------------------------- | -------- | ---------------------------------- |
| 001-comparison-page-trial | Sol      | Implemented; visual review pending |

2026-10-08: User requests a fade/rise mix on the existing root comparison page. Trial is opt-in and independently adjustable. Existing preset defaults and raw stream remain unchanged. This does not implement the separate continuity-scope proposal. No PR; live visual acceptance remains pending.

Source snapshot `b2cd6f9`; parent verified 90 browser checks on a full rerun after one recorded initial timing miss. Trial selected on the original review page. Batch remains open for user visual judgment.

2026-10-08 revision: user requests matching FadeWords lift/fade using screenshot values 3px/.4s/.5s. Plan re-baselined at a8d8741; FadeWords option and targeted coverage are authorized, with independent controls and no library default changes. RiseWords implementation is inherited and preserved.
