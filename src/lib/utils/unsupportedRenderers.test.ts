import { Unsupported } from '$lib/renderers/index.js'
import { defaultRenderers } from '$lib/utils/markdown-parser.js'
import { rendererKeysInternal } from '$lib/utils/rendererKeys.js'
import { describe, expect, it } from 'vitest'
import {
    allowRenderersOnly,
    buildUnsupportedRenderers,
    excludeRenderersOnly
} from './unsupportedRenderers.js'

describe('unsupported renderers helpers', () => {
    it('buildUnsupportedRenderers maps all non-html keys to Unsupported', () => {
        const map = buildUnsupportedRenderers()
        Object.keys(defaultRenderers)
            .filter((k) => k !== 'html')
            .forEach((k) => {
                // @ts-expect-error: index by runtime key
                expect(map[k]).toBe(Unsupported)
            })
    })

    it('allowRenderersOnly allows defaults for listed keys', () => {
        const allowed = allowRenderersOnly(['paragraph', 'link'])
        expect(allowed.paragraph).toBe(defaultRenderers.paragraph)
        expect(allowed.link).toBe(defaultRenderers.link)
        expect(allowed.heading).toBe(Unsupported)
    })

    it('allowRenderersOnly supports [key, component] tuples and ignores invalid keys', () => {
        const Custom = defaultRenderers.paragraph
        const allowed = allowRenderersOnly([
            ['paragraph', Custom],
            ['not-a-key', Custom]
        ] as any)
        expect(allowed.paragraph).toBe(Custom)
        // @ts-expect-error runtime index
        expect(allowed['not-a-key']).toBeUndefined()
    })

    it('excludeRenderersOnly excludes only listed keys (others default)', () => {
        const map = excludeRenderersOnly(['paragraph', 'link'])
        expect(map.paragraph).toBe(Unsupported)
        expect(map.link).toBe(Unsupported)
        expect(map.heading).toBe(defaultRenderers.heading)
    })

    it('excludeRenderersOnly honors overrides and gives precedence to exclusions', () => {
        const Custom = defaultRenderers.paragraph
        const map = excludeRenderersOnly(['link'], [
            ['paragraph', Custom],
            // attempt to override excluded key should be ignored
            ['link', Custom]
        ] as any)
        expect(map.paragraph).toBe(Custom)
        expect(map.link).toBe(Unsupported)
    })
})

describe('unsupported renderers negative tests', () => {
    it('allowRenderersOnly with empty array maps every key to Unsupported', () => {
        const map = allowRenderersOnly([])
        for (const key of rendererKeysInternal) {
            expect(map[key], `${key} should be Unsupported`).toBe(Unsupported)
        }
    })

    it('allowRenderersOnly with all invalid keys maps every key to Unsupported', () => {
        const map = allowRenderersOnly(['fake-key-1', 'fake-key-2'] as any)
        for (const key of rendererKeysInternal) {
            expect(map[key], `${key} should be Unsupported`).toBe(Unsupported)
        }
    })

    it('excludeRenderersOnly with invalid keys silently ignores them', () => {
        const map = excludeRenderersOnly(['not-a-key'] as any)
        for (const key of rendererKeysInternal) {
            expect(map[key], `${key} should be default`).toBe(defaultRenderers[key])
        }
    })
})

describe('unsupported renderers boundary tests', () => {
    it('buildUnsupportedRenderers returns a new object each call', () => {
        const a = buildUnsupportedRenderers()
        const b = buildUnsupportedRenderers()
        expect(a).not.toBe(b)
        expect(a).toEqual(b)
    })

    it('result key count matches rendererKeysInternal length', () => {
        const map = buildUnsupportedRenderers()
        expect(Object.keys(map)).toHaveLength(rendererKeysInternal.length)
    })

    it('excludeRenderersOnly with empty array preserves all defaults', () => {
        const map = excludeRenderersOnly([])
        for (const key of rendererKeysInternal) {
            expect(map[key], `${key} should be default`).toBe(defaultRenderers[key])
        }
    })

    it('excludeRenderersOnly with empty overrides array is the same as without', () => {
        const withoutOverrides = excludeRenderersOnly(['paragraph'])
        const withEmptyOverrides = excludeRenderersOnly(['paragraph'], [])
        expect(withoutOverrides).toEqual(withEmptyOverrides)
    })
})

describe('unsupported renderers spot-check completeness', () => {
    it('block elements are covered', () => {
        const blockKeys = ['heading', 'paragraph', 'blockquote', 'code', 'hr']
        const map = buildUnsupportedRenderers()
        for (const key of blockKeys) {
            // @ts-expect-error: runtime key index
            expect(map[key], `${key} should exist in result`).toBe(Unsupported)
        }
    })

    it('inline elements are covered', () => {
        const inlineKeys = ['text', 'link', 'em', 'strong', 'codespan', 'del', 'br']
        const map = buildUnsupportedRenderers()
        for (const key of inlineKeys) {
            // @ts-expect-error: runtime key index
            expect(map[key], `${key} should exist in result`).toBe(Unsupported)
        }
    })

    it('table elements are covered', () => {
        const tableKeys = ['table', 'tablehead', 'tablebody', 'tablerow', 'tablecell']
        const map = buildUnsupportedRenderers()
        for (const key of tableKeys) {
            // @ts-expect-error: runtime key index
            expect(map[key], `${key} should exist in result`).toBe(Unsupported)
        }
    })
})
