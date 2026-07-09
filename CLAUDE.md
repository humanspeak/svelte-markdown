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
│       ├── markdown-parser.js
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

**Always use `trunk fmt` and `trunk check` to format and lint. Do not run `pnpm lint`, `pnpm format`, `npx prettier`, or `npx eslint` directly.**

Trunk is the source of truth (see `.trunk/trunk.yaml`); it orchestrates Prettier and ESLint with the repo's config and, critically, **only operates on files changed relative to the upstream branch**. The raw tools behave differently and will mislead you:

- `pnpm lint` runs `prettier --check . && eslint .` across the **whole repo**, which flags ~34 pre-existing unformatted files (generated `docs/static/**/*.md`, `pnpm-lock.yaml`). These are not your changes — don't try to fix them.
- Because that command is `&&`-chained, the Prettier failure means **ESLint never runs**, so a green-looking mental model is wrong either way.
- `pnpm format` (`prettier --write .`) would rewrite all those unrelated files and pollute the diff. Never run it.
- Passing files to `npx prettier` explicitly fails on `.svx` ("No parser could be inferred"); Trunk handles the repo's file types correctly.

To check only what you changed: `trunk check --fix` (this is what the Husky pre-commit hook runs, followed by `pnpm check` for svelte-check types).

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

- Built-in HTML sanitization (provide hooks instead)
- Remote fetching of markdown documents
- WYSIWYG editor functionality

## Key Files to Understand

1. **`src/lib/index.ts`** - All public exports
2. **`src/lib/SvelteMarkdown.svelte`** - Main component implementation
3. **`src/lib/utils/markdown-parser.js`** - Token parsing logic
4. **`src/lib/renderers/`** - Individual renderer components
5. **`README.md`** - Usage documentation

## PR and Commit Guidelines

- Tests required for new features
- Coverage must remain at 90%+
- Pre-commit hooks will format code automatically
- CI runs on Node 20, 22, and 24
- Package published automatically on release via GitHub Actions
- **README.md must be updated** when adding new features, props, or public API changes

## Security Considerations

- No built-in HTML sanitization by default
- XSS protection through secure parsing
- Users should integrate their own sanitizer if needed
- Use `allowHtmlOnly`/`excludeHtmlOnly` to restrict HTML tags
