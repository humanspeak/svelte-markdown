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

- Extended plugin library with core plugins (see Plugin System section)
- Developer tooling and debugging utilities
- Performance monitoring and analytics

### Performance Monitoring

- Automated performance benchmarking
- Bundle size monitoring
- Runtime performance tracking
- Memory usage analysis
- Rendering performance metrics

## Plugin System

### Architecture

The plugin system is built on marked.js's extension capabilities combined with Svelte's component system:

- **Marked Extensions**: Custom tokenizers for new markdown syntax
- **Svelte Renderers**: Components that handle the custom tokens
- **Helper Utilities**: Functions to enable/disable plugins easily
- **Preset Configurations**: Pre-built plugin combinations for common use cases

### Core Plugin Categories

#### 1. Math & Science (High Priority)

- **KaTeX Math Plugin**: Render mathematical expressions using KaTeX
    - Syntax: `$...$` (inline) and `$$...$$` (block)
    - Component: `Math.svelte` with KaTeX integration
    - Use case: Technical documentation, scientific papers, educational content

- **Mermaid Diagrams Plugin**: Render flowcharts, sequence diagrams, etc.
    - Syntax: ```mermaid code blocks
    - Component: `Mermaid.svelte` with dynamic Mermaid.js loading
    - Use case: System architecture, process documentation

#### 2. Enhanced Code Features (High Priority)

- **Advanced Syntax Highlighting**: Enhanced code highlighting beyond basic HTML
    - Integration: Extend existing `Code.svelte` with Prism.js or Shiki
    - Features: Line numbers, copy button, language labels, diff highlighting
    - Use case: Technical blogs, API documentation

- **Code Tabs Plugin**: Tabbed code blocks for multi-language examples
    - Syntax: Custom container with `:::tabs` notation
    - Component: `CodeTabs.svelte`
    - Use case: API documentation showing multiple language examples

#### 3. Content Enhancement (Medium Priority)

- **Enhanced Callouts/Admonitions**: Expanded alerts beyond current Alert example
    - Syntax: `:::note`, `:::warning`, `:::tip`, `:::danger`, `:::info`
    - Component: Enhanced `Alert.svelte` (foundation already exists)
    - Use case: Documentation with structured callouts

- **Footnotes Plugin**: Support for footnote references and definitions
    - Syntax: `[^1]` references with `[^1]: Definition` at bottom
    - Components: `FootnoteRef.svelte`, `FootnoteList.svelte`
    - Use case: Academic writing, detailed documentation

#### 4. Interactive Elements (Medium Priority)

- **Task Lists Plugin**: Interactive checkboxes in lists
    - Syntax: `- [ ]` and `- [x]` in lists
    - Component: `TaskList.svelte` with interactive checkboxes
    - Use case: Project documentation, TODO lists, checklists

- **Collapsible Sections**: Expandable/collapsible content blocks
    - Syntax: `<details>` HTML or custom `:::details` syntax
    - Component: `Details.svelte` with smooth animations
    - Use case: FAQ sections, detailed documentation

#### 5. Specialized Content (Lower Priority)

- **Definition Lists**: Support for HTML-style definition lists
    - Syntax: Custom markdown syntax for `<dl>`, `<dt>`, `<dd>`
    - Components: `DefinitionList.svelte`, `DefinitionTerm.svelte`
    - Use case: Glossaries, API documentation

- **Emoji Plugin**: Convert `:emoji:` syntax to actual emojis
    - Implementation: Text replacement during parsing
    - Use case: Casual documentation, social content

### Plugin Presets

Pre-configured plugin combinations for common scenarios:

- **Documentation**: Math, Mermaid, syntax highlighting, callouts
- **Blog**: Syntax highlighting, callouts, emoji, footnotes
- **Technical**: Math, Mermaid, advanced code features, task lists
- **Minimal**: Basic callouts, task lists only

### Implementation Strategy

```typescript
interface PluginConfig {
    name: string
    tokenizer?: TokenizerExtension
    renderer: RendererComponent
    dependencies?: string[]
    options?: Record<string, any>
}

// Usage example
const plugins = usePlugins(['math', 'mermaid', 'callouts'])
```

### Development Priorities

1. **KaTeX Math Plugin** - Aligns with Phase 2 math support goals
2. **Mermaid Diagrams Plugin** - Complements math for technical documentation
3. **Enhanced Syntax Highlighting** - Builds on existing code renderer
4. **Expanded Callouts** - Foundation already exists with Alert.svelte

## Security & HTML Policy

- Default: no built-in HTML sanitization; all HTML tokens are parsed as-is
- Recommended: integrate an HTML sanitizer at provided hooks or downstream
- Provide presets that make it easy to allow/block specific HTML tags and renderer keys
- Plugin security: All plugins must follow the same HTML policy guidelines

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
    - Architecture design completed
    - Core plugin categories defined
    - Implementation strategy documented
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
- Plugin system (architecture complete, implementation pending)
- Math/diagram support (pending - KaTeX and Mermaid plugins prioritized)

### Next Steps (Plugin System Implementation)

1. **Phase 1: Core Plugin Infrastructure**
    - Implement plugin registration and management system
    - Create base plugin interface and helper utilities
    - Develop plugin preset system for common use cases

2. **Phase 2: Priority Plugins**
    - KaTeX Math Plugin (aligns with existing math support goals)
    - Mermaid Diagrams Plugin (complements technical documentation)
    - Enhanced Syntax Highlighting (builds on existing Code.svelte)
    - Expanded Callouts (extend existing Alert.svelte foundation)

3. **Phase 3: Developer Experience**
    - Add presets built on helpers (e.g., `allowInlineOnly`, `safeHtmlOnly`)
    - Emit development-time warnings for invalid override keys when used from JS (non-TS consumers)
    - Plugin development documentation and examples

4. **Phase 4: Security and Performance**
    - Optional HTML sanitizer hook for allowed HTML tags (document safe defaults and trade-offs)
    - Plugin security validation and sandboxing
    - Micro-benchmarks for plugin performance impact
    - Bundle size optimization for optional plugins

5. **Phase 5: Documentation and Polish**
    - Dedicated section in the docs site for plugin system and presets
    - Migration notes for users adopting plugins
    - Ensure exports are tree-shakeable and types remain stable
