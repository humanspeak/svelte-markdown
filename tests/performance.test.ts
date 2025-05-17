import { expect, test } from '@playwright/test'

test.describe('Performance Tests', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/performance', { waitUntil: 'networkidle' })
    })

    test('should handle large documents efficiently', async ({ page, browserName }) => {
        // Measure initial render time
        const startTime = Date.now()
        await page.getByTestId('large-markdown').isVisible()
        const initialRenderTime = Date.now() - startTime

        expect(initialRenderTime).toBeLessThan(1000) // Should render in under 1 second
    })

    test('should handle rapid content updates', async ({ page, browserName }) => {
        const textarea = page.getByTestId('markdown-input')

        // Measure update performance
        const updates = []
        for (let i = 0; i < 50; i++) {
            const start = Date.now()
            await textarea.fill(`# Heading ${i}\n\nContent ${i}`)
            await page.getByText(`Heading ${i}`).isVisible()
            updates.push(Date.now() - start)
        }

        // Average update should be under 100ms (except Firefox, which is slower in CI)
        const avgUpdateTime = updates.reduce((a, b) => a + b) / updates.length
        if (browserName === 'firefox') {
            // Firefox is slower in CI, so we use a higher threshold
            expect(avgUpdateTime).toBeLessThan(250)
        } else {
            expect(avgUpdateTime).toBeLessThan(100)
        }
    })
})
