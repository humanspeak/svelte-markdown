# CLAUDE.md

This file provides guidance for AI assistants working with this codebase.

## Project Overview

**@humanspeak/svelte-markdown** is a powerful, customizable markdown renderer for Svelte 5 with TypeScript support. Built as a successor to the original svelte-markdown package by Pablo Berganza, now maintained by Humanspeak, Inc.

- **Package**: `@humanspeak/svelte-markdown`
- **Homepage**: <https://markdown.svelte.page>
- **Repository**: <https://github.com/humanspeak/svelte-markdown>

## Key Technologies

- **Svelte 5** with runes compatibility
- **TypeScript** with strict typing
- **Marked** for markdown parsing
- **HTMLParser2** for secure HTML parsing
- **github-slugger** for heading ID generation
- **Vite** + **SvelteKit** for build system

## Project Structure

```text
src/
├── lib/
│   ├── index.ts              # Main entry point / exports
│   ├── SvelteMarkdown.svelte # Main component
│   ├── types.ts              # TypeScript types
│   ├── renderers/            # Markdown token renderers
│   │   ├── *.svelte          # Individual renderers (Paragraph, Link, etc.)
│   │   └── html/             # HTML element renderers
│   │       └── *.svelte      # Individual HTML tags (Div, Span, etc.)
│   └── utils/                # Utility functions
│       ├── markdown-parser.ts
│       ├── incremental-parser.ts # Streaming tail-window parser
│       ├── sanitize.ts       # Default URL/attribute sanitizers
│       ├── token-cache.ts    # LRU caching for parsed tokens
│       ├── cache.ts          # Generic memory cache
│       ├── rendererKeys.ts   # Canonical renderer key lists
│       └── unsupported*.ts   # Allow/deny helper utilities
├── routes/                   # SvelteKit routes (for dev/testing)
└── app.d.ts                  # App-level type declarations
tests/                        # Playwright E2E tests
docs/                         # Documentation site
```

## Development Commands

```bash
# Development
pnpm dev              # Start dev server
pnpm dev:pkg          # Watch and rebuild package

# Testing
pnpm test             # Run vitest with coverage
pnpm test:only        # Run vitest without coverage
pnpm test:watch       # Run vitest in watch mode
pnpm test:e2e         # Run Playwright E2E tests
pnpm test:all         # Run both unit and E2E tests

# Building
pnpm build            # Build the package
pnpm package          # Create distributable package
pnpm check            # Run svelte-check type checking

# Code Quality — use Trunk, not raw prettier/eslint
trunk fmt             # Format changed files
trunk check           # Lint changed files
trunk check --fix     # Lint changed files and auto-fix
```

## Code Style & Linting

**Always use `trunk fmt` and `trunk check` to format and lint. Do not invoke Prettier or ESLint directly (`npx prettier`, `npx eslint`).**

Trunk is the source of truth (see `.trunk/trunk.yaml`); it orchestrates Prettier and ESLint with the repo's config and, critically, **only operates on files changed relative to the upstream branch**. The raw tools behave differently and will mislead you:

- There are deliberately **no `lint` / `format` / `lint:fix` scripts** in `package.json` or `docs/package.json`. They were removed, not forgotten — a whole-repo `prettier --check . && eslint .` flags ~34 pre-existing unformatted generated files (`docs/static/**/*.md`, `pnpm-lock.yaml`) that are not your changes, and `prettier --write .` rewrites them and pollutes the diff. Don't re-add them.
- Passing files to `npx prettier` explicitly fails on `.svx` ("No parser could be inferred"); Trunk handles the repo's file types correctly.

To check only what you changed: `trunk check --fix` (this is what the Husky pre-commit hook runs, followed by `pnpm check` for svelte-check types). For a full-repo pass, use `trunk check --all`.

- **Husky** pre-commit hooks run `trunk fmt`, then `trunk check --fix`, then `pnpm check`
- Code style enforces camelCase, prefer-const, no-var
- **Never use `eslint-disable` comments** (e.g., `eslint-disable-line`, `eslint-disable-next-line`). Always use Trunk's inline ignore syntax instead: `// trunk-ignore(eslint/rule-name)`. This applies to all files including tests.
    - Note: raw `npx eslint` still reports these as warnings because `trunk-ignore` is a Trunk-level suppression — another reason to check via `trunk check`.

## Testing

### Unit Tests (Vitest)

- Located in `src/lib/**/*.test.ts`
- Uses JSDOM environment
- Testing Library integration
- Coverage target: 90%+
- Run with: `pnpm test`

### E2E Tests (Playwright)

- Located in `tests/`
- Tests accessibility, reactivity, performance, edge cases
- Cross-browser: Chrome, Firefox, Safari, Mobile
- Run with: `pnpm test:e2e`

### Issue Reproduction Tests

- Located in `tests/issues/` (e.g., `issue-210.test.ts`)
- Specific tests for GitHub issue fixes

## Architecture Notes

### Component Rendering System

- Main component: `SvelteMarkdown.svelte`
- Renderers handle specific token types (paragraph, link, code, etc.)
- HTML renderers handle raw HTML elements within markdown
- Custom renderers can override defaults via `renderers` prop

### Token Caching

- Built-in LRU cache for parsed markdown tokens
- 50-200x faster re-renders for cached content
- Configurable via `TokenCache` class
- Default: 50 documents, 5-minute TTL

### Helper Utilities for Allow/Deny Strategies

```typescript
// HTML helpers
allowHtmlOnly(['strong', 'em', 'a']) // Only allow these HTML tags
excludeHtmlOnly(['iframe', 'script']) // Block specific tags
buildUnsupportedHTML() // Block all HTML

// Markdown helpers
allowRenderersOnly(['paragraph', 'link']) // Only allow these renderers
excludeRenderersOnly(['html']) // Block specific renderers
buildUnsupportedRenderers() // Block all markdown renderers
```

## Non-Goals (Do Not Implement)

The following are explicitly out of scope:

- A bundled full DOM sanitizer (e.g. DOMPurify). The library ships
  safe-by-default URL/attribute sanitization (`src/lib/utils/sanitize.ts`,
  wired as prop defaults) — but full HTML sanitization of untrusted input
  stays the consumer's responsibility, layered via the `sanitizeUrl` /
  `sanitizeAttributes` hooks or an external sanitizer.
- Remote fetching of markdown documents
- WYSIWYG editor functionality

## Key Files to Understand

1. **`src/lib/index.ts`** - All public exports
2. **`src/lib/SvelteMarkdown.svelte`** - Main component implementation
3. **`src/lib/utils/markdown-parser.ts`** - Token parsing logic
4. **`src/lib/renderers/`** - Individual renderer components
5. **`README.md`** - Usage documentation

## PR and Commit Guidelines

- Tests required for new features
- Coverage must remain at 90%+
- Pre-commit hooks will format code automatically
- CI runs on Node 22 and 24 (`engines`: node >=22)
- Package published automatically on release via GitHub Actions
- **README.md must be updated** when adding new features, props, or public API changes

## Security Considerations

- Safe-by-default sanitization ships enabled: `defaultSanitizeUrl` (protocol
  allowlist blocking `javascript:`/`data:`/`vbscript:`) and
  `defaultSanitizeAttributes` (strips `on*` handlers and `srcdoc`, sanitizes
  URL attributes) are the default `sanitizeUrl`/`sanitizeAttributes` props —
  see `src/lib/utils/sanitize.ts`
- No bundled full DOM sanitizer — for untrusted input, layer DOMPurify (or
  similar) on top; the defaults are XSS hardening, not complete sanitization
- XSS protection through secure parsing (HTMLParser2)
- Use `allowHtmlOnly`/`excludeHtmlOnly` to restrict HTML tags
