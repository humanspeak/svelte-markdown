import { expect, test } from '@playwright/test'

test.describe('SvelteMarkdown', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/reactivity', { waitUntil: 'networkidle' })
    })
    test('should render new content without accumulating previous content', async ({ page }) => {
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

    test('renders HTML tags correctly after plain text', async ({ page }) => {
        // Add markdown content with text followed by HTML
        const markdown = 'Some text!!!\n\n<h1>Something</h1>'

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Wait for the rendering to complete
        await page.waitForSelector('h1')

        // Verify the text content is rendered correctly
        const paragraph = await page.locator('p').first()
        await expect(paragraph).toHaveText('Some text!!!')

        // Verify the HTML tag is rendered correctly
        const heading = await page.locator('h1')
        await expect(heading).toHaveText('Something')

        // Verify the order of elements
        const elements = await page.locator('div.preview > *').all()
        expect(elements.length).toBe(2)
        await expect(elements[0]).toHaveText('Some text!!!')
        await expect(elements[1]).toHaveText('Something')
    })

    test('renders nested HTML tags correctly', async ({ page }) => {
        // Test with nested HTML structure
        const markdown = '<div class="wrapper">Text <span>nested content</span></div>'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Verify the structure
        await expect(page.locator('div.wrapper')).toBeVisible()
        await expect(page.locator('div.wrapper > span')).not.toHaveClass('wrapper')
    })
})
