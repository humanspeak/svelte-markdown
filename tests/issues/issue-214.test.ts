import { expect, test } from '@playwright/test'

test.describe('Issue 214: Restrict to strong, em, link, code only', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/issues/issue-214', { waitUntil: 'networkidle' })
    })

    test('renders allowed markdown and HTML, blocks others', async ({ page }) => {
        const main = page.locator('main')
        await expect(main).toBeVisible()

        // Allowed markdown/HTML should render as real elements
        await expect(page.locator('strong').first()).toBeVisible()
        await expect(page.locator('em').first()).toBeVisible()
        await expect(page.locator('a').first()).toBeVisible()
        await expect(page.locator('code').first()).toBeVisible()

        // Blocked HTML (e.g., span in the unsupported section) should not render as real elements
        // but appear as escaped text
        const unsupportedSection = page.locator('h2', { hasText: 'Unsupported markdown types:' })
        await expect(unsupportedSection).toBeVisible()
        const unsupportedMain = page.locator('main')
        await expect(unsupportedMain.getByText('<span>asdf</span>', { exact: true })).toBeVisible()
        await expect(page.locator('span').filter({ hasText: 'asdf' })).toHaveCount(0)

        // Strong HTML with attributes should appear escaped as text, not as a real <strong>
        await expect(unsupportedMain).toContainText(
            '<strong class="test-class" id="test-id">any html</strong>'
        )
        await expect(page.locator('strong#test-id')).toHaveCount(0)
        await expect(page.locator('strong.test-class')).toHaveCount(0)

        // Headers should be disabled; no h1 from the unsupported blockquote/headers
        await expect(page.locator('h1')).toHaveCount(0)
        // Blockquote disabled
        await expect(page.locator('blockquote')).toHaveCount(0)
        // Images disabled
        await expect(page.locator('img')).toHaveCount(0)
        // Lists disabled
        await expect(page.locator('ul')).toHaveCount(0)
        await expect(page.locator('ol')).toHaveCount(0)
    })
})
