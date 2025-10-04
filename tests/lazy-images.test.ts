import { expect, test } from '@playwright/test'

test.describe('Lazy Image Loading', () => {
    test('should lazy load images with fade-in effect (positive test)', async ({ page }) => {
        await page.goto('/test/lazy-images')

        // Wait for markdown to render
        await expect(page.getByTestId('markdown-output')).toBeVisible()

        // Find the first image
        const img = page.locator('img[alt="Test Image"]').first()
        await expect(img).toBeVisible()

        // Should have lazy loading attribute
        await expect(img).toHaveAttribute('loading', 'lazy')

        // Should have data-src attribute
        await expect(img).toHaveAttribute('data-src', '/test-image-150.png')

        // Should have alt text
        await expect(img).toHaveAttribute('alt', 'Test Image')

        // Should have title
        await expect(img).toHaveAttribute('title', 'Test image title')

        // Wait for image to load and fade in
        await page.waitForTimeout(500) // Allow time for load event and fade-in

        // Should have fade-in class after loading
        const hasFadeIn = await img.evaluate((el) => el.classList.contains('fade-in'))
        expect(hasFadeIn).toBe(true)

        // Should be fully opaque after fade-in
        const opacity = await img.evaluate((el) => window.getComputedStyle(el).opacity)
        expect(opacity).toBe('1')
    })

    test('should handle broken images gracefully (negative test)', async ({ page }) => {
        await page.goto('/test/lazy-images')

        // Wait for markdown to render
        await expect(page.getByTestId('markdown-output')).toBeVisible()

        // Find the broken image
        const brokenImg = page.locator('img[alt="Broken"]')
        await expect(brokenImg).toBeVisible()

        // Should have alt text (accessibility fallback)
        await expect(brokenImg).toHaveAttribute('alt', 'Broken')

        // Wait for error state to apply
        await page.waitForTimeout(500)

        // Should have error class
        const hasError = await brokenImg.evaluate((el) => el.classList.contains('error'))
        expect(hasError).toBe(true)

        // Error images should be semi-transparent and grayscale
        const opacity = await brokenImg.evaluate((el) => window.getComputedStyle(el).opacity)
        const filter = await brokenImg.evaluate((el) => window.getComputedStyle(el).filter)

        expect(opacity).toBe('0.5')
        expect(filter).toContain('grayscale')
    })

    test('should load multiple images efficiently', async ({ page }) => {
        await page.goto('/test/lazy-images')

        // Wait for markdown to render
        await expect(page.getByTestId('markdown-output')).toBeVisible()

        // Should render multiple images
        const images = page.locator('img[data-src]')
        const count = await images.count()
        expect(count).toBeGreaterThanOrEqual(4) // At least 4 images

        // All should have lazy loading
        for (let i = 0; i < count; i++) {
            const img = images.nth(i)
            await expect(img).toHaveAttribute('loading', 'lazy')
        }
    })

    test('should have responsive max-width styling', async ({ page }) => {
        await page.goto('/test/lazy-images')

        const img = page.locator('img[alt="Test Image"]').first()
        await expect(img).toBeVisible()

        // Should have max-width: 100% for responsiveness
        const maxWidth = await img.evaluate((el) => window.getComputedStyle(el).maxWidth)
        expect(maxWidth).toBe('100%')

        // Height should be intrinsic (from the image) or auto
        const heightStyle = await img.evaluate(
            (el) => el.style.height || window.getComputedStyle(el).height
        )
        // Just verify it has a height value (could be auto or px value from image)
        expect(heightStyle).toBeTruthy()
    })
})
