# Svelte Markdown Package

## Overview

@humanspeak/svelte-markdown is a powerful, customizable markdown renderer for Svelte with TypeScript support. It's built as a successor to the original svelte-markdown package by Pablo Berganza, now maintained and enhanced by Humanspeak, Inc.

## Non-Goals

- Built-in HTML sanitization (provide hooks for integrators instead)
- Remote fetching of markdown documents
- WYSIWYG editor functionality

## Lineage

1. Original Creator: Pablo Berganza (2020-2024)
2. Current Maintainer: Humanspeak, Inc. (2024-present)

## Core Features

### 1. Markdown Rendering

- Full markdown syntax support through Marked
- Custom component overrides
- HTML parsing capabilities via htmlparser2
- GitHub-style slug generation for headers

### 2. TypeScript Support

- Full TypeScript definitions
- Type-safe component props
- Svelte 5 compatibility

### 3. Developer Experience

- Strong TypeScript types across public APIs
- Clear renderer override ergonomics with helper utilities

## Technical Specifications

### Dependencies

- Core Dependencies:
    - marked: ^16.2.0
    - github-slugger: ^2.0.0
    - htmlparser2: ^10.0.0

- Peer Dependencies:
    - svelte: ^5.0.0

### Build Configuration

- Vite-based build system
- SvelteKit package preparation
- Source map generation
- TypeScript compilation

### Package Structure

- Distribution via npm
- ESM module format
- Side effects declared for CSS files

### Testing Setup

- Vitest configuration with extensive edge case coverage
- JSDOM environment for DOM manipulation testing
- Testing Library integration for component testing
- Coverage reporting with minimum 90% threshold (enforced in CI)
- Playwright E2E test suites for:
    - Cross-version compatibility
    - Browser compatibility matrix
    - Visual regression snapshots
    - Accessibility compliance (WCAG 2.1)
- Specialized test suites for:
    - Malformed markdown input
    - Unicode and special character handling
    - Nested component scenarios
    - Memory leak prevention
    - Large document performance
    - Concurrent rendering scenarios

### Edge Case Handling

- Input Validation
    - Empty markdown strings
    - Non-string inputs
    - Malformed HTML within markdown
    - Extended Unicode characters
    - Zero-width spaces and invisible characters

- Component Behavior
    - Recursive component rendering
    - Circular reference detection
    - Dynamic component loading
    - Error boundary implementation
    - Memory management for large documents

- Performance Considerations
    - Chunked rendering for large documents
    - Lazy loading for complex syntax
    - Resource cleanup on unmount
    - Debounced updates for live editing

## Testing & QA

- Unit tests with Vitest + JSDOM and Testing Library
- E2E tests with Playwright (cross-browser, visual regression, accessibility checks)
- Coverage reporting via Coveralls (target ≥ 90%)
- Continuous Integration via GitHub Actions
    - Package manager: pnpm
    - Node versions: 20, 22
    - Uploads JUnit results and coverage; publishes on release
    - Issue reproduction tests maintained under `src/lib/test/issues/` (e.g., [Issue #219](https://github.com/humanspeak/svelte-markdown/issues/219))

## Distribution

### Package Configuration

- Scoped under @humanspeak
- Type definitions included
- ESM format
- Svelte component exports

### npm publishing

- Public package under @humanspeak scope
- Automated versioning and releases
- Source maps included for debugging

### Versioning & Stability

- Semantic Versioning (SemVer)
- Backward-compatibility for renderer keys and helper exports where feasible
- Deprecations announced in release notes before removal in the next major

## License

MIT License with dual copyright:

- Copyright (c) 2024-2025 Humanspeak, Inc.
- Copyright (c) 2020-2024 Pablo Berganza

## Development Workflow

### Build Process

1. Development: pnpm dev
2. Testing: pnpm test
3. Building: pnpm build
4. Publishing: Automated via GitHub Actions

### Contribution Guidelines

- Pull requests welcome
- Tests required for new features
- Automated CI/CD pipeline
- Code formatting enforced via Prettier
    - Pre-commit hook respects the current staging area (only re-stages originally staged files after Trunk format/lint)

## Future Roadmap

### Planned Features

1. Enhanced HTML parsing capabilities
2. Additional markdown extensions
3. Performance optimizations
4. Extended component customization options

### Maintenance Goals

1. Regular dependency updates via Dependabot
2. Continuous security monitoring
3. Documentation improvements
4. Community engagement

## Support

### Official Channels

- GitHub Issues: [humanspeak/svelte-markdown](https://github.com/humanspeak/svelte-markdown)
- npm Package Page: [`@humanspeak/svelte-markdown`](https://www.npmjs.com/package/@humanspeak/svelte-markdown)
- Documentation Website: [markdown.svelte.page](https://markdown.svelte.page)

### Commercial Support

Available through Humanspeak, Inc. for enterprise customers

## Migration Guide

### From Svelte 4

- Update to Svelte 5
- Review component bindings
- Check custom component implementations
- Verify TypeScript types

### From Other Markdown Libraries

- Review component structure
- Adapt custom renderers
- Update event handlers
- Migrate styling approaches

## Implementation Priorities

### Phase 1: Foundation (Completed)

- Core markdown rendering with edge case handling
- Robust syntax highlighting with fallback modes
- Comprehensive component override system
- Full TypeScript support with strict type checking
- Edge case test suite implementation
- Performance baseline measurements

### Phase 2: Advanced Features (In Progress)

- Math and diagram support with error handling
- Interactive elements with accessibility support
- Performance optimizations for large documents
- Plugin system foundation with validation
- Extended edge case coverage
- Load testing infrastructure
- Automated migration testing between versions
- Visual regression monitoring

### Phase 3: Ecosystem

- Extended plugin library(?)
- Developer tool
- Performance monitoring

### Performance Monitoring

- Automated performance benchmarking
- Bundle size monitoring
- Runtime performance tracking
- Memory usage analysis
- Rendering performance metrics

## Security & HTML Policy

- Default: no built-in HTML sanitization; all HTML tokens are parsed as-is
- Recommended: integrate an HTML sanitizer at provided hooks or downstream
- Provide presets that make it easy to allow/block specific HTML tags and renderer keys

## Implementation Status Updates

### Completed Features

- [x] Core markdown rendering with edge case handling
    - Full test coverage for basic and complex scenarios
    - Table rendering with alignment support
    - Nested content handling
- [x] Full TypeScript support with strict type checking
    - Comprehensive type definitions for renderers
    - Component-level type safety
    - Generic component type support
    - Flexible renderer component types
- [x] HTML parsing capabilities
    - Nested HTML element support
    - Attribute preservation
    - Mixed markdown/HTML content
    - Table cell HTML rendering
- [x] Edge case test suite implementation
    - Complex table structures
    - Mixed content scenarios
    - Nested component testing
    - Malformed content handling

- [x] Renderer override utilities (Issue #214)
    - Introduced `_Unsupported.svelte` and `html/_UnsupportedHTML.svelte` fallback components
    - Exported `Unsupported`, `UnsupportedHTML`, `defaultRenderers`, `Html`, `rendererKeys`, `htmlRendererKeys` from `src/lib/index.ts`
    - Centralized key types/lists in `src/lib/utils/rendererKeys.ts` with strict `HtmlKey = keyof typeof Html` typing
    - Added helper utilities for allow/block strategies:
        - `buildUnsupportedHTML`, `allowHtmlOnly`, `excludeHtmlOnly`
        - `buildUnsupportedRenderers`, `allowRenderersOnly`, `excludeRenderersOnly`
    - Helpers return complete maps (not partial) to align with `SvelteMarkdown.svelte` html merging semantics
    - Comprehensive unit tests for helpers and core renderer components; E2E tests for Issue #214
    - README updated with copy-pastable examples and API docs

### In Progress Features

- Deep nested lists (>10 levels)
- [ ] Math and diagram support with error handling
- [x] Interactive elements with accessibility support
    - ARIA role implementation
    - Semantic HTML structure
    - Heading navigation support
- [x] Performance optimizations
    - Derived state handling
    - Token cleanup utilities
    - Efficient HTML parsing
- [ ] Plugin system foundation
- [x] Extended edge case coverage
    - Table cell alignment
    - Complex nested structures
    - Mixed content handling
- [x] Visual regression monitoring
    - Cross-browser testing
    - Component rendering validation

### Phase 2 Progress: 75% Complete

- Table rendering with mixed content ✓
- HTML parsing and nesting ✓
- Type safety improvements ✓
- Edge case handling ✓
- Performance optimizations ✓
- Accessibility support ✓
- Plugin system (pending)
- Math/diagram support (pending)

### Next Steps (Renderer overrides and DX)

1. Developer ergonomics
    - Add presets built on helpers (e.g., `allowInlineOnly`, `safeHtmlOnly`)
    - Emit development-time warnings for invalid override keys when used from JS (non-TS consumers)
2. Security and correctness
    - Optional HTML sanitizer hook for allowed HTML tags (document safe defaults and trade-offs)
    - Additional E2E coverage for attribute escaping and nested unsupported HTML
3. Documentation
    - Dedicated section in the docs site for override patterns and presets
    - Migration notes for users replacing custom large maps with helpers
4. Performance
    - Micro-benchmarks for large documents comparing default vs allow/block strategies
5. API polish
    - Ensure exports are tree-shakeable and types remain stable; consider deprecation notes if future renames occur
