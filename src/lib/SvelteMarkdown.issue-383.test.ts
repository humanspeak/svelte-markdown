/**
 * Regression coverage for issue #383.
 *
 * Custom tags registered in `renderers.html` were dropped when written as
 * `<widget />`, looked up with inconsistent casing between the inline pairing
 * path and nested htmlparser2 path, and leaked the raw opening tag as visible
 * text when the paired element had no children.
 *
 * https://github.com/humanspeak/svelte-markdown/issues/383
 */

import '@testing-library/jest-dom'
import { render } from '@testing-library/svelte'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import SvelteMarkdown from './SvelteMarkdown.svelte'
import ClickRenderer from './test/snippets/ClickRenderer.svelte'
import { tokenCache } from './utils/token-cache.js'

beforeEach(() => {
    tokenCache.clearAllTokens()
})

const renderWidget = async (source: string, htmlKey: 'widget' | 'Widget' = 'widget') => {
    const { container } = render(SvelteMarkdown, {
        props: {
            source,
            renderers: { html: { [htmlKey]: ClickRenderer } }
        }
    })
    await vi.runAllTimersAsync()
    return container
}

describe('issue #383 custom html tag dispatch', () => {
    test('renders a self-closing custom tag registered in renderers.html', async () => {
        const container = await renderWidget('A <widget />')
        const widget = container.querySelector('[data-testid="custom-tag-component"]')
        expect(widget).toBeInTheDocument()
        expect(widget?.textContent).toBe('')
        expect(container.textContent).not.toContain('<widget')
    })

    test('resolves PascalCase source against a lowercase renderer key', async () => {
        const container = await renderWidget('A <Widget>x</Widget>', 'widget')
        const widget = container.querySelector('[data-testid="custom-tag-component"]')
        expect(widget).toBeInTheDocument()
        expect(widget).toHaveTextContent('x')
    })

    test('resolves nested PascalCase source against a PascalCase renderer key', async () => {
        const container = await renderWidget('<div><Widget>x</Widget></div>', 'Widget')
        const widget = container.querySelector('[data-testid="custom-tag-component"]')
        expect(widget).toBeInTheDocument()
        expect(widget).toHaveTextContent('x')
        expect(container.querySelector('div')).toBeInTheDocument()
    })

    test('does not leak the raw opening tag from an empty paired custom element', async () => {
        const container = await renderWidget('A <widget></widget>')
        const widget = container.querySelector('[data-testid="custom-tag-component"]')
        expect(widget).toBeInTheDocument()
        expect(widget?.textContent).toBe('')
        expect(container.textContent).not.toContain('<widget')
        expect(container.textContent).not.toContain('&lt;widget')
    })

    test('renders a nested self-closing custom tag without leaking raw source', async () => {
        const container = await renderWidget('<div><widget /></div>')
        const widget = container.querySelector('[data-testid="custom-tag-component"]')
        expect(widget).toBeInTheDocument()
        expect(widget?.textContent).toBe('')
        expect(container.textContent).not.toContain('<widget')
    })
})
