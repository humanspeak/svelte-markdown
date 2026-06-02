import type { SvelteMarkdownOptions } from '$lib/types.js'
import { defaultOptions } from '$lib/utils/markdown-parser.js'
import type { MarkedExtension } from 'marked'
import { describe, expect, it } from 'vitest'
import {
    buildParserOptions,
    getExtensionCacheSignature,
    getExtensionDefaults,
    getExtensionTokenNames,
    hasAsyncExtension
} from './extension-options.js'

type ParserOptionsWithSignature = SvelteMarkdownOptions & {
    _svelteMarkdownExtensionCacheSignature?: unknown
}

const makeInlineExtension = (name: string, displayFormat = 'decimal'): MarkedExtension => ({
    extensions: [
        {
            name,
            level: 'inline',
            start(src) {
                return src.indexOf('(')
            },
            tokenizer(src) {
                const match = /^\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/.exec(src)
                if (!match) return

                return {
                    type: name,
                    raw: match[0],
                    text: match[0],
                    displayFormat
                }
            }
        }
    ]
})

describe('extension option utilities', () => {
    it('extracts custom token names from all extensions', () => {
        expect(
            getExtensionTokenNames([
                makeInlineExtension('displayButton'),
                {},
                makeInlineExtension('badge')
            ])
        ).toEqual(['displayButton', 'badge'])
    })

    it('detects async extensions only when marked async is true', () => {
        expect(hasAsyncExtension([{ async: false }, makeInlineExtension('sync')])).toBe(false)
        expect(hasAsyncExtension([{ async: true }, makeInlineExtension('sync')])).toBe(true)
    })

    it('returns no extension defaults when no extensions are provided', () => {
        expect(getExtensionDefaults([])).toEqual({})
    })

    it('resolves marked extension defaults for custom tokenizers', () => {
        const defaults = getExtensionDefaults([makeInlineExtension('displayButton')])

        expect(defaults.extensions?.inline?.length).toBe(1)
        expect(defaults.extensions?.startInline?.length).toBe(1)
    })

    it('merges default options, extension defaults, and caller options', () => {
        const combinedOptions = buildParserOptions({ gfm: false }, [
            makeInlineExtension('displayButton')
        ]) as ParserOptionsWithSignature

        expect(combinedOptions.headerIds).toBe(defaultOptions.headerIds)
        expect(combinedOptions.gfm).toBe(false)
        expect(combinedOptions.extensions?.inline?.length).toBe(1)
        expect(combinedOptions.extensions?.startInline?.length).toBe(1)
        expect(combinedOptions._svelteMarkdownExtensionCacheSignature).toBeDefined()
    })

    it('does not add the internal cache signature without extensions', () => {
        const combinedOptions = buildParserOptions({}, []) as ParserOptionsWithSignature

        expect('_svelteMarkdownExtensionCacheSignature' in combinedOptions).toBe(false)
    })

    it('keeps cache signatures stable for the same extension objects', () => {
        const extension = makeInlineExtension('displayButton', 'decimal')

        expect(getExtensionCacheSignature([extension])).toEqual(
            getExtensionCacheSignature([extension])
        )
    })

    it('changes cache signatures when an equivalent extension object is replaced', () => {
        const firstExtension = makeInlineExtension('displayButton', 'decimal')
        const secondExtension = makeInlineExtension('displayButton', 'decimal')

        expect(getExtensionCacheSignature([firstExtension])).not.toEqual(
            getExtensionCacheSignature([secondExtension])
        )
    })

    it('includes tokenizer metadata and function identities in the signature', () => {
        const signature = getExtensionCacheSignature([makeInlineExtension('displayButton')])

        expect(signature).toEqual([
            expect.objectContaining({
                async: false,
                extensions: [
                    expect.objectContaining({
                        name: 'displayButton',
                        level: 'inline',
                        childTokens: null,
                        start: expect.any(Number),
                        tokenizer: expect.any(Number),
                        renderer: null
                    })
                ]
            })
        ])
    })
})
