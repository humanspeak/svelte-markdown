import { expect, test } from '@playwright/test'

test.describe('KaTeX Snippet Overrides', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/katex-snippets')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('renders inline math via \\(...\\) using snippet override', async ({ page }) => {
        const markdown = 'Inline: \\(E = mc^2\\)'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexElements = preview.locator('.katex')
        await expect(katexElements.first()).toBeVisible()
        await expect(katexElements).toHaveCount(1)
    })

    test('renders block math via $$...$$ using snippet override', async ({ page }) => {
        const markdown = '$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toBeVisible()
        await expect(katexDisplay).toHaveCount(1)
    })

    test('renders block math via \\[...\\] using snippet override', async ({ page }) => {
        const markdown = '\\[\n\\nabla \\cdot \\mathbf{E} = \\frac{\\rho}{\\varepsilon_0}\n\\]'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toBeVisible()
        await expect(katexDisplay).toHaveCount(1)
    })

    test('renders mixed inline and block math via snippets', async ({ page }) => {
        const markdown = `# Math

Inline \\(a^2 + b^2 = c^2\\) here.

$$
y = mx + b
$$`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')

        await expect(preview.locator('h1')).toHaveText('Math')

        const allKatex = preview.locator('.katex')
        await expect(allKatex).toHaveCount(2)

        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toHaveCount(1)
    })

    test('does not render balanced $...$ as math by default (singleDollarInline off)', async ({
        page
    }) => {
        const markdown = 'Inline: $E = mc^2$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexElements = preview.locator('.katex')
        await expect(katexElements).toHaveCount(0)
    })

    test.describe('with singleDollarInline enabled', () => {
        test.beforeEach(async ({ page }) => {
            await page.getByTestId('single-dollar-toggle').check()
        })

        test('renders $...$ via snippet override when toggle is on', async ({ page }) => {
            const markdown = 'Inline: $E = mc^2$'
            const textarea = page.getByTestId('markdown-input')
            await textarea.clear()
            await textarea.fill(markdown)

            const preview = page.getByTestId('preview')
            const katexElements = preview.locator('.katex')
            await expect(katexElements.first()).toBeVisible()
            await expect(katexElements).toHaveCount(1)
        })

        test('still does not match $5,000-style currency strings', async ({ page }) => {
            const markdown = 'Budget: $5,000 line item'
            const textarea = page.getByTestId('markdown-input')
            await textarea.clear()
            await textarea.fill(markdown)

            const preview = page.getByTestId('preview')
            const katexElements = preview.locator('.katex')
            await expect(katexElements).toHaveCount(0)
        })
    })
})
