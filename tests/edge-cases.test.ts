import { expect, test } from '@playwright/test'

test.describe('Edge Cases', () => {
    test('should handle empty and null inputs gracefully', async ({ page }) => {
        await page.goto('/test/edge-cases')
        const textarea = page.getByTestId('markdown-input')

        // Test empty string
        await textarea.fill('')
        await expect(page.getByTestId('markdown-output')).toBeEmpty()

        // Test whitespace only
        await textarea.fill('   \n   \t   ')
        await expect(page.getByTestId('markdown-output')).toBeEmpty()
    })

    test('should handle deeply nested lists', async ({ page }) => {
        await page.goto('/test/edge-cases')
        const textarea = page.getByTestId('markdown-input')

        // Create deeply nested list with bullet points
        const deepList = Array(15)
            .fill(0)
            .map((_, i) => `${'*'.repeat(i + 1)} Level ${i}`)
            .join('\n')

        await textarea.fill(deepList)
        await page.waitForTimeout(100) // Small delay for rendering

        // Verify all levels are rendered with increased timeout
        for (let i = 0; i < 15; i++) {
            await expect(page.getByText(`Level ${i}`)).toBeVisible({
                timeout: 10000
            })
        }
    })

    test('should handle special characters and Unicode', async ({ page }) => {
        await page.goto('/test/edge-cases')
        const textarea = page.getByTestId('markdown-input')

        const specialContent = `
# 你好，世界！
## مرحبا بالعالم
### Привет, мир!
#### ¡Hòla, món!
##### Zero-width space: [​]
###### Emojis: 🌈 🚀 🎨
`
        await textarea.fill(specialContent)

        // Verify all content is rendered correctly
        await expect(page.getByText('你好，世界！')).toBeVisible()
        await expect(page.getByText('مرحبا بالعالم')).toBeVisible()
        await expect(page.getByText('Привет, мир!')).toBeVisible()
    })
})
