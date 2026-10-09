import { json } from '@tanstack/highlight/languages/json'
import { ts } from '@tanstack/highlight/languages/ts'
import { describe, expect, it } from 'vitest'
import { escapeHtml } from '../highlight/codeHighlighter.js'
import { createTanstackHighlighter, TANSTACK_FALLBACK_CLASS } from './createTanstackHighlighter.js'

const makeHighlighter = (plaintextFallback?: boolean) =>
    createTanstackHighlighter({ languages: [ts, json], plaintextFallback })

describe('createTanstackHighlighter', () => {
    it('highlights a registered language synchronously with semantic th-* classes', () => {
        const html = makeHighlighter().highlight('const x = 1', 'ts')
        expect(html).toContain('<pre class="th-code th-code--ts"')
        expect(html).toContain('th-keyword')
        // Semantic classes, never inline theme colors.
        expect(html).not.toMatch(/style=/)
    })

    it('resolves language aliases (e.g. "typescript" -> ts)', () => {
        const hl = makeHighlighter()
        expect(hl.hasLang('typescript')).toBe(true)
        expect(hl.highlight('let a', 'typescript')).toContain('th-code--ts')
    })

    it('reports unregistered and empty languages as unavailable', () => {
        const hl = makeHighlighter()
        expect(hl.hasLang('rust')).toBe(false)
        expect(hl.hasLang('')).toBe(false)
    })

    it('renders unregistered languages through the engine plaintext path by default', () => {
        const html = makeHighlighter().highlight('a > b && c < d', 'rust')
        expect(html).toContain('th-code--plaintext')
        expect(html).toContain('a &gt; b &amp;&amp; c &lt; d')
        expect(html).not.toContain('a > b')
    })

    it('uses the escaped shared fallback when plaintextFallback is off', () => {
        const html = makeHighlighter(false).highlight('a < b', 'rust')
        expect(html).toContain(`<pre class="${TANSTACK_FALLBACK_CLASS}" data-lang="rust">`)
        expect(html).toContain('a &lt; b')
    })

    it('escapes code containing a <script> tag on every path', () => {
        const payload = '<script>alert(1)</script>'
        for (const hl of [makeHighlighter(), makeHighlighter(false)]) {
            for (const lang of ['ts', 'not-a-lang']) {
                const html = hl.highlight(payload, lang)
                expect(html).not.toContain('<script>')
                expect(html).toContain('&lt;script&gt;')
            }
        }
    })

    it('does not throw on partially streamed code (unterminated string)', () => {
        const html = makeHighlighter().highlight('const s = "unterminated', 'ts')
        expect(html).toContain('th-string')
        expect(html).toContain('&quot;unterminated')
    })

    it('renders an empty block without throwing', () => {
        expect(makeHighlighter().highlight('', 'ts')).toContain('<code></code>')
    })

    it('degrades to the escaped fallback if the engine throws', () => {
        const exploding = createTanstackHighlighter({
            languages: [
                {
                    name: 'boom',
                    tokenize: () => {
                        throw new Error('tokenizer exploded')
                    }
                }
            ]
        })
        const html = exploding.highlight('a < b', 'boom')
        expect(html).toContain(TANSTACK_FALLBACK_CLASS)
        expect(html).toContain('a &lt; b')
    })

    describe('adversarial lang (injection, not just robustness)', () => {
        const adversarialLangs = [
            '"><img src=x onerror=alert(1)>',
            'ts"><script>alert(1)</script>',
            `'><svg onload=alert(1)>`,
            'ts" onmouseover="alert(1)'
        ]

        for (const lang of adversarialLangs) {
            it(`never emits markup originating from lang (engine path): ${lang.slice(0, 20)}…`, () => {
                const html = makeHighlighter().highlight('x', lang)
                expect(html).not.toContain('<img')
                expect(html).not.toContain('<svg')
                expect(html).not.toContain('<script')
                expect(html).not.toContain(lang)
                expect(html).toContain('th-code--plaintext')
            })

            it(`never emits markup originating from lang (fallback path): ${lang.slice(0, 20)}…`, () => {
                const html = makeHighlighter(false).highlight('x', lang)
                expect(html).not.toContain('<img')
                expect(html).not.toContain('<svg')
                expect(html).not.toContain('<script')
                expect(html).not.toContain(lang)
                expect(html).toContain(escapeHtml(lang))
            })
        }
    })
})
