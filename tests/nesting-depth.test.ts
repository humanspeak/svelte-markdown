import { expect, test } from '@playwright/test'

// HUM-132: deeply nested input used to overflow the call stack while
// rendering. Each engine reports that differently (Firefox throws
// InternalError, not RangeError), so this runs on the whole browser matrix.

/** Longest chain of nested elements matching `selector` inside the output. */
const nestedCount = (root: Element, selector: string): number => {
    let max = 0
    for (const el of root.querySelectorAll(selector)) {
        let depth = 0
        for (let node: Element | null = el; node && node !== root; node = node.parentElement) {
            if (node.matches(selector)) depth++
        }
        max = Math.max(max, depth)
    }
    return max
}

test.describe('Nesting depth guard', () => {
    // [button, nested element, expected nesting, text that must stay visible].
    // `lexer` is deep enough to overflow marked's own lexer: it renders as
    // plain text, with no blockquotes at all.
    for (const [key, selector, cap, text] of [
        ['quotes', 'blockquote', 16, 'deep'],
        ['lists', 'ul', 8, '- item'],
        ['tags', 'div', 16, 'deep'],
        ['lexer', 'blockquote', 0, '> > deep']
    ] as const) {
        test(`renders deeply nested ${key} without crashing`, async ({ page }) => {
            const errors: string[] = []
            page.on('pageerror', (error) => errors.push(error.message))
            await page.goto('/test/nesting-depth')
            await page.getByTestId(`load-${key}`).click()
            const output = page.getByTestId('markdown-output')
            await expect(output).toContainText(text)
            await expect(page.getByTestId('render-error')).toHaveCount(0)
            // Self-contained function: Playwright serializes it into the page.
            expect(await output.evaluate(nestedCount, selector)).toBe(cap)
            expect(errors).toEqual([])
        })
    }
})
