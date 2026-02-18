import { expect, test } from '@playwright/test'

test.describe('Custom HTML Tags', () => {
    test('renders custom tag via component renderer', async ({ page }) => {
        await page.goto('/test/custom-tags')
        await page.waitForSelector('[data-testid="custom-tags-test"]')

        const btn = page.locator(
            '[data-testid="component-section"] [data-testid="custom-tag-component"]'
        )
        await expect(btn).toBeVisible()
        await expect(btn).toHaveText('Component Click')
    })

    test('renders custom tag via snippet override', async ({ page }) => {
        await page.goto('/test/custom-tags')
        await page.waitForSelector('[data-testid="custom-tags-test"]')

        const btn = page.locator(
            '[data-testid="snippet-section"] [data-testid="custom-tag-snippet"]'
        )
        await expect(btn).toBeVisible()
        await expect(btn).toHaveText('Snippet Click')
    })

    test('forwards attributes on snippet custom tag', async ({ page }) => {
        await page.goto('/test/custom-tags')
        await page.waitForSelector('[data-testid="custom-tags-test"]')

        const btn = page.locator(
            '[data-testid="snippet-section"] [data-testid="custom-tag-snippet"]'
        )
        await expect(btn).toHaveAttribute('data-action', 'submit')
    })

    test('snippet wins over component renderer for custom tags', async ({ page }) => {
        await page.goto('/test/custom-tags')
        await page.waitForSelector('[data-testid="custom-tags-test"]')

        const snippetBtn = page.locator(
            '[data-testid="precedence-section"] [data-testid="custom-tag-snippet"]'
        )
        await expect(snippetBtn).toBeVisible()
        await expect(snippetBtn).toHaveText('Precedence Click')

        // Component renderer marker should NOT be present in precedence section
        await expect(
            page.locator('[data-testid="precedence-section"] [data-testid="custom-tag-component"]')
        ).toHaveCount(0)
    })

    test('standard HTML tags still use default renderers', async ({ page }) => {
        await page.goto('/test/custom-tags')
        await page.waitForSelector('[data-testid="custom-tags-test"]')

        const div = page.locator('[data-testid="standard-section"] div.normal')
        await expect(div).toBeVisible()
        await expect(div).toHaveText('Standard div')
    })
})
