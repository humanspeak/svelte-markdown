import { expect, test } from '@playwright/test'

test.describe('SvelteMarkdown Extendability', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/extendability')
        // Wait for the page to be fully loaded and ready
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('should render custom div component with attributes', async ({ page }) => {
        // Test basic div with custom attribute
        const markdown = '<div>test content</div>'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Wait for the preview to update
        await page.waitForSelector('.preview')

        // Verify our custom div component is used with its test attribute
        const div = page.locator('div[data-markdown-test]')
        await expect(div).toBeVisible()
        await expect(div).toHaveText('test content')
        await expect(div).toHaveAttribute('data-markdown-test', 'data-markdown-test-div')
    })

    test('should properly handle nested custom components', async ({ page }) => {
        const markdown = '<div>outer <span>inner content</span></div>'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Wait for the preview to update
        await page.waitForSelector('.preview')

        // Verify nested structure
        const div = page.locator('div[data-markdown-test]')
        await expect(div).toBeVisible()
        const span = div.locator('span')
        await expect(span).toHaveText('inner content')

        // Verify attributes don't propagate incorrectly
        await expect(span).not.toHaveAttribute('data-markdown-test')
    })

    test('should handle custom components with multiple attributes', async ({ page }) => {
        const markdown = '<div class="test-class" id="test-id">content</div>'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Wait for the preview to update
        await page.waitForSelector('.preview')

        const div = page.locator('div[data-markdown-test]')
        await expect(div).toBeVisible()
        await expect(div).toHaveClass(/test-class/)
        await expect(div).toHaveAttribute('id', 'test-id')
        await expect(div).toHaveAttribute('data-markdown-test', 'data-markdown-test-div')
    })

    test('should handle multiple custom components in sequence', async ({ page }) => {
        const markdown = '<div>first</div>\n<div>second</div>'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Wait for the preview to update
        await page.waitForSelector('.preview')

        const divs = page.locator('div[data-markdown-test]')
        await expect(divs).toHaveCount(2)

        const allDivs = await divs.all()
        await expect(allDivs[0]).toHaveText('first')
        await expect(allDivs[1]).toHaveText('second')
    })

    test('should handle custom components with mixed content types', async ({ page }) => {
        const markdown = `
# Header
<div>custom div content</div>
Regular paragraph
<div>another custom div</div>`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Wait for the preview to update
        await page.waitForSelector('.preview')

        // Check header
        await expect(page.locator('h1')).toHaveText('Header')

        // Check custom divs
        const divs = page.locator('div[data-markdown-test]')
        await expect(divs).toHaveCount(2)

        const allDivs = await divs.all()
        await expect(allDivs[0]).toHaveText('custom div content')
        await expect(allDivs[1]).toHaveText('another custom div')

        // Check paragraph
        await expect(page.getByText('Regular paragraph')).toBeVisible()
    })

    test('should preserve custom component attributes when updating content', async ({ page }) => {
        // Initial content
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill('<div>initial</div>')

        // Wait for the preview to update
        await page.waitForSelector('.preview')

        // Verify initial state
        const div = page.locator('div[data-markdown-test]')
        await expect(div).toBeVisible()
        await expect(div).toHaveText('initial')
        await expect(div).toHaveAttribute('data-markdown-test', 'data-markdown-test-div')

        // Update content
        await textarea.clear()
        await textarea.fill('<div>updated</div>')

        // Wait for the update
        await expect(div).toHaveText('updated')
        await expect(div).toHaveAttribute('data-markdown-test', 'data-markdown-test-div')
    })

    test('should convert &nbsp; to regular space in headers', async ({ page }) => {
        const markdown = '&nbsp;Hello'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        // Wait for the preview to update
        await page.waitForSelector('.preview')

        // Verify the header text has a regular space instead of &nbsp;
        const header = page.locator('p')
        await expect(header).toBeVisible()
        await expect(header).toHaveText(' Hello')
    })
})
