# Guard log — 002 production hydration

## Checkpoint 1 — 2026-10-06 17:42 — ON TRACK

a42d902 · final review of Opus 5.5 contribution (base df77a4f)

- Scope: exactly one new file, tests/preprocess-hybrid.test.ts; complete125-line contribution read, scoped planning drift empty.
- Independent browser gate: pnpm exec playwright test tests/preprocess-hybrid.test.ts --reporter=line passes10 cases (2 on each configured project). Used freshly built preview4173 and stopped that owned server afterward; preview8237 untouched.
- Assertions: JS-disabled context closes in finally;200 response, typed number/object props, initial/updated counter, callbacks, conditional, heading renderer switch, retained custom links, strong interpolation and literal code all asserted.
- Diagnostics: pageerror, console warning/error, failed requests and failed same-origin asset responses are collected before navigation; all lists asserted empty. No meaningful errors filtered.
- Quality gates: pnpm test1441/168 and coverage97.48/92.9/98.28/98.71; types0 errors/3 warnings; Trunk52 modified files no issues; direct build/publint pass; scoped diff check passes.
- Executor report correction: Svelte does not strip every hydration-mismatch warning in production. Installed warnings.js:149–160 retains a console.warn URL in its non-DEV branch, called from render.js:207 and hydration.js. The built client contains that URL. The test captures warning-type messages, so no code correction is needed.
- Action: mark002 DONE, start003 design pre-flight. No source changes by guard; no push/PR.
