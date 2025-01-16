import { expect, test } from '@playwright/test'

test.describe('SvelteMarkdown', () => {
    test('should render new content without accumulating previous content', async ({ page }) => {
        // Navigate to the test page
        await page.goto('/test/reactivity')

        // Get the textarea
        const textarea = page.getByTestId('markdown-input')

        // Check initial content
        await expect(page.locator('h1')).toHaveText('Hello')

        // Clear textarea and type new content
        await textarea.clear()
        await textarea.fill('# World')

        // Verify only new content is shown
        await expect(page.locator('h1')).toHaveText('World')
        await expect(page.getByText('Hello')).not.toBeVisible()
    })

    test('should handle multiple content updates correctly', async ({ page }) => {
        await page.goto('/test/reactivity')
        const textarea = page.getByTestId('markdown-input')

        // Series of updates
        await textarea.clear()
        await textarea.fill('# First')
        await expect(page.locator('h1')).toHaveText('First')

        await textarea.clear()
        await textarea.fill('# Second')
        await expect(page.locator('h1')).toHaveText('Second')

        await textarea.clear()
        await textarea.fill('# Third')
        await expect(page.locator('h1')).toHaveText('Third')

        // Verify only latest content is visible
        await expect(page.getByText('First')).not.toBeVisible()
        await expect(page.getByText('Second')).not.toBeVisible()
    })

    test('should handle complex markdown updates', async ({ page }) => {
        await page.goto('/test/reactivity')
        const textarea = page.getByTestId('markdown-input')

        // Test with more complex markdown
        const complexMarkdown = `
# Main Title
## Subtitle
- List item 1
- List item 2

**Bold text** and *italic text*

[A link](https://example.com)
        `.trim()

        await textarea.clear()
        await textarea.fill(complexMarkdown)

        // Verify complex markdown rendering
        await expect(page.locator('h1')).toHaveText('Main Title')
        await expect(page.locator('h2')).toHaveText('Subtitle')
        await expect(page.locator('ul li')).toHaveCount(2)
        await expect(page.locator('strong')).toHaveText('Bold text')
        await expect(page.locator('em')).toHaveText('italic text')
        await expect(page.locator('a')).toHaveAttribute('href', 'https://example.com')
    })

    test('should handle unordered nested lists', async ({ page }) => {
        await page.goto('/test/reactivity')
        const textarea = page.getByTestId('markdown-input')

        // Test with more complex markdown
        const complexMarkdown = `
- List item 1
  - List item 2
        `.trim()

        await textarea.clear()
        await textarea.fill(complexMarkdown)

        // Verify complex markdown rendering
        await expect(page.locator('.preview>ul>li')).toHaveCount(1)
        await expect(page.locator('.preview>ul>li>ul>li')).toHaveCount(1)
        await expect(page.locator('ul li')).toHaveCount(2)
    })
    test('should handle ordered nested lists', async ({ page }) => {
        await page.goto('/test/reactivity')
        const textarea = page.getByTestId('markdown-input')

        // Test with more complex markdown
        const complexMarkdown = `
1. List item 1
   1. List item 2
        `.trim()

        await textarea.clear()
        await textarea.fill(complexMarkdown)

        // Verify complex markdown rendering
        await expect(page.locator('.preview>ol>li')).toHaveCount(1)
        await expect(page.locator('.preview>ol>li>ol>li')).toHaveCount(1)
        await expect(page.locator('ol li')).toHaveCount(2)
    })
    test('should handle mixed nested lists', async ({ page }) => {
        await page.goto('/test/reactivity')
        const textarea = page.getByTestId('markdown-input')

        // Test with more complex markdown
        const complexMarkdown = `
- List item 1
   1. List item 2
        `.trim()

        await textarea.clear()
        await textarea.fill(complexMarkdown)

        // Verify complex markdown rendering
        await expect(page.locator('.preview>ul>li')).toHaveCount(1)
        await expect(page.locator('.preview>ul>li>ol>li')).toHaveCount(1)
        await expect(page.locator('li')).toHaveCount(2)
    })
})
