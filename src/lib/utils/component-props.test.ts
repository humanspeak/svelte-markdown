import { defaultRenderers } from '$lib/utils/markdown-parser.js'
import { rendererKeysInternal } from '$lib/utils/rendererKeys.js'
import { describe, expect, it } from 'vitest'
import {
    buildCombinedRenderers,
    getAllRendererKeys,
    getHtmlSnippetOverrides,
    getPassThroughProps,
    getSnippetOverrides
} from './component-props.js'

const customParagraph = Symbol('custom paragraph') as unknown as typeof defaultRenderers.paragraph
const customHtmlAnchor = Symbol('custom anchor') as unknown as typeof defaultRenderers.html.a
const snippet = () => 'snippet'
const htmlSnippet = () => 'html snippet'

describe('component prop utilities', () => {
    it('merges custom markdown renderers with defaults', () => {
        const renderers = buildCombinedRenderers({ paragraph: customParagraph })

        expect(renderers.paragraph).toBe(customParagraph)
        expect(renderers.heading).toBe(defaultRenderers.heading)
        expect(renderers.html).toBe(defaultRenderers.html)
    })

    it('merges custom HTML renderers without dropping default HTML renderers', () => {
        const renderers = buildCombinedRenderers({ html: { a: customHtmlAnchor } })

        expect(renderers.html.a).toBe(customHtmlAnchor)
        expect(renderers.html.div).toBe(defaultRenderers.html.div)
    })

    it('combines built-in renderer keys with extension token names', () => {
        const keys = getAllRendererKeys(['displayButton', 'badge'])

        expect(keys).toEqual([...rendererKeysInternal, 'displayButton', 'badge'])
    })

    it('collects markdown snippet overrides for built-in and extension token keys', () => {
        const overrides = getSnippetOverrides(
            {
                paragraph: snippet,
                displayButton: snippet,
                heading: null,
                class: 'markdown'
            },
            getAllRendererKeys(['displayButton'])
        )

        expect(overrides).toEqual({
            paragraph: snippet,
            displayButton: snippet
        })
    })

    it('collects HTML snippet overrides and strips the html_ prefix', () => {
        const overrides = getHtmlSnippetOverrides({
            html_a: htmlSnippet,
            html_div: null,
            paragraph: snippet
        })

        expect(overrides).toEqual({ a: htmlSnippet })
    })

    it('passes through non-snippet props only', () => {
        const props = getPassThroughProps(
            {
                paragraph: snippet,
                displayButton: snippet,
                html_a: htmlSnippet,
                html_div: null,
                class: 'markdown',
                id: 'example'
            },
            getAllRendererKeys(['displayButton'])
        )

        expect(props).toEqual({
            class: 'markdown',
            id: 'example'
        })
    })
})
