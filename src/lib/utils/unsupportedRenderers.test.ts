import { Unsupported } from '$lib/renderers/index.js'
import { defaultRenderers } from '$lib/utils/markdown-parser.js'
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
            // @ts-expect-error invalid key should be ignored safely
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
