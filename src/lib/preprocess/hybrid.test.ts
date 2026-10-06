import { render, screen } from '@testing-library/svelte'
import type { Token } from 'marked'
import { flushSync, type Component } from 'svelte'
import { compile } from 'svelte/compiler'
import { render as renderServer } from 'svelte/server'
import { describe, expect, it } from 'vitest'
import { extractSvelteIslands, preparseTokens, scriptData } from './hybrid.js'
import { markdown } from './index.js'

const run = (content: string) =>
    markdown({ preparse: true }).markup({ content, filename: 'proof.md' })!

type Target = 'server' | 'client'
type Props = Record<string, unknown>

/**
 * Compiles Svelte source for `target` and evaluates it against the same
 * `svelte/internal/*` instances that `svelte/server` and `svelte` use (see
 * Code.test.ts). Side-effect imports (version, legacy flags) are loaded; the
 * only default import allowed is the document component under test.
 */
const evaluate = async (source: string, target: Target, document?: Component<Props>) => {
    const { js } = compile(source, { generate: target, filename: 'Proof.svelte' })
    const names: string[] = []
    const values: unknown[] = []
    let body = js.code
    for (const [line, namespace, binding, specifier] of js.code.matchAll(
        /^import (?:\* as ([\w$]+)|([\w$]+)) from ['"]([^'"]+)['"];$|^import ['"]([^'"]+)['"];$/gm
    )) {
        body = body.replace(line, '')
        const resolved = specifier ?? /^import ['"]([^'"]+)['"];$/.exec(line)?.[1]
        if (binding) {
            expect(resolved).toBe('doc')
            names.push(binding)
            values.push(document)
        } else {
            const internals = await import(/* @vite-ignore */ resolved!)
            if (namespace) {
                names.push(namespace)
                values.push(internals)
            }
        }
    }
    const name = /^export default function (\w+)/m.exec(body)?.[1]
    body = body
        .replace(/^export default function/m, 'function')
        .replace(/^export const /gm, 'const ')
    // Test-only: evaluates our own compiler output (no untrusted input).
    // trunk-ignore(eslint/@typescript-eslint/no-implied-eval)
    return new Function(...names, `${body}\nreturn ${name}`)(...values) as Component<Props>
}

/**
 * Minimal token document: walks build-time tokens, rendering text and calling
 * the compiled `html_<tag>` snippet props, so scope is exercised exactly as
 * the generated component declares it.
 */
const tokenDocument = `<script>
    const { source, ...islands } = $props()
</script>
{#snippet tokens(list)}{#each list as token}{#if token.type === 'html'}{@render islands[\`html_\${token.tag}\`]()}{:else if token.tokens}{@render tokens(token.tokens)}{:else if token.type === 'text'}{token.text}{/if}{/each}{/snippet}
{@render tokens(source)}`

/** Generated hybrid component, evaluated for `target` with the token document. */
const load = async (content: string, target: Target) => {
    const { code } = markdown({ preparse: true, document: 'doc' }).markup({
        content,
        filename: 'proof.md'
    })!
    return evaluate(code, target, await evaluate(tokenDocument, target))
}

const serverHtml = async (content: string, props: Props) => {
    const { head, body } = renderServer(await load(content, 'server'), { props })
    const strip = (html: string) => html.replace(/<!--.*?-->/g, '')
    return { head: strip(head), body: strip(body) }
}

/** Compiler error code from the native compiler or the hybrid pipeline. */
const errorCode = (compileSource: () => unknown) => {
    try {
        compileSource()
    } catch (error) {
        return (error as { code?: string }).code ?? (error as Error).message
    }
    return undefined
}
const nativeError = (body: string) => errorCode(() => compile(body, { generate: 'server' }))
const hybridError = (body: string) =>
    errorCode(() => {
        const { code } = run(body)
        compile(code, { generate: 'server' })
        compile(code, { generate: 'client' })
    })

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
        expect(extractSvelteIslands(body)).toEqual({
            source: body,
            islands: [],
            declarations: [],
            root: []
        })
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
        expect(extractSvelteIslands(body)).toEqual({
            source: body,
            islands: [],
            declarations: [],
            root: []
        })
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
                islands: [],
                declarations: [],
                root: []
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

    describe('authored snippet declarations and root-only Svelte elements', () => {
        const props = (name: string) => ({ data: { name } })
        const greeting = [
            '<script lang="ts">',
            '    const { data }: { data: { name: string } } = $props()',
            '</script>',
            '{#snippet greeting(salutation)}',
            '    <strong>{salutation}, {data.name}</strong>',
            '{/snippet}',
            '',
            'Markdown *between* declaration and use.',
            '',
            '{@render greeting(`Hello`)}',
            ''
        ].join('\n')
        const forward = [
            '<script>',
            '    const { data } = $props()',
            '</script>',
            'Before: {@render greeting(`Hi`)}',
            '',
            'Markdown *between* use and declaration.',
            '',
            '{#snippet greeting(salutation)}<strong>{salutation}, {data.name}</strong>{/snippet}',
            ''
        ].join('\n')

        it.each([
            ['declared before', greeting, 'Hello'],
            ['declared after (forward reference)', forward, 'Hi']
        ])(
            'server-renders a document-scope snippet %s its Markdown-separated use',
            async (_name, content, salutation) => {
                const ada = await serverHtml(content, props('Ada'))
                expect(ada.body).toContain(`<strong>${salutation}, Ada</strong>`)
                expect(ada.body).toContain('between')
                expect(ada.body.match(/<strong>/g)).toHaveLength(1)
                expect(ada.body).not.toContain('snippet')
                expect((await serverHtml(content, props('Grace'))).body).toContain(
                    `<strong>${salutation}, Grace</strong>`
                )
            }
        )

        it.each([
            ['declared before', greeting, 'Hello'],
            ['declared after (forward reference)', forward, 'Hi']
        ])(
            'client-renders a document-scope snippet %s its use and reacts to props',
            async (_name, content, salutation) => {
                const { container, rerender } = render(await load(content, 'client'), props('Ada'))
                expect(screen.getByText(`${salutation}, Ada`, { selector: 'strong' })).toBeTruthy()
                expect(container.textContent).toContain('between')
                expect(container.textContent).not.toContain('snippet')
                await rerender(props('Grace'))
                expect(
                    screen.getByText(`${salutation}, Grace`, { selector: 'strong' })
                ).toBeTruthy()
                expect(container.querySelectorAll('strong')).toHaveLength(1)
            }
        )

        it('keeps declarations and root metadata out of the Markdown token stream', () => {
            const body =
                '<svelte:options runes />\nIntro\n{#snippet a()}x{/snippet}\nstill intro\n\n<svelte:window onresize={() => {}} />\n\n<svelte:head><title>t</title></svelte:head> tail {@render a()}'
            const result = extractSvelteIslands(body)
            expect(result).toEqual({
                source: 'Intro\nstill intro\n\n\n tail <sm-proof-island-0 />',
                islands: ['{@render a()}'],
                declarations: ['{#snippet a()}x{/snippet}'],
                root: [
                    '<svelte:options runes />',
                    '<svelte:window onresize={() => {}} />',
                    '<svelte:head><title>t</title></svelte:head>'
                ]
            })
            const tokens = preparseTokens(result.source)
            expect(tokens.filter((token) => token.type === 'paragraph')).toHaveLength(2)
            const htmlTags = (list: Token[]): string[] =>
                list.flatMap((token) => [
                    ...(token.type === 'html' ? [token.raw] : []),
                    ...('tokens' in token && token.tokens ? htmlTags(token.tokens) : [])
                ])
            expect(htmlTags(tokens)).toEqual(['<sm-proof-island-0 />'])
            expect(JSON.stringify(tokens)).not.toMatch(/svelte:|snippet/)
        })

        it('leaves nested declarations inside their compiled parent island', async () => {
            const content =
                '<script>\n    const { data } = $props()\n</script>\nText\n\n<section>{#snippet item(x)}<i>{x}</i>{/snippet}{@render item(data.name)}</section>\n'
            expect(extractSvelteIslands(content.split('</script>\n')[1])).toMatchObject({
                islands: [
                    '<section>{#snippet item(x)}<i>{x}</i>{/snippet}{@render item(data.name)}</section>'
                ],
                declarations: []
            })
            expect((await serverHtml(content, props('Ada'))).body).toContain(
                '<section><i>Ada</i></section>'
            )
        })

        it('compiles and runs root elements at component root for both targets', async () => {
            const content = [
                '<script>',
                '    const { data } = $props()',
                '    let resized = $state(0)',
                '</script>',
                '<svelte:options runes />',
                '<svelte:window onresize={() => resized++} />',
                '<svelte:body onclick={() => {}} />',
                '<svelte:document onvisibilitychange={() => {}} />',
                '',
                '# Root metadata',
                '',
                '<svelte:head><title>{data.name} title</title></svelte:head>',
                '',
                'Resized {resized} times.',
                ''
            ].join('\n')
            const native = content.replace(/^# Root metadata$/m, '<h1>Root metadata</h1>')
            for (const target of ['server', 'client'] as const) {
                expect(() => compile(native, { generate: target })).not.toThrow()
                expect(() => compile(run(content).code, { generate: target })).not.toThrow()
            }
            const { head, body } = await serverHtml(content, props('Ada'))
            expect(head).toContain('<title>Ada title</title>')
            expect(body).toContain('Resized 0 times.')
            expect(body).not.toContain('svelte:')

            const { container } = render(await load(content, 'client'), props('Ada'))
            expect(document.title).toBe('Ada title')
            expect(container.textContent).toContain('Resized 0 times.')
            window.dispatchEvent(new Event('resize'))
            flushSync()
            expect(container.textContent).toContain('Resized 1 times.')
        })

        it('passes the runes option through, including legacy mode', async () => {
            const legacy =
                '<script>\n    export let data\n</script>\n<svelte:options runes={false} />\nHello **{data.name}**\n'
            for (const target of ['server', 'client'] as const) {
                expect(() => compile(run(legacy).code, { generate: target })).not.toThrow()
            }
            expect((await serverHtml(legacy, props('Ada'))).body).toContain('Hello Ada')
            expect(nativeError('<svelte:options runes />\n<script>export let data</script>')).toBe(
                'legacy_export_invalid'
            )
            expect(
                hybridError('<script>export let data</script>\n<svelte:options runes />\n{data}')
            ).toBe('legacy_export_invalid')
        })

        it.each(['namespace="svg"', 'customElement="x-proof"', 'css="injected"', 'immutable'])(
            'rejects the unsupported root option %s instead of ignoring it',
            (option) => {
                expect(nativeError(`<svelte:options ${option} />`)).toBeUndefined()
                expect(() => run(`<svelte:options ${option} />\nText\n`)).toThrow(
                    /supports only the runes option/
                )
            }
        )

        it.each([
            ['<div><svelte:window /></div>', 'svelte_meta_invalid_placement'],
            ['{#if true}<svelte:head></svelte:head>{/if}', 'svelte_meta_invalid_placement'],
            ['{#snippet a()}<svelte:body />{/snippet}', 'svelte_meta_invalid_placement'],
            ['<p><svelte:options runes /></p>', 'svelte_meta_invalid_placement'],
            ['<svelte:window />\n\nText\n\n<svelte:window />', 'svelte_meta_duplicate'],
            ['{@const answer = 42}', 'const_tag_invalid_placement']
        ])('keeps rejecting invalid authored placement: %s', (body, code) => {
            expect(nativeError(body)).toBe(code)
            expect(hybridError(body)).toContain(code)
        })

        it('rejects top-level declaration tags it cannot scope yet', () => {
            const body = '{const answer = 42}\n\nText\n\n<p>{answer}</p>'
            expect(nativeError(body)).toBeUndefined()
            expect(() => run(body)).toThrow(/declaration tags are not supported/)
            expect(() => run('<p>{const answer = 42}{answer}</p>')).not.toThrow()
        })
    })
})
