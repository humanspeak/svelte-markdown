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

// --- Additional coverage (follow-up to the cases above) ---------------------

import type { HtmlRenderers } from './renderers/html/index.js'
import SnippetCasing from './test/issues/issue-383/SnippetCasing.svelte'
import UppercaseSnippet from './test/issues/issue-383/UppercaseSnippet.svelte'
import Widget from './test/issues/issue-383/Widget.svelte'

/** Svelte's comment anchors are noise in markup assertions. */
const stripAnchors = (html: string) => html.replace(/<!--.*?-->/g, '')

const renderMarkdown = (source: string, html: HtmlRenderers) => {
    const { container } = render(SvelteMarkdown, { props: { source, renderers: { html } } })
    return stripAnchors(container.innerHTML)
}

describe('issue #383 — custom HTML tag renderers', () => {
    describe('self-closing custom tags', () => {
        test('renders the registered component instead of being dropped', () => {
            const output = renderMarkdown('A <widget label="x" />', { widget: Widget })
            expect(output).toContain('data-testid="widget"')
            expect(output).toContain('data-label="x"')
            expect(output).not.toContain('&lt;widget')
        })

        test('resolves identically when nested inside other HTML', () => {
            // The nested path goes through htmlparser2, which reports a
            // self-closed tag's close as *implied*. That previously left
            // `tokens` undefined and echoed the raw source as text.
            const output = renderMarkdown('<div><widget label="x" /></div>', { widget: Widget })
            expect(output).toContain('data-testid="widget"')
            expect(output).not.toContain('&lt;widget')
        })

        test('still renders void elements through their default renderers', () => {
            const { container } = render(SvelteMarkdown, { props: { source: 'A <br/> B' } })
            expect(container.querySelector('br')).not.toBeNull()
        })
    })

    describe('empty paired custom tags', () => {
        test('renders the component with no children rather than the raw tag', () => {
            const output = renderMarkdown('A <widget label="y"></widget>', { widget: Widget })
            expect(output).toContain('data-label="y"')
            expect(output).not.toContain('&lt;widget')
        })
    })

    describe('tag-name casing', () => {
        test.each([
            ['lowercase tag, lowercase key', 'A <widget>x</widget>', 'widget'],
            ['capitalized tag, capitalized key', 'A <Widget>x</Widget>', 'Widget'],
            ['capitalized tag, lowercase key', 'A <Widget>x</Widget>', 'widget'],
            ['lowercase tag, capitalized key', 'A <widget>x</widget>', 'Widget']
        ])('resolves inline: %s', (_label, source, key) => {
            const output = renderMarkdown(source, { [key]: Widget })
            expect(output).toContain('data-testid="widget"')
            expect(output).toContain('x')
        })

        test.each([
            ['capitalized tag, capitalized key', '<div><Widget>x</Widget></div>', 'Widget'],
            ['capitalized tag, lowercase key', '<div><Widget>x</Widget></div>', 'widget']
        ])('resolves when nested: %s', (_label, source, key) => {
            const output = renderMarkdown(source, { [key]: Widget })
            expect(output).toContain('data-testid="widget"')
        })

        test('a null under any casing blocks the tag, even alongside a component', () => {
            // Registration keys are canonical, so `{ Widget, widget: null }` is
            // one tag registered twice; the later entry wins. Previously the
            // lookup preferred exact case while the merge preferred the null,
            // so the two layers disagreed about the same input.
            const output = renderMarkdown('A <Widget>x</Widget>', {
                Widget,
                widget: null
            })
            expect(output).not.toContain('data-testid="widget"')
        })
    })

    describe('regressions', () => {
        test('unregistered tags stay dropped rather than leaking raw source', () => {
            const output = renderMarkdown('A <notatag>x</notatag>', { widget: Widget })
            expect(output).not.toContain('notatag')
            expect(output).toContain('x')
        })

        test('empty paired custom tags resolve when nested too', () => {
            const output = renderMarkdown('<div><widget label="y"></widget></div>', {
                widget: Widget
            })
            expect(output).toContain('data-label="y"')
            expect(output).not.toContain('&lt;widget')
        })

        test('default HTML renderers are unaffected', () => {
            const { container } = render(SvelteMarkdown, {
                props: { source: 'A <span>inner</span> B' }
            })
            expect(container.querySelector('span')?.textContent).toBe('inner')
        })
    })
})

describe('issue #383 — snippet overrides resolve by tag, not by casing', () => {
    const renderSnippet = (source: string) => {
        const { container } = render(SnippetCasing, { props: { source } })
        return stripAnchors(container.innerHTML)
    }

    test.each([
        ['lowercase tag', 'A <div>x</div>'],
        ['uppercase tag', 'A <DIV>x</DIV>'],
        ['uppercase tag, nested', '<p><DIV>x</DIV></p>']
    ])('html_div snippet wins for %s', (_label, source) => {
        // Before the fix an uppercase tag skipped the snippet and silently
        // fell through to the default <div> renderer, so the same tag got a
        // different renderer depending on casing and nesting depth.
        expect(renderSnippet(source)).toContain('data-snippet="div"')
    })
})

describe('adversarial review regressions', () => {
    describe('self-closing child sharing its parent tag name', () => {
        test('does not prematurely close the parent (custom tags)', () => {
            // htmlparser2 emits an *implied* close for `<widget/>`. If that
            // close is allowed to match the open stack it pops the PARENT,
            // orphaning the remaining children.
            // Wrapped in a block element so marked emits one html block and the
            // nested htmlparser2 path handles it — the inline form is paired by
            // a different code path and does not exercise this.
            const output = renderMarkdown(
                '<div><widget label="outer"><widget/>after</widget></div>',
                { widget: Widget }
            )
            const outer = document.createElement('div')
            outer.innerHTML = output
            const parent = outer.querySelector('[data-label="outer"]')
            expect(parent).not.toBeNull()
            expect(parent?.querySelector('[data-testid="widget"]')).not.toBeNull()
            expect(parent?.textContent).toContain('after')
        })

        test('does not prematurely close the parent (default HTML)', () => {
            const { container } = render(SvelteMarkdown, {
                props: { source: '<div id="outer"><div/>after</div>' }
            })
            const parent = container.querySelector('#outer')
            expect(parent).not.toBeNull()
            expect(parent?.textContent).toContain('after')
            expect(parent?.querySelector('div')).not.toBeNull()
        })
    })

    describe('caller renderer entries win over defaults case-insensitively', () => {
        test('an uppercase null blocks the lowercase default tag', () => {
            const { container } = render(SvelteMarkdown, {
                props: {
                    source: '<iframe src="https://example.com"></iframe>',
                    renderers: { html: { IFRAME: null } }
                }
            })
            expect(container.querySelector('iframe')).toBeNull()
        })

        test('a lowercase null still blocks (regression guard)', () => {
            const { container } = render(SvelteMarkdown, {
                props: {
                    source: '<iframe src="https://example.com"></iframe>',
                    renderers: { html: { iframe: null } }
                }
            })
            expect(container.querySelector('iframe')).toBeNull()
        })

        test('an uppercase component override replaces the default tag', () => {
            const output = renderMarkdown('<span>x</span>', { SPAN: Widget })
            expect(output).toContain('data-testid="widget"')
        })
    })

    describe('mixed-case open and close tags pair on the flat path', () => {
        test.each([['<Widget>x</widget>'], ['<widget>x</WIDGET>'], ['<WIDGET>x</Widget>']])(
            'pairs %s',
            (source) => {
                const output = renderMarkdown(`A ${source}`, { widget: Widget })
                expect(output).toContain('data-testid="widget"')
                expect(output).toContain('x')
            }
        )
    })
})

describe('unquoted attribute values ending in a slash', () => {
    // HTML only treats `/` as self-closing from before-attribute-name or after
    // a quoted value. Inside an unquoted value (`href=https://x/`) it is a
    // literal character, and the tag is a normal opening tag.
    test.each([
        ['<div><a href=https://example.com/>Link</a></div>', 'Link'],
        ['<div><a href=/foo/>x</a></div>', 'x'],
        ['<div><a href=https://example.com/ >Link</a></div>', 'Link'],
        // Inline/flat path: these are paired by `pairFlatHtmlTokens` rather
        // than htmlparser2, and it applied the same misreading independently.
        ['<a href=/foo/>x</a>', 'x'],
        ['<a href=https://example.com/>Link</a>', 'Link']
    ])('%s keeps its children', (source, expected) => {
        const { container } = render(SvelteMarkdown, { props: { source } })
        const anchor = container.querySelector('a')
        expect(anchor).not.toBeNull()
        expect(anchor?.textContent).toContain(expected)
    })

    test('a genuinely self-closed tag with a quoted value is still self-closing', () => {
        const output = renderMarkdown('<div><widget label="a/b" /></div>', { widget: Widget })
        expect(output).toContain('data-label="a/b"')
        expect(output).not.toContain('&lt;widget')
    })
})

describe('tag names are canonical regardless of which token path produced them', () => {
    test('token tag is lowercased on both the flat and nested paths', () => {
        const seen: string[] = []
        const capture = (attributes: Record<string, string>, context: { tag: string }) => {
            seen.push(context.tag)
            return attributes
        }
        render(SvelteMarkdown, {
            props: { source: '<IMG SRC="/a.png">', sanitizeAttributes: capture }
        })
        render(SvelteMarkdown, {
            props: { source: '<div><IMG SRC="/a.png"></div>', sanitizeAttributes: capture }
        })
        // SanitizeContext.tag is documented as lowercase; a custom sanitizer
        // keyed on `ctx.tag === 'img'` must fire for both spellings.
        expect(seen.filter((tag) => tag === 'img').length).toBeGreaterThanOrEqual(2)
        expect(seen).not.toContain('IMG')
    })

    test('an uppercase snippet override prop matches a lowercase tag', () => {
        // The inline fast path short-circuited with an exact-case lookup, so
        // `html_DIV` was silently ignored for `<div>`.
        const { container } = render(UppercaseSnippet)
        expect(container.querySelector('[data-snippet="upper"]')).not.toBeNull()
    })
})
