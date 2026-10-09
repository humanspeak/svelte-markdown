import { expect, test } from '@playwright/test'

const ROUTE = '/test/preprocess/async-tokens'
const TEXT = 'Prepared async context'

test.describe('Preparsed token arrays with async extensions', () => {
    test('prerendered HTML contains the rendered paragraph', async ({ request }) => {
        const response = await request.get(ROUTE)
        expect(response.ok()).toBe(true)

        const body = await response.text()
        // Match rendered markup, not the token JSON embedded for hydration.
        expect(body).toMatch(
            /<div data-testid="async-tokens-document">[\s\S]*?<p>(?:<!--[^>]*-->)*Prepared async context(?:<!--[^>]*-->)*<\/p>/
        )
    })

    test('paragraph is visible without JavaScript', async ({ browser }) => {
        const context = await browser.newContext({ javaScriptEnabled: false })
        const page = await context.newPage()
        await page.goto(ROUTE)

        const paragraph = page.getByTestId('async-tokens-document').locator('p')
        await expect(paragraph).toHaveText(TEXT)
        await expect(paragraph).toBeVisible()
        await context.close()
    })

    test('hydrated page keeps the same paragraph', async ({ page }) => {
        await page.goto(ROUTE, { waitUntil: 'networkidle' })

        const paragraph = page.getByTestId('async-tokens-document').locator('p')
        await expect(paragraph).toHaveCount(1)
        await expect(paragraph).toHaveText(TEXT)
    })
})
