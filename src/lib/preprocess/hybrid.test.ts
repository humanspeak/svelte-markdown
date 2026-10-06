import { compile } from 'svelte/compiler'
import { describe, expect, it } from 'vitest'
import { extractSvelteIslands, preparseTokens, scriptData } from './hybrid.js'
import { markdown } from './index.js'

const run = (content: string) =>
    markdown({ preparse: true }).markup({ content, filename: 'proof.md' })!

describe('hybrid preprocessor architecture proof', () => {
    it('runs a custom tokenizer at build time and serializes its output as data', () => {
        const tokens = preparseTokens('@@note\n', {
            extensions: [
                {
                    name: 'proofNote',
                    level: 'block',
                    tokenizer(source) {
                        if (!source.startsWith('@@note\n')) return undefined
                        return {
                            type: 'paragraph',
                            raw: '@@note\n',
                            text: 'Build extension',
                            tokens: [
                                { type: 'text', raw: 'Build extension', text: 'Build extension' }
                            ]
                        }
                    }
                }
            ]
        })
        expect(JSON.parse(scriptData(tokens))).toEqual([
            expect.objectContaining({ type: 'paragraph', text: 'Build extension' })
        ])
        expect(() => scriptData([{ callback: () => 'unsupported' }])).toThrow(
            'must contain JSON data'
        )
    })

    it('emits a token array and real Svelte snippets rather than a source string', () => {
        const { code } = run('# Heading\n\n<Counter start={6} />\n')
        expect(code).toContain('"type":"heading"')
        expect(code).toContain('html_sm-proof-island-0={smProofIsland0}')
        expect(code).toContain('<Counter start={6} />')
        expect(code).not.toContain('const source__')
    })

    it('keeps references on both sides of an island in one token tree', () => {
        const { source } = extractSvelteIslands(
            '[a][ref]\n\n<span>island</span>\n\n[b][ref]\n\n[ref]: /shared'
        )
        const tokens = preparseTokens(source)
        expect(
            tokens
                .filter((token) => token.type === 'paragraph')
                .map((token) => (token.type === 'paragraph' ? token.tokens?.[0] : undefined))
        ).toEqual([
            expect.objectContaining({ type: 'link', href: '/shared', text: 'a' }),
            expect.objectContaining({ type: 'link', href: '/shared', text: 'b' })
        ])
        expect(tokens).toContainEqual(
            expect.objectContaining({ type: 'html', tag: 'sm-proof-island-0', tokens: [] })
        )
    })

    it('compiles typed props, page data, state, expressions and control flow', () => {
        const { code } = run(
            '<script lang="ts">\nconst { data }: { data: { start: number } } = $props()\nlet count = $state(0)\n</script>\n# Before\n\n<button onclick={() => count++}>{data.start + count}</button>\n{#if count}<span>changed</span>{/if}\n'
        )
        expect(() => compile(code, { generate: 'server' })).not.toThrow()
        expect(() => compile(code, { generate: 'client' })).not.toThrow()
    })

    it('escapes metadata and token data containing closing script tags', () => {
        const { code } = run('---\ntitle: "</script>"\n---\n```html\n</script>\n```')
        expect(code).toContain('\\u003c/script>')
        expect(() => compile(code, { generate: 'server' })).not.toThrow()
    })

    it('keeps Svelte syntax inside fenced code as code', () => {
        const body = '```svelte\n<Counter start={6} />\n```'
        expect(extractSvelteIslands(body)).toEqual({ source: body, islands: [] })
        expect(preparseTokens(body)[0]).toMatchObject({
            type: 'code',
            text: expect.stringContaining('<Counter start={6} />')
        })
    })

    it('reports malformed Svelte using compiler diagnostics', () => {
        expect(() => run('<section><Counter /></div>')).toThrow()
        expect(() => run('{#if ready}<span>oops</span>')).toThrow()
    })

    it('protects inline code, nested fenced code, autolinks and reference definitions', () => {
        const body =
            'Literal `<Counter start={6} />` and `{value}`.\n\n> ```svelte\n> <Counter />\n> {value}\n> ```\n\n<https://example.com/path>\n\n[ref]: https://example.com/{literal}\n'
        expect(extractSvelteIslands(body)).toEqual({ source: body, islands: [] })
    })

    it('recognizes inline expressions and components without changing surrounding markdown', () => {
        const { source, islands } = extractSvelteIslands(
            '😀 Hello **{data.name}** and <Counter start={6} />!'
        )
        expect(islands).toEqual(['{data.name}', '<Counter start={6} />'])
        expect(source).toBe('😀 Hello **<sm-proof-island-0 />** and <sm-proof-island-1 />!')
        expect(preparseTokens(source)[0]).toMatchObject({ type: 'paragraph' })
    })
})
