import { expect, test } from '@playwright/test'

test.describe('Deep Variables', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/deep-variables', { waitUntil: 'networkidle' })
    })

    test('should pass deep variables to custom components', async ({ page }) => {
        // Check that the RawText component receives the deep variable
        await expect(page.getByTestId('rawtext')).toHaveText(
            '#&nbsp;Hello You are amazing!!! :D  Hello Deep Variable'
        )
    })

    test('should handle deep variables with custom markdown content', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')

        // Update the markdown content
        await textarea.clear()
        await textarea.fill('#&nbsp;New Content')

        // Verify the deep variable is still passed correctly
        await expect(page.getByTestId('rawtext')).toHaveText(
            '#&nbsp;New Content Hello Deep Variable'
        )
    })

    test('should handle deep variables with complex markdown', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')

        // Test with more complex markdown that includes the rawtext component
        const complexMarkdown = `
#&nbsp;Title
Some regular text
#&nbsp;Another rawtext component
        `.trim()

        await textarea.clear()
        await textarea.fill(complexMarkdown)

        // Verify all rawtext components receive the deep variable
        const rawtextElements = page.getByTestId('rawtext')
        await expect(rawtextElements).toHaveCount(1)

        // Check that each rawtext component shows the deep variable
        await expect(rawtextElements.nth(0)).toHaveText(
            '#&nbsp;Title\nSome regular text\n#&nbsp;Another rawtext component\n         Hello Deep Variable'
        )
    })

    test('should handle deep variables with nested structures', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')

        // Test with nested markdown structures
        const nestedMarkdown = `
#&nbsp;Outer
- List item with #&nbsp;rawtext
- Another item
        `.trim()

        await textarea.clear()
        await textarea.fill(nestedMarkdown)

        // Verify the rawtext component in the list receives the deep variable

        const rawtextElements = page.getByTestId('rawtext')
        await expect(rawtextElements).toHaveCount(3)

        await expect(rawtextElements.nth(0)).toHaveText('#&nbsp;Outer Hello Deep Variable')
        await expect(page.locator('ul li')).toHaveCount(2)

        // Check that the rawtext component inside the list item receives the deep variable
        const listItems = page.locator('ul li')
        await expect(listItems.nth(0)).toContainText('rawtext Hello Deep Variable')
    })

    test('should handle deep variables with multiple rawtext components', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')

        // Test with multiple rawtext components
        const multipleRawtext = `
#&nbsp;First
#&nbsp;Second
#&nbsp;Third
        `.trim()

        await textarea.clear()
        await textarea.fill(multipleRawtext)

        // Verify all rawtext components receive the deep variable
        const rawtextElement = page.getByTestId('rawtext')

        await expect(rawtextElement).toHaveText(
            '#&nbsp;First\n#&nbsp;Second\n#&nbsp;Third Hello Deep Variable'
        )
    })

    test('should handle deep variables with mixed content types', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')

        // Test with a mix of regular markdown and rawtext components
        const mixedContent = `
# Regular Heading
#&nbsp;Rawtext Component
**Bold text**
#&nbsp;Another rawtext
        `.trim()

        await textarea.clear()
        await textarea.fill(mixedContent)

        // Verify the structure
        await expect(page.locator('h1')).toHaveText('Regular Heading Hello Deep Variable')
        await expect(page.locator('strong')).toHaveText('Bold text Hello Deep Variable')

        // Verify rawtext components receive the deep variable
        const rawtextElements = page.getByTestId('rawtext')
        await expect(rawtextElements).toHaveCount(4)
        await expect(rawtextElements.nth(1)).toHaveText(
            '#&nbsp;Rawtext Component Hello Deep Variable'
        )
        await expect(rawtextElements.nth(3)).toHaveText(
            '#&nbsp;Another rawtext Hello Deep Variable'
        )
    })

    test('should handle deep variables with empty or null values', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')

        // Test with empty content
        await textarea.clear()
        await textarea.fill('#&nbsp;')

        // Verify the component handles empty content gracefully
        await expect(page.getByTestId('rawtext')).toHaveText('#&nbsp; Hello Deep Variable')
    })

    test('should maintain deep variable context across updates', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')

        // Test multiple updates to ensure deep variables persist
        await textarea.clear()
        await textarea.fill('#&nbsp;Update 1')
        await expect(page.getByTestId('rawtext')).toHaveText('#&nbsp;Update 1 Hello Deep Variable')

        await textarea.clear()
        await textarea.fill('#&nbsp;Update 2')
        await expect(page.getByTestId('rawtext')).toHaveText('#&nbsp;Update 2 Hello Deep Variable')

        await textarea.clear()
        await textarea.fill('#&nbsp;Final Update')
        await expect(page.getByTestId('rawtext')).toHaveText(
            '#&nbsp;Final Update Hello Deep Variable'
        )
    })
})
