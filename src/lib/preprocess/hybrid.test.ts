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

    describe('JavaScript literals inside Svelte syntax', () => {
        const prelude = '<script>let data = {}; let value; let Counter</script>'
        const nativeAccepts = (body: string) =>
            expect(() => compile(prelude + body, { generate: 'server' })).not.toThrow()

        it.each([
            ['standalone template literal', 'Text {`hello`} end', ['{`hello`}']],
            [
                'nullish fallback template literal',
                'Hello {data.name ?? `friend`}!',
                ['{data.name ?? `friend`}']
            ],
            [
                'component prop template literal',
                '<Counter value={`hello`} />',
                ['<Counter value={`hello`} />']
            ],
            [
                'nested interpolation with braces and backticks',
                '{`${[1, 2].map((n) => `{${n}}`).join(`}`)}`}',
                ['{`${[1, 2].map((n) => `{${n}}`).join(`}`)}`}']
            ],
            [
                'strings containing Markdown syntax',
                '{\'`\'} and {"**not bold** [x](y) `"}',
                ["{'`'}", '{"**not bold** [x](y) `"}']
            ],
            [
                'comments containing Markdown syntax',
                '{value /* ` {} */} `{literal}` {value // `\n}',
                ['{value /* ` {} */}', '{value // `\n}']
            ],
            [
                'quoted attribute expressions and regular expressions',
                '<Counter label="say {`hi`}" title={/`}/.source} /> {value++ / `${value}`.length} `{x}`',
                [
                    '<Counter label="say {`hi`}" title={/`}/.source} />',
                    '{value++ / `${value}`.length}'
                ]
            ]
        ])('compiles a %s like native Svelte', (_name, body, islands) => {
            nativeAccepts(body)
            expect(extractSvelteIslands(body).islands).toEqual(islands)
            const { code } = run(
                `<script>let data = {}; let value; let Counter</script>\n${body}\n`
            )
            expect(() => compile(code, { generate: 'server' })).not.toThrow()
            expect(() => compile(code, { generate: 'client' })).not.toThrow()
        })

        it('keeps paired inline, fenced and blockquoted Markdown code literal', () => {
            const body =
                "{'`'} then `{literal}` and {`live`}.\n\n> ```svelte\n> {`quoted`}\n> ```\n\n```js\nconst x = `${y}`\n```\n"
            const { source, islands } = extractSvelteIslands(body)
            expect(islands).toEqual(["{'`'}", '{`live`}'])
            expect(source).toBe(
                '<sm-proof-island-0 /> then `{literal}` and <sm-proof-island-1 />.\n\n> ```svelte\n> {`quoted`}\n> ```\n\n```js\nconst x = `${y}`\n```\n'
            )
            const tokens = preparseTokens(source)
            expect(tokens[0]).toMatchObject({
                type: 'paragraph',
                tokens: expect.arrayContaining([
                    expect.objectContaining({ type: 'codespan', text: '{literal}' })
                ])
            })
            expect(tokens).toContainEqual(
                expect.objectContaining({ type: 'code', text: 'const x = `${y}`' })
            )
            expect(tokens).toContainEqual(
                expect.objectContaining({
                    type: 'blockquote',
                    tokens: [expect.objectContaining({ type: 'code', text: '{`quoted`}' })]
                })
            )
        })

        it('uses backslash parity for Markdown escapes', () => {
            expect(extractSvelteIslands('Odd \\{data.name} and \\<Counter />')).toEqual({
                source: 'Odd \\{data.name} and \\<Counter />',
                islands: []
            })
            expect(extractSvelteIslands('Triple \\\\\\{data.name}').islands).toEqual([])
            const even = extractSvelteIslands('Even \\\\{data.name} and \\\\<Counter />')
            expect(even.islands).toEqual(['{data.name}', '<Counter />'])
            expect(even.source).toBe('Even \\\\<sm-proof-island-0 /> and \\\\<sm-proof-island-1 />')
            expect(extractSvelteIslands("{'\\{'}").islands).toEqual(["{'\\{'}"])
        })

        it('preserves UTF-16 offsets, inline bold and references around template literals', () => {
            const { source, islands } = extractSvelteIslands(
                '😀 **{`${data.greeting} 😀`}** [a][ref] `😀 {x}` <Counter value={`😀 ${data.name}`} />\n\n[ref]: /shared'
            )
            expect(islands).toEqual([
                '{`${data.greeting} 😀`}',
                '<Counter value={`😀 ${data.name}`} />'
            ])
            expect(source).toBe(
                '😀 **<sm-proof-island-0 />** [a][ref] `😀 {x}` <sm-proof-island-1 />\n\n[ref]: /shared'
            )
            expect(preparseTokens(source)[0]).toMatchObject({
                type: 'paragraph',
                tokens: expect.arrayContaining([
                    expect.objectContaining({
                        type: 'strong',
                        tokens: [
                            expect.objectContaining({ type: 'html', tag: 'sm-proof-island-0' })
                        ]
                    }),
                    expect.objectContaining({ type: 'link', href: '/shared', text: 'a' }),
                    expect.objectContaining({ type: 'codespan', text: '😀 {x}' })
                ])
            })
        })
    })
})
