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

# Code Quality
pnpm lint             # Check linting (prettier + eslint)
pnpm lint:fix         # Fix linting issues
pnpm format           # Format code with prettier
```

## Code Style & Linting

- **Trunk** is used for linting orchestration (see `.trunk/trunk.yaml`)
- **ESLint** with TypeScript and Svelte plugins
- **Prettier** with svelte, organize-imports, and tailwindcss plugins
- **Husky** pre-commit hooks run `trunk fmt` before commits
- Code style enforces camelCase, prefer-const, no-var

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

Per PRD.md, the following are explicitly out of scope:

- Built-in HTML sanitization (provide hooks instead)
- Remote fetching of markdown documents
- WYSIWYG editor functionality

## Key Files to Understand

1. **`src/lib/index.ts`** - All public exports
2. **`src/lib/SvelteMarkdown.svelte`** - Main component implementation
3. **`src/lib/utils/markdown-parser.js`** - Token parsing logic
4. **`src/lib/renderers/`** - Individual renderer components
5. **`PRD.md`** - Product requirements and roadmap
6. **`README.md`** - Usage documentation

## PR and Commit Guidelines

- Tests required for new features
- Coverage must remain at 90%+
- Pre-commit hooks will format code automatically
- CI runs on Node 20, 22, and 24
- Package published automatically on release via GitHub Actions

## Security Considerations

- No built-in HTML sanitization by default
- XSS protection through secure parsing
- Users should integrate their own sanitizer if needed
- Use `allowHtmlOnly`/`excludeHtmlOnly` to restrict HTML tags
