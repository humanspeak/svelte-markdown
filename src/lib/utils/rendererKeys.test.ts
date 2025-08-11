import {
    htmlRendererKeys as publicHtmlKeys,
    rendererKeys as publicRendererKeys
} from '$lib/index.js'
import Html from '$lib/renderers/html/index.js'
import { defaultRenderers } from '$lib/utils/markdown-parser.js'
import { htmlRendererKeysInternal, rendererKeysInternal } from '$lib/utils/rendererKeys.js'
import { describe, expect, it } from 'vitest'

describe('rendererKeys internals', () => {
    it('rendererKeysInternal matches defaultRenderers (excludes html)', () => {
        const expected = Object.keys(defaultRenderers).filter((k) => k !== 'html')
        expect(Array.isArray(rendererKeysInternal)).toBe(true)
        expect(rendererKeysInternal).toEqual(expected)
    })

    it('htmlRendererKeysInternal matches Html keys', () => {
        const expected = Object.keys(Html)
        expect(Array.isArray(htmlRendererKeysInternal)).toBe(true)
        expect(htmlRendererKeysInternal).toEqual(expected)
    })

    it('public keys equal internal keys', () => {
        expect(publicRendererKeys).toEqual(rendererKeysInternal)
        expect(publicHtmlKeys).toEqual(htmlRendererKeysInternal)
    })

    // index.js exports public names (without "Internal"). Public should equal internals
})
