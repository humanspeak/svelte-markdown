import js from 'shiki/langs/javascript.mjs'
import ts from 'shiki/langs/typescript.mjs'
import githubDark from 'shiki/themes/github-dark.mjs'
import { describe, expect, it } from 'vitest'
import {
    createShikiHighlighter,
    escapeHtml,
    type ShikiHighlighter
} from './createShikiHighlighter.js'

const makeHighlighter = (): ShikiHighlighter =>
    createShikiHighlighter({ langs: [js, ts], themes: [githubDark] })

describe('escapeHtml', () => {
    it('escapes the five HTML-significant characters', () => {
        expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
    })
})

describe('createShikiHighlighter', () => {
    it('highlights a registered language synchronously with token spans', () => {
        const hl = makeHighlighter()
        const html = hl.highlight('const x = 1', 'javascript')
        expect(html).toContain('<pre class="shiki')
        expect(html).toContain('<span')
        // Shiki inlines per-token colors from the theme.
        expect(html).toMatch(/color:#[0-9a-fA-F]{3,6}/)
    })

    it('resolves language aliases (e.g. "js" -> javascript)', () => {
        const hl = makeHighlighter()
        expect(hl.hasLang('js')).toBe(true)
        expect(hl.highlight('const x = 1', 'js')).toContain('shiki')
    })

    it('falls back to escaped plain text for an unregistered language (no throw)', () => {
        const hl = makeHighlighter()
        expect(hl.hasLang('brainfuck')).toBe(false)
        const html = hl.highlight('a > b && c < d', 'brainfuck')
        expect(html).toContain('shiki-fallback')
        expect(html).toContain('a &gt; b &amp;&amp; c &lt; d')
        // Original angle brackets from the code must not survive raw.
        expect(html).not.toContain('a > b')
    })

    it('falls back for empty/missing lang', () => {
        const hl = makeHighlighter()
        expect(hl.highlight('plain', '')).toContain('shiki-fallback')
    })

    it('escapes code containing a <script> tag — never emits an executable element', () => {
        const hl = makeHighlighter()
        const payload = '<script>alert(1)</script>'
        // Registered lang path (shiki escapes the code text it tokenizes)...
        const highlighted = hl.highlight(payload, 'javascript')
        expect(highlighted).not.toContain('<script>')
        // Shiki escapes `<` as a hex entity (`&#x3C;`); accept any `<` entity form.
        expect(highlighted).toMatch(/&(lt|#x3C|#60);/i)
        // ...and the fallback path.
        const fallback = hl.highlight(payload, 'not-a-lang')
        expect(fallback).not.toContain('<script>')
        expect(fallback).toContain('&lt;script&gt;')
    })

    describe('adversarial lang (injection, not just robustness)', () => {
        // The fenced-code info string is untrusted, agent/LLM-streamed input.
        const adversarialLangs = [
            '"><img src=x onerror=alert(1)>',
            'js"><script>alert(1)</script>',
            `'><svg onload=alert(1)>`,
            'javascript" onmouseover="alert(1)'
        ]

        for (const lang of adversarialLangs) {
            it(`does not emit unescaped markup originating from lang: ${lang.slice(0, 20)}…`, () => {
                const hl = makeHighlighter()
                const html = hl.highlight('const x = 1', lang)
                // Unregistered -> fallback path.
                expect(html).toContain('shiki-fallback')
                // No raw element from the lang survived — angle brackets are escaped,
                // so no `<img>/<svg>/<script>` tag boundary can form.
                expect(html).not.toContain('<img')
                expect(html).not.toContain('<svg')
                expect(html).not.toContain('<script')
                // The untrusted lang never appears verbatim (its quotes/brackets
                // would break out of the attribute if interpolated raw)...
                expect(html).not.toContain(lang)
                // ...it appears only as its fully-escaped data-lang value.
                expect(html).toContain('data-lang="')
                expect(html).toContain(escapeHtml(lang))
            })
        }
    })
})
