import { expect, test } from '@playwright/test'

test.describe('Performance Tests', () => {
    test('should handle large documents efficiently', async ({ page, browserName }) => {
        await page.goto('/test/performance')

        // Measure initial render time
        const startTime = Date.now()
        await page.getByTestId('large-markdown').isVisible()
        const initialRenderTime = Date.now() - startTime

        expect(initialRenderTime).toBeLessThan(1000) // Should render in under 1 second
    })

    test('should handle rapid content updates', async ({ page }) => {
        await page.goto('/test/performance')
        const textarea = page.getByTestId('markdown-input')

        // Measure update performance
        const updates = []
        for (let i = 0; i < 10; i++) {
            const start = Date.now()
            await textarea.fill(`# Heading ${i}\n\nContent ${i}`)
            await page.getByText(`Heading ${i}`).isVisible()
            updates.push(Date.now() - start)
        }

        // Average update should be under 100ms
        const avgUpdateTime = updates.reduce((a, b) => a + b) / updates.length
        expect(avgUpdateTime).toBeLessThan(100)
    })
})
