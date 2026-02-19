import { expect, test } from '@playwright/test'

test.describe('KaTeX Snippet Overrides', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/katex-snippets')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('should render inline math via snippet override', async ({ page }) => {
        const markdown = 'Inline: $E = mc^2$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexElements = preview.locator('.katex')
        await expect(katexElements.first()).toBeVisible()
        await expect(katexElements).toHaveCount(1)
    })

    test('should render block math via snippet override', async ({ page }) => {
        const markdown = '$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toBeVisible()
        await expect(katexDisplay).toHaveCount(1)
    })

    test('should render mixed inline and block math via snippets', async ({ page }) => {
        const markdown = `# Math

Inline $a^2 + b^2 = c^2$ here.

$$
y = mx + b
$$`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')

        // Heading should render
        await expect(preview.locator('h1')).toHaveText('Math')

        // Inline and block math should both render via snippet overrides
        const allKatex = preview.locator('.katex')
        await expect(allKatex).toHaveCount(2)

        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toHaveCount(1)
    })
})
