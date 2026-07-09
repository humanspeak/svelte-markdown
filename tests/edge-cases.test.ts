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

    test('should handle special characters and Unicode', async ({ page }) => {
        await page.goto('/test/edge-cases')
        const textarea = page.getByTestId('markdown-input')

        const specialContent = `
# 你好，世界！
## مرحبا بالعالم
### Привет, мир!
#### ¡Hòla, món!
##### Zero-width space: [\u200b]
###### Emojis: 🌈 🚀 🎨
`
        await textarea.fill(specialContent)

        // Verify all content is rendered correctly
        await expect(page.getByText('你好，世界！')).toBeVisible()
        await expect(page.getByText('مرحبا بالعالم')).toBeVisible()
        await expect(page.getByText('Привет, мир!')).toBeVisible()
    })
})
