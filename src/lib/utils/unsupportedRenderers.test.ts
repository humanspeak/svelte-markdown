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

    it('excludeRenderersOnly excludes only listed keys (others default)', () => {
        const map = excludeRenderersOnly(['paragraph', 'link'])
        expect(map.paragraph).toBe(Unsupported)
        expect(map.link).toBe(Unsupported)
        expect(map.heading).toBe(defaultRenderers.heading)
    })
})
