import { expect, test } from '@playwright/test'

test.describe('Issue 192: Image inside link rendering', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/issue-192', { waitUntil: 'networkidle' })
    })

    test('image inside link renders correct src and alt on /test/issue-192', async ({ page }) => {
        // Find the link that wraps the image (by accessible name)
        const link = await page.getByRole('link', { name: 'image' })
        const linkHref = await link.getAttribute('href')
        expect(linkHref).toBe('https://stackblitz.com/edit')

        // Find the image inside the link
        const img = await link.locator('img[alt="image"]')
        expect(await img.count()).toBe(1)
        expect(await img.getAttribute('src')).toBe(
            'https://avatars.githubusercontent.com/u/162604590?s=64&u=548f358e716a223731ab372776a09723cf815f4d&v=4'
        )
        expect(await img.getAttribute('alt')).toBe('image')
    })
})
