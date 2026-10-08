/**
 * Ambient types for markdown files compiled by the `markdown()` preprocessor.
 *
 * Consumers opt in with a triple-slash reference (or a `types` entry in
 * `tsconfig.json`) so `import Doc, { metadata } from './post.md'` type-checks.
 */
declare module '*.md' {
    import type { Component } from 'svelte'

    /** Front matter parsed from the file's leading `---` block. */
    export const metadata: Record<string, unknown>

    const component: Component<Record<string, unknown>>
    export default component
}

declare module '*.mdproof' {
    export const metadata: Record<string, unknown>
    const component: import('svelte').Component<Record<string, unknown>>
    export default component
}
