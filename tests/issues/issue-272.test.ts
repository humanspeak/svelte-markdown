import { expect, test } from '@playwright/test'

test.describe('Issue 272: Markdown-native XSS vectors bypass input-level HTML sanitization', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/issues/issue-272', { waitUntil: 'networkidle' })
    })

    test('should not render javascript: protocol links', async ({ page }) => {
        const preview = page.locator('[data-testid="preview"]')
        await expect(preview).toBeVisible()

        const links = preview.locator('a')
        const count = await links.count()

        for (let i = 0; i < count; i++) {
            const href = await links.nth(i).getAttribute('href')
            expect(href).not.toMatch(/^javascript:/i)
        }
    })

    test('should render safe https links normally', async ({ page }) => {
        const preview = page.locator('[data-testid="preview"]')
        const safeLink = preview.locator('a').filter({ hasText: 'Safe link' })
        await expect(safeLink).toHaveAttribute('href', 'https://example.com')
    })
})
