# Competitive comparison refresh

Research and plan prepared on 2026-09-21 from fresh `origin/main` at `1767041`.
Branch: `docs/competitive-comparison-refresh`.

The user selected all three open Streamdown findings. The
[findings](findings.md) record verified evidence, proposed wording, and audit
limits. The [implementation plan](001-refresh-streamdown-comparison.md) supplies
the upgrade, measurement, publication, and verification steps.

## Execution order and status

| Plan | Title                                               | Priority | Effort | Depends on | Status |
| ---- | --------------------------------------------------- | -------- | ------ | ---------- | ------ |
| 001  | Refresh Streamdown comparison with current evidence | P1       | M      | None       | TODO   |

Correct the two factual claims first. Pin 4.2.0 and capture production benchmark
evidence before replacing numerical claims or advancing the benchmark baseline.
The implementation has not started; the findings remain open.

## Considered and rejected

- “Two majors stale”: 3.1.2 to 4.2.0 crosses one major version.
- Rewriting the Exmarkdown or legacy framework/activity claims: current metadata
  remains consistent with those claims.
- Automatically running the benchmark nightly: outside the requested workflow;
  it requires an intentional dependency update and production-browser run.
- Enabling highlighting to match the new engine: both existing benchmark mounts
  omit opt-in highlighting, so changing that would change the workload.
- Building a new sanitizer or other product feature: these are comparison
  corrections, with no demonstrated requirement for a runtime change.

## Coverage

Audited the cited comparison rows and related prose, competitor release notes
and package metadata, benchmark route/script, generated-doc pipeline, and relevant
verification configuration. Library correctness, full security posture, other
comparison claims, SEO, and repository triage were not audited.
