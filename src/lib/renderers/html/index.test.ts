import type { Component } from 'svelte'
import { describe, expect, it } from 'vitest'
import Html from './index.js'

describe('HTML Renderers', () => {
    it('should export all HTML components', () => {
        const expectedComponents = [
            'a',
            'abbr',
            'address',
            'article',
            'aside',
            'audio',
            'b',
            'bdi',
            'bdo',
            'blockquote',
            'button',
            'canvas',
            'cite',
            'code',
            'datalist',
            'dd',
            'del',
            'details',
            'dfn',
            'dialog',
            'div',
            'dl',
            'dt',
            'em',
            'embed',
            'fieldset',
            'footer',
            'form',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'header',
            'hgroup',
            'hr',
            'i',
            'iframe',
            'img',
            'input',
            'kbd',
            'label',
            'legend',
            'li',
            'main',
            'mark',
            'menu',
            'meter',
            'nav',
            'ol',
            'optgroup',
            'option',
            'output',
            'p',
            'param',
            'picture',
            'pre',
            'progress',
            's',
            'samp',
            'section',
            'select',
            'small',
            'source',
            'span',
            'strong',
            'sub',
            'summary',
            'sup',
            'table',
            'tbody',
            'td',
            'textarea',
            'tfoot',
            'th',
            'thead',
            'tr',
            'track',
            'u',
            'ul',
            'var'
        ]

        expectedComponents.forEach((component) => {
            expect(Html[component]).toBeTruthy()
            expect(Html[component]).toBeTypeOf('function')
            expect(typeof (Html[component] as Component)).toBe('function')
        })
    })

    it('should have correct type for HtmlRenderers interface', () => {
        const htmlRenderers: Record<string, Component | null> = Html
        expect(htmlRenderers).toBeTruthy()
        expect(Object.keys(htmlRenderers).length).toBeGreaterThan(0)
    })

    it('should export Html as default export', () => {
        expect(Html).toBeTruthy()
        expect(typeof Html).toBe('object')
    })

    it('should have matching component names and values', () => {
        Object.entries(Html).forEach(([key, value]) => {
            if (value) {
                // Check if the component name matches its key in the Html object
                // For example, 'div' should map to a component named 'Div'
                const expectedName = key.charAt(0).toUpperCase() + key.slice(1)
                expect(value.name).toBe(expectedName)
            }
        })
    })
})
