import { expect, test } from '@playwright/test'

test.describe('Snippet Precedence', () => {
    test('snippet override takes precedence over component renderer', async ({ page }) => {
        await page.goto('/test/snippets-precedence')
        await page.waitForSelector('[data-testid="precedence-test"]')

        // Snippet should win
        await expect(page.locator('[data-testid="snippet-wins"]')).toBeVisible()
        await expect(page.locator('[data-testid="snippet-wins"]')).toHaveText(
            'Test paragraph for precedence'
        )

        // Component renderer marker should NOT be present
        await expect(page.locator('[data-testid="component-wins"]')).toHaveCount(0)
    })
})
