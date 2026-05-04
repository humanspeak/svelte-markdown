import { expect, test } from '@playwright/test'

test.describe('KaTeX Math Extension', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/katex')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('renders inline math via \\(...\\) by default', async ({ page }) => {
        const markdown = 'Inline: \\(E = mc^2\\)'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexElements = preview.locator('.katex')
        await expect(katexElements.first()).toBeVisible()
        await expect(katexElements).toHaveCount(1)
    })

    test('renders block math via $$...$$ in display mode', async ({ page }) => {
        const markdown = '$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toBeVisible()
        await expect(katexDisplay).toHaveCount(1)
    })

    test('renders block math via \\[...\\] in display mode', async ({ page }) => {
        const markdown = '\\[\n\\int_0^1 x^2 dx = \\frac{1}{3}\n\\]'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toBeVisible()
        await expect(katexDisplay).toHaveCount(1)
    })

    test('renders an AMS environment in display mode', async ({ page }) => {
        const markdown = '\\begin{equation}\nx = 1\n\\end{equation}'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toBeVisible()
        await expect(katexDisplay).toHaveCount(1)
    })

    test('renders multiple inline math expressions', async ({ page }) => {
        const markdown = 'First \\(a^2\\) and second \\(b^2\\) and third \\(c^2\\)'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexElements = preview.locator('.katex')
        await expect(katexElements).toHaveCount(3)
    })

    test('renders mixed math and regular markdown', async ({ page }) => {
        const markdown = `# Math Section

Some **bold** text with \\(x^2\\) inline math.

$$
y = mx + b
$$

- List item with \\(\\alpha\\)`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')

        await expect(preview.locator('h1')).toHaveText('Math Section')
        await expect(preview.locator('strong')).toHaveText('bold')

        // Inline x^2, the $$...$$ display block, and inline alpha
        const allKatex = preview.locator('.katex')
        await expect(allKatex).toHaveCount(3)

        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toHaveCount(1)

        await expect(preview.locator('li')).toBeVisible()
    })

    test('updates when textarea content changes', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        const preview = page.getByTestId('preview')

        await textarea.clear()
        await textarea.fill('\\(a\\)')

        let katexElements = preview.locator('.katex')
        await expect(katexElements).toHaveCount(1)

        await textarea.clear()
        await textarea.fill('\\(a\\) and \\(b\\) and \\(c\\)')

        katexElements = preview.locator('.katex')
        await expect(katexElements).toHaveCount(3)
    })

    test('handles invalid LaTeX gracefully', async ({ page }) => {
        const markdown = 'Invalid: \\(\\invalid{command}\\)'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        // With throwOnError: false, KaTeX renders an error span instead of throwing.
        // The .katex wrapper is still present.
        const katexElements = preview.locator('.katex')
        await expect(katexElements.first()).toBeVisible()
    })

    test('does not render $...$ as math by default (singleDollarInline off)', async ({ page }) => {
        const markdown = 'Price: $5,000 budget and rate: $42 per hour'
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

        test('renders $...$ as inline math when toggle is on', async ({ page }) => {
            const markdown = 'Inline: $E = mc^2$'
            const textarea = page.getByTestId('markdown-input')
            await textarea.clear()
            await textarea.fill(markdown)

            const preview = page.getByTestId('preview')
            const katexElements = preview.locator('.katex')
            await expect(katexElements.first()).toBeVisible()
            await expect(katexElements).toHaveCount(1)
        })

        test('renders multiple $...$ inline expressions', async ({ page }) => {
            const markdown = 'First $a^2$ and second $b^2$ and third $c^2$'
            const textarea = page.getByTestId('markdown-input')
            await textarea.clear()
            await textarea.fill(markdown)

            const preview = page.getByTestId('preview')
            const katexElements = preview.locator('.katex')
            await expect(katexElements).toHaveCount(3)
        })

        test('still does not match $5,000-style currency strings', async ({ page }) => {
            const markdown = 'Price: $5,000 budget'
            const textarea = page.getByTestId('markdown-input')
            await textarea.clear()
            await textarea.fill(markdown)

            const preview = page.getByTestId('preview')
            const katexElements = preview.locator('.katex')
            await expect(katexElements).toHaveCount(0)
        })
    })
})
