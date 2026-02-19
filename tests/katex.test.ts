import { expect, test } from '@playwright/test'

test.describe('KaTeX Math Extension', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/katex')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('should render inline math with KaTeX', async ({ page }) => {
        const markdown = 'Inline: $E = mc^2$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexElements = preview.locator('.katex')
        await expect(katexElements.first()).toBeVisible()
        await expect(katexElements).toHaveCount(1)
    })

    test('should render block math in display mode', async ({ page }) => {
        const markdown = '$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toBeVisible()
        await expect(katexDisplay).toHaveCount(1)
    })

    test('should render multiple inline math expressions', async ({ page }) => {
        const markdown = 'First $a^2$ and second $b^2$ and third $c^2$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const katexElements = preview.locator('.katex')
        await expect(katexElements).toHaveCount(3)
    })

    test('should render mixed math and regular markdown', async ({ page }) => {
        const markdown = `# Math Section

Some **bold** text with $x^2$ inline math.

$$
y = mx + b
$$

- List item with $\\alpha$`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')

        // Check heading
        await expect(preview.locator('h1')).toHaveText('Math Section')

        // Check bold text
        await expect(preview.locator('strong')).toHaveText('bold')

        // Check inline and block math rendered
        const allKatex = preview.locator('.katex')
        await expect(allKatex).toHaveCount(3) // x^2, display, alpha

        // Check display math
        const katexDisplay = preview.locator('.katex-display')
        await expect(katexDisplay).toHaveCount(1)

        // Check list item
        await expect(preview.locator('li')).toBeVisible()
    })

    test('should update when textarea content changes', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        const preview = page.getByTestId('preview')

        // Set initial content
        await textarea.clear()
        await textarea.fill('$a$')

        let katexElements = preview.locator('.katex')
        await expect(katexElements).toHaveCount(1)

        // Update to new content
        await textarea.clear()
        await textarea.fill('$a$ and $b$ and $c$')

        katexElements = preview.locator('.katex')
        await expect(katexElements).toHaveCount(3)
    })

    test('should handle invalid LaTeX gracefully', async ({ page }) => {
        const markdown = 'Invalid: $\\invalid{command}$'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        // With throwOnError: false, KaTeX renders an error message instead of throwing
        // The .katex class should still be present
        const katexElements = preview.locator('.katex')
        await expect(katexElements.first()).toBeVisible()
    })
})
