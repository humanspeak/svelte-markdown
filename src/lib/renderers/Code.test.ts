import { render } from '@testing-library/svelte'
import { flushSync, type Component } from 'svelte'
import { compile } from 'svelte/compiler'
import { createClassComponent } from 'svelte/legacy'
import { render as renderServer } from 'svelte/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Code from './Code.svelte'
import codeSource from './Code.svelte?raw'

/**
 * Compiles Code.svelte for the server and evaluates it against the same
 * `svelte/internal/server` instance that `svelte/server` uses, so SSR output
 * can be checked from this (jsdom, client-compiled) test file.
 */
const loadServerCode = async () => {
    const { js } = compile(codeSource, { generate: 'server', filename: 'Code.svelte' })
    const importLine = "import * as $ from 'svelte/internal/server';"
    expect(js.code).toContain(importLine)
    const body = js.code
        .replace(importLine, '')
        .replace('export default function', 'return function')
    const internalsSpecifier = 'svelte/internal/server'
    const internals = await import(/* @vite-ignore */ internalsSpecifier)
    // Test-only: evaluates our own compiler output (no untrusted input).
    // trunk-ignore(eslint/@typescript-eslint/no-implied-eval)
    return new Function('$', body)(internals) as Component<{ lang: string; text: string }>
}

const textNodesOf = (element: Element): Text[] =>
    Array.from(element.childNodes).filter((node): node is Text => node.nodeType === Node.TEXT_NODE)

describe('Code (markdown)', () => {
    describe('basic rendering', () => {
        it('renders pre>code with language class', () => {
            const { container } = render(Code, { props: { lang: 'ts', text: 'const x=1' } })
            const pre = container.querySelector('pre.ts')
            const code = container.querySelector('code')
            expect(pre).toBeTruthy()
            expect(code?.textContent).toBe('const x=1')
        })

        it('renders pre>code structure', () => {
            const { container } = render(Code, { props: { lang: 'js', text: 'test' } })
            const pre = container.querySelector('pre')
            const code = pre?.querySelector('code')
            expect(pre).toBeTruthy()
            expect(code).toBeTruthy()
        })
    })

    describe('language classes', () => {
        it('applies javascript language class', () => {
            const { container } = render(Code, { props: { lang: 'javascript', text: 'code' } })
            expect(container.querySelector('pre.javascript')).toBeTruthy()
        })

        it('applies python language class', () => {
            const { container } = render(Code, { props: { lang: 'python', text: 'code' } })
            expect(container.querySelector('pre.python')).toBeTruthy()
        })

        it('applies rust language class', () => {
            const { container } = render(Code, { props: { lang: 'rust', text: 'code' } })
            expect(container.querySelector('pre.rust')).toBeTruthy()
        })

        it('handles empty language string', () => {
            const { container } = render(Code, { props: { lang: '', text: 'code' } })
            const pre = container.querySelector('pre')
            expect(pre).toBeTruthy()
            expect(pre?.className).toBe('')
        })

        it('handles language with hyphen', () => {
            const { container } = render(Code, { props: { lang: 'c-sharp', text: 'code' } })
            expect(container.querySelector('pre.c-sharp')).toBeTruthy()
        })

        it('handles language with numbers', () => {
            const { container } = render(Code, { props: { lang: 'es2015', text: 'code' } })
            expect(container.querySelector('pre.es2015')).toBeTruthy()
        })
    })

    describe('text content', () => {
        it('renders empty text', () => {
            const { container } = render(Code, { props: { lang: 'js', text: '' } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('')
        })

        it('renders multiline code', () => {
            const multiline = 'function test() {\n  return true;\n}'
            const { container } = render(Code, { props: { lang: 'js', text: multiline } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe(multiline)
        })

        it('preserves leading whitespace', () => {
            const { container } = render(Code, { props: { lang: 'py', text: '    indented' } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('    indented')
        })

        it('preserves trailing whitespace', () => {
            const { container } = render(Code, { props: { lang: 'py', text: 'code   ' } })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('code   ')
        })

        it('renders code with special characters', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'const x = a < b && c > d;' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('const x = a < b && c > d;')
        })

        it('renders code with HTML-like tags as text', () => {
            const { container } = render(Code, {
                props: { lang: 'html', text: '<div class="test">content</div>' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('<div class="test">content</div>')
            // Should not create actual div element
            expect(container.querySelector('div.test')).toBeNull()
        })

        it('renders code with backticks', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'const str = `template ${var}`' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('const str = `template ${var}`')
        })

        it('renders code with quotes', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'const s = \'single\' + "double"' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('const s = \'single\' + "double"')
        })

        it('renders code with ampersands', () => {
            const { container } = render(Code, {
                props: { lang: 'js', text: 'a && b || c & d' }
            })
            const code = container.querySelector('code')
            expect(code?.textContent).toBe('a && b || c & d')
        })
    })

    describe('DOM contract (per-line spike, Plan 012)', () => {
        it.each([['a\nb\nc'], [''], ['x'], ['a\n'], ['\n\n'], ['a\n\nb']])(
            'textContent of code equals the input for %j',
            (text) => {
                const { container } = render(Code, { props: { lang: 'ts', text } })
                expect(container.querySelector('code')?.textContent).toBe(text)
            }
        )

        it('keeps the element shape: pre.className === lang, one code child, no element children', () => {
            const { container } = render(Code, { props: { lang: 'ts', text: 'a\nb\nc' } })
            const pre = container.querySelector('pre')
            const code = pre?.querySelector('code')
            expect(pre?.className).toBe('ts')
            expect(pre?.children.length).toBe(1)
            expect(code?.children.length).toBe(0)
        })

        it('keeps textContent equal to the input across streamed appends', async () => {
            const { container, rerender } = render(Code, { props: { lang: 'ts', text: 'a' } })
            const code = container.querySelector('code')
            for (const text of ['a\n', 'a\nb', 'a\nbc\n', 'a\nbc\n\nd', 'a\nb', '']) {
                await rerender({ lang: 'ts', text })
                expect(code?.textContent).toBe(text)
                expect(code?.children.length).toBe(0)
            }
        })

        // Red anchor: a completed line keeps its Text node (identity and data)
        // when later lines change. Copy/selection fidelity is covered by the
        // textContent checks: adjacent text nodes inside one <code> select and
        // copy exactly like a single text node with the same data.
        it('keeps a completed line text node untouched when a later line changes', async () => {
            const { container, rerender } = render(Code, {
                props: { lang: 'ts', text: 'a\nb\nc' }
            })
            const code = container.querySelector('code') as HTMLElement
            const first = textNodesOf(code).find((node) => node.data.startsWith('a'))
            expect(first).toBeDefined()
            const dataBefore = first?.data

            await rerender({ lang: 'ts', text: 'a\nb\ncd' })

            expect(code.textContent).toBe('a\nb\ncd')
            expect(first?.isConnected).toBe(true)
            expect(first?.data).toBe(dataBefore)
        })
    })

    describe('SSR and hydration contract (Plan 012)', () => {
        afterEach(() => {
            vi.restoreAllMocks()
        })

        it('renders the pre>code shape and text on the server', async () => {
            const ServerCode = await loadServerCode()
            const { body } = renderServer(ServerCode, { props: { lang: 'ts', text: 'a\nb' } })
            expect(body).toContain('<pre class="ts"><code>')
            expect(body.replace(/<!--[^]*?-->/g, '')).toBe(
                '<pre class="ts"><code>a\nb</code></pre>'
            )
            // Exact server output, including Svelte's hydration marker comments.
            // Marker comments inside <code> are the only accepted difference
            // from the plain `<pre class><code>{text}</code></pre>` shape: the
            // per-line {#each} opens with `<!--[-->`, prefixes each line with
            // `<!---->`, and closes with `<!--]-->`. No whitespace is added.
            expect(body).toBe(
                '<!--[--><pre class="ts"><code><!--[--><!---->a\n<!---->b<!--]--></code></pre><!--]-->'
            )
        })

        it('escapes code text on the server', async () => {
            const ServerCode = await loadServerCode()
            const { body } = renderServer(ServerCode, {
                props: { lang: 'html', text: '<div class="x">&</div>\n<b>' }
            })
            expect(body.replace(/<!--[^]*?-->/g, '')).toBe(
                '<pre class="html"><code>&lt;div class="x">&amp;&lt;/div>\n&lt;b></code></pre>'
            )
        })

        it.each([['a\nb'], [''], ['a\n'], ['x\n\ny']])(
            'hydrates the server output for %j without warnings and stays reactive',
            async (text) => {
                const ServerCode = await loadServerCode()
                const { body } = renderServer(ServerCode, { props: { lang: 'ts', text } })
                const target = document.createElement('div')
                target.innerHTML = body
                document.body.appendChild(target)
                const ssrPre = target.querySelector('pre')
                const ssrCode = target.querySelector('code')
                const warn = vi.spyOn(console, 'warn')
                const error = vi.spyOn(console, 'error')

                // Legacy wrapper = hydrate() plus a reactive $set for the update below.
                const component = createClassComponent({
                    component: Code,
                    target,
                    props: { lang: 'ts', text },
                    hydrate: true
                })
                flushSync()

                // Hydration adopted the server nodes instead of re-mounting.
                expect(target.querySelector('pre')).toBe(ssrPre)
                const code = target.querySelector('code') as HTMLElement
                expect(code).toBe(ssrCode)
                expect(code.textContent).toBe(text)
                expect(target.querySelectorAll('pre').length).toBe(1)
                expect(code.children.length).toBe(0)

                component.$set({ text: `${text}\nmore` })
                flushSync()
                expect(code.textContent).toBe(`${text}\nmore`)

                expect(warn).not.toHaveBeenCalled()
                expect(error).not.toHaveBeenCalled()
                component.$destroy()
                target.remove()
            }
        )
    })
})
