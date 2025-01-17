import { expect, test } from '@playwright/test'

test.describe('Accessibility Tests', () => {
    test.beforeAll(async () => {
        // Add a delay to ensure server is ready
        await new Promise((resolve) => setTimeout(resolve, 1000))
    })
    test('should maintain proper heading hierarchy', async ({ page }) => {
        try {
            await page.goto('/test/accessibility', {
                timeout: 60000, // Increase timeout to 60 seconds
                waitUntil: 'networkidle' // Wait until network is idle
            })
        } catch (error) {
            console.error('Failed to load page:', error)
            throw error
        }

        // Check heading structure
        const headings = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
                level: parseInt(h.tagName[1]),
                text: h.textContent
            }))
        })

        // Verify no skipped heading levels
        for (let i = 1; i < headings.length; i++) {
            const diff = headings[i].level - headings[i - 1].level
            expect(diff).toBeLessThanOrEqual(1)
        }
    })

    test('should have proper ARIA attributes', async ({ page }) => {
        await page.goto('/test/accessibility')

        // Check links
        const links = await page.getByRole('link').all()
        for (const link of links) {
            expect(
                (await link.getAttribute('aria-label')) || (await link.textContent())
            ).toBeTruthy()
        }

        // Check images
        const images = await page.getByRole('img').all()
        for (const img of images) {
            expect(await img.getAttribute('alt')).toBeTruthy()
        }
    })
})
