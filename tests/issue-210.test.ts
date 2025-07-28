import { expect, test } from '@playwright/test'

test.describe('Issue 210: BR / SUP rendering in table cells with mixed content', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/issue-210', { waitUntil: 'networkidle' })
    })

    test('should render BR tags properly in table cells with mixed code spans', async ({
        page
    }) => {
        // Wait for the table to render
        const table = page.locator('table')
        await expect(table).toBeVisible()

        // Find the table cell with mixed content: `key=10`<br>`key>=2024-01-01`
        const mixedContentCell = page.locator('td').filter({ hasText: 'key=10' }).first()
        await expect(mixedContentCell).toBeVisible()

        // Check that both code spans are present
        const codeSpans = mixedContentCell.locator('code')
        await expect(codeSpans).toHaveCount(2)

        // Verify the content of each code span
        await expect(codeSpans.nth(0)).toHaveText('key=10')
        await expect(codeSpans.nth(1)).toHaveText('key>=2024-01-01')

        // Check that a BR tag is present and creates a line break
        const brTag = mixedContentCell.locator('br')
        await expect(brTag).toHaveCount(1)

        // Verify the BR tag is self-closing by checking it has no content
        const brTagHtml = await brTag.innerHTML()
        expect(brTagHtml).toBe('')
    })

    test('should render BR tags properly in range query cell', async ({ page }) => {
        // Find the table cell with range query content: `key:10..20`<br>`key:2024-01-01 00:00..2024-01-15 12:00`
        const rangeCell = page.locator('td').filter({ hasText: 'key:10..20' }).first()
        await expect(rangeCell).toBeVisible()

        // Check that both code spans are present
        const codeSpans = rangeCell.locator('code')
        await expect(codeSpans).toHaveCount(2)

        // Verify the content of each code span
        await expect(codeSpans.nth(0)).toHaveText('key:10..20')
        await expect(codeSpans.nth(1)).toHaveText('key:2024-01-01 00:00..2024-01-15 12:00')

        // Check that a BR tag is present
        const brTag = rangeCell.locator('br')
        await expect(brTag).toHaveCount(1)
    })

    test('should render BR tags properly in logical operators cell', async ({ page }) => {
        // Find the table cell with logical operators: `AND`, `&`<br>`OR`, `|`
        // This cell contains both AND and OR text
        const logicalCell = page
            .locator('td')
            .filter({ hasText: /AND.*OR/ })
            .first()
        await expect(logicalCell).toBeVisible()

        // Check that all code spans are present (4 total: AND, &, OR, |)
        const codeSpans = logicalCell.locator('code')
        await expect(codeSpans).toHaveCount(4)

        // Verify the content of each code span
        await expect(codeSpans.nth(0)).toHaveText('AND')
        await expect(codeSpans.nth(1)).toHaveText('&')
        await expect(codeSpans.nth(2)).toHaveText('OR')
        await expect(codeSpans.nth(3)).toHaveText('|')

        // Check that a BR tag is present
        const brTag = logicalCell.locator('br')
        await expect(brTag).toHaveCount(1)
    })

    test('should render SUP tags properly for footnote references', async ({ page }) => {
        // Find the table cell with numeric operators that contains a footnote reference
        const numericCell = page.locator('td').filter({ hasText: 'keyword_numeric' }).first()
        await expect(numericCell).toBeVisible()

        // Check that a SUP tag is present for the footnote
        const supTag = numericCell.locator('sup')
        await expect(supTag).toHaveCount(1)

        // Verify the content of the SUP tag (should be "1")
        await expect(supTag).toHaveText('1')

        // Find the range query cell that also contains a footnote reference
        const rangeCell = page.locator('td').filter({ hasText: 'keyword_date' }).first()
        await expect(rangeCell).toBeVisible()

        // Check that this cell also has a SUP tag
        const rangeCellSup = rangeCell.locator('sup')
        await expect(rangeCellSup).toHaveCount(1)
        await expect(rangeCellSup).toHaveText('1')

        // Verify both footnote references appear in the context of "See below"
        const numericCellText = await numericCell.textContent()
        expect(numericCellText).toContain('See below')

        const rangeCellText = await rangeCell.textContent()
        expect(rangeCellText).toContain('See below')
    })

    test('should render table structure correctly', async ({ page }) => {
        const table = page.locator('table')
        await expect(table).toBeVisible()

        // Check that we have the correct number of header columns
        const headers = table.locator('thead th')
        await expect(headers).toHaveCount(2)
        await expect(headers.nth(0)).toHaveText('Syntax')
        await expect(headers.nth(1)).toHaveText('Description')

        // Check that we have the expected number of rows (should be 11 data rows)
        const rows = table.locator('tbody tr')
        await expect(rows).toHaveCount(11)
    })
})
