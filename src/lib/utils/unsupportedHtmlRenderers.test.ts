import Html, { UnsupportedHTML } from '$lib/renderers/html/index.js'
import { describe, expect, it } from 'vitest'
import { allowHtmlOnly, buildUnsupportedHTML, excludeHtmlOnly } from './unsupportedHtmlRenderers.js'

describe('unsupported helpers', () => {
    it('buildUnsupportedHTML maps all tags to UnsupportedHTML', () => {
        const map = buildUnsupportedHTML()
        for (const key of Object.keys(Html)) {
            expect(map[key]).toBe(UnsupportedHTML)
        }
    })

    it('allowHtmlOnly allows defaults for listed tags', () => {
        const allowed = allowHtmlOnly(['div', 'a'])
        expect(allowed.div).toBe(Html.div)
        expect(allowed.a).toBe(Html.a)
        // spot check a different key becomes UnsupportedHTML
        expect(allowed.span).toBe(UnsupportedHTML)
    })

    it('allowHtmlOnly supports [tag, component] tuples', () => {
        const Custom = Html.div
        const allowed = allowHtmlOnly([['div', Custom]])
        expect(allowed.div).toBe(Custom)
        // non-listed fall back to UnsupportedHTML
        expect(allowed.span).toBe(UnsupportedHTML)
    })

    it('excludeHtmlOnly excludes only listed tags (others default)', () => {
        const map = excludeHtmlOnly(['span', 'div'])
        expect(map.span).toBe(UnsupportedHTML)
        expect(map.div).toBe(UnsupportedHTML)
        // a should remain default
        expect(map.a).toBe(Html.a)
    })

    it('excludeHtmlOnly supports overrides for non-excluded tags', () => {
        const Custom = Html.div
        const map = excludeHtmlOnly(['span'], [['div', Custom]])
        // excluded stays UnsupportedHTML
        expect(map.span).toBe(UnsupportedHTML)
        // div overridden
        expect(map.div).toBe(Custom)
        // a remains default
        expect(map.a).toBe(Html.a)
    })
})
