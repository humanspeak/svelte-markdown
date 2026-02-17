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
})

describe('rendererKeysInternal boundary and validation', () => {
    it('has no duplicate keys', () => {
        const unique = new Set(rendererKeysInternal)
        expect(unique.size).toBe(rendererKeysInternal.length)
    })

    it('all keys are non-empty strings', () => {
        for (const key of rendererKeysInternal) {
            expect(typeof key).toBe('string')
            expect(key.length).toBeGreaterThan(0)
        }
    })

    it('does not include the html key', () => {
        expect(rendererKeysInternal).not.toContain('html')
    })

    it('has a reasonable minimum length (>= 20)', () => {
        expect(rendererKeysInternal.length).toBeGreaterThanOrEqual(20)
    })
})

describe('htmlRendererKeysInternal boundary and validation', () => {
    it('has no duplicate keys', () => {
        const unique = new Set(htmlRendererKeysInternal)
        expect(unique.size).toBe(htmlRendererKeysInternal.length)
    })

    it('all keys are non-empty strings', () => {
        for (const key of htmlRendererKeysInternal) {
            expect(typeof key).toBe('string')
            expect(key.length).toBeGreaterThan(0)
        }
    })

    it('has a reasonable minimum length (>= 70)', () => {
        expect(htmlRendererKeysInternal.length).toBeGreaterThanOrEqual(70)
    })
})

describe('spot-check expected keys', () => {
    it('rendererKeysInternal contains core markdown keys', () => {
        const coreKeys = [
            'heading',
            'paragraph',
            'text',
            'link',
            'code',
            'list',
            'table',
            'hr',
            'br'
        ]
        for (const key of coreKeys) {
            expect(rendererKeysInternal).toContain(key)
        }
    })

    it('htmlRendererKeysInternal contains core HTML tags', () => {
        const coreTags = ['div', 'span', 'a', 'p', 'h1', 'input', 'table', 'ul']
        for (const tag of coreTags) {
            expect(htmlRendererKeysInternal).toContain(tag)
        }
    })
})
