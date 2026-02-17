import Html, { UnsupportedHTML } from '$lib/renderers/html/index.js'
import { htmlRendererKeysInternal } from '$lib/utils/rendererKeys.js'
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

describe('unsupported HTML negative tests', () => {
    it('allowHtmlOnly with empty array maps every key to UnsupportedHTML', () => {
        const map = allowHtmlOnly([])
        for (const key of htmlRendererKeysInternal) {
            expect(map[key], `${key} should be UnsupportedHTML`).toBe(UnsupportedHTML)
        }
    })

    it('allowHtmlOnly with all invalid tags maps every key to UnsupportedHTML', () => {
        const map = allowHtmlOnly(['fake-tag-1', 'fake-tag-2'] as any)
        for (const key of htmlRendererKeysInternal) {
            expect(map[key], `${key} should be UnsupportedHTML`).toBe(UnsupportedHTML)
        }
    })

    it('excludeHtmlOnly with invalid tags silently ignores them', () => {
        const map = excludeHtmlOnly(['not-a-tag'] as any)
        for (const key of htmlRendererKeysInternal) {
            expect(map[key], `${key} should be default`).toBe(Html[key])
        }
    })
})

describe('unsupported HTML boundary tests', () => {
    it('buildUnsupportedHTML returns a new object each call', () => {
        const a = buildUnsupportedHTML()
        const b = buildUnsupportedHTML()
        expect(a).not.toBe(b)
        expect(a).toEqual(b)
    })

    it('result key count matches htmlRendererKeysInternal length', () => {
        const map = buildUnsupportedHTML()
        expect(Object.keys(map)).toHaveLength(htmlRendererKeysInternal.length)
    })

    it('excludeHtmlOnly with empty array preserves all defaults', () => {
        const map = excludeHtmlOnly([])
        for (const key of htmlRendererKeysInternal) {
            expect(map[key], `${key} should be default`).toBe(Html[key])
        }
    })

    it('excludeHtmlOnly with empty overrides array is the same as without', () => {
        const withoutOverrides = excludeHtmlOnly(['div'])
        const withEmptyOverrides = excludeHtmlOnly(['div'], [])
        expect(withoutOverrides).toEqual(withEmptyOverrides)
    })
})

describe('unsupported HTML spot-check tag families', () => {
    it('semantic tags are present', () => {
        const semanticTags = ['article', 'section', 'nav', 'header', 'footer', 'main']
        const map = buildUnsupportedHTML()
        for (const tag of semanticTags) {
            expect(map[tag], `${tag} should be present`).toBe(UnsupportedHTML)
        }
    })

    it('form tags are present', () => {
        const formTags = ['input', 'select', 'textarea', 'button', 'form', 'label']
        const map = buildUnsupportedHTML()
        for (const tag of formTags) {
            expect(map[tag], `${tag} should be present`).toBe(UnsupportedHTML)
        }
    })

    it('media tags are present', () => {
        const mediaTags = ['audio', 'img', 'iframe', 'picture', 'source']
        const map = buildUnsupportedHTML()
        for (const tag of mediaTags) {
            expect(map[tag], `${tag} should be present`).toBe(UnsupportedHTML)
        }
    })

    it('heading tags are present', () => {
        const headingTags = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']
        const map = buildUnsupportedHTML()
        for (const tag of headingTags) {
            expect(map[tag], `${tag} should be present`).toBe(UnsupportedHTML)
        }
    })
})
