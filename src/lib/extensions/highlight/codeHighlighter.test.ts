import { describe, expect, it } from 'vitest'
import { escapeHtml, FALLBACK_CLASS, renderFallback } from './codeHighlighter.js'

describe('escapeHtml', () => {
    it('escapes the five HTML-significant characters', () => {
        expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;')
    })

    it('leaves safe text untouched', () => {
        expect(escapeHtml('const x = 1')).toBe('const x = 1')
    })
})

describe('renderFallback', () => {
    it('emits an escaped <pre><code> with the shared class by default', () => {
        const html = renderFallback('a < b', '')
        expect(html).toBe(`<pre class="${FALLBACK_CLASS}"><code>a &lt; b</code></pre>`)
    })

    it('emits the untrusted lang only as an escaped data-lang attribute', () => {
        const lang = '"><img src=x onerror=alert(1)>'
        const html = renderFallback('x', lang)
        expect(html).not.toContain(lang)
        expect(html).not.toContain('<img')
        expect(html).toContain(`data-lang="${escapeHtml(lang)}"`)
    })

    it('lets an engine supply its own fallback class', () => {
        expect(renderFallback('x', 'rust', 'shiki-fallback')).toContain(
            '<pre class="shiki-fallback" data-lang="rust">'
        )
    })

    it('never emits an executable element from code content', () => {
        const html = renderFallback('<script>alert(1)</script>', 'js')
        expect(html).not.toContain('<script>')
        expect(html).toContain('&lt;script&gt;')
    })
})
