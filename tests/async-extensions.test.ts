import { expect, test } from '@playwright/test'

test.describe('Async walkTokens Extensions', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/async-extensions')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('should render code blocks after async walkTokens completes', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // The async extension uppercases code block text after a delay.
        // Wait for the transformed content to appear.
        const codeBlocks = preview.locator('pre code')
        await expect(codeBlocks.first()).toBeVisible({ timeout: 10000 })
        await expect(codeBlocks).toHaveCount(2, { timeout: 10000 })

        // Verify async walkTokens applied the uppercase transformation
        await expect(codeBlocks.nth(0)).toHaveText('HELLO WORLD')
        await expect(codeBlocks.nth(1)).toHaveText('FOO BAR')
    })

    test('should render non-code markdown alongside async code blocks', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // Heading and bold text should render (they aren't affected by the async extension)
        await expect(preview.locator('h1')).toHaveText('Async Extension Test', { timeout: 10000 })
        await expect(preview.locator('strong')).toHaveText('bold')
    })

    test('should handle new input with async extensions', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        const preview = page.getByTestId('preview')

        await textarea.clear()
        await textarea.fill('```js\nnew code\n```')

        // Wait for async transformation to complete
        const codeBlock = preview.locator('pre code')
        await expect(codeBlock).toHaveText('NEW CODE', { timeout: 10000 })
    })

    test('should handle markdown with no code blocks (async extension is a no-op)', async ({
        page
    }) => {
        const textarea = page.getByTestId('markdown-input')
        const preview = page.getByTestId('preview')

        await textarea.clear()
        await textarea.fill('# Just a heading\n\nA paragraph.')

        await expect(preview.locator('h1')).toHaveText('Just a heading', { timeout: 10000 })
        await expect(preview.locator('p')).toHaveText('A paragraph.')
    })
})
