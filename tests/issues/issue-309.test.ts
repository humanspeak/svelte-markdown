import { expect, test } from '@playwright/test'

test.describe('Issue 309: Dynamic custom extension reactivity', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/issues/issue-309', { waitUntil: 'domcontentloaded' })
        await page.locator('html[data-issue-309-hydrated="true"]').waitFor()
    })

    test('updates custom extension token data when the extension object is replaced', async ({
        page
    }) => {
        const activeFormat = page.getByTestId('active-display-format')
        const displayButton = page.getByTestId('display-button')

        await expect(activeFormat).toHaveText('decimal')
        await expect(displayButton).toHaveAttribute('data-display-format', 'decimal')
        await expect(displayButton).toHaveText('rendered format: decimal')

        await page.getByTestId('toggle-display-format').click()

        await expect(activeFormat).toHaveText('percent')
        await expect(displayButton).toHaveAttribute('data-display-format', 'percent')
        await expect(displayButton).toHaveText('rendered format: percent')
    })
})
