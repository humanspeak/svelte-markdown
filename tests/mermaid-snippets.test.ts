import { expect, test } from '@playwright/test'

test.describe('Mermaid Snippet Overrides', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/mermaid-snippets')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('should render diagrams via snippet override', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // Diagrams should render inside the snippet wrapper
        const wrapper = preview.locator('[data-testid="snippet-wrapper"]')
        await expect(wrapper.first()).toBeVisible({ timeout: 15000 })

        const diagram = wrapper.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagram.first()).toBeVisible({ timeout: 15000 })
    })

    test('should wrap each diagram in the snippet wrapper div', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // Default content has 2 diagrams — each should be in its own snippet wrapper
        const wrappers = preview.locator('[data-testid="snippet-wrapper"]')
        const diagrams = preview.locator('[data-testid="mermaid-diagram"] svg')

        await expect(diagrams.first()).toBeVisible({ timeout: 15000 })
        await expect(wrappers).toHaveCount(2)
        await expect(diagrams).toHaveCount(2)
    })

    test('should render markdown content alongside snippet diagrams', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // Check markdown renders
        await expect(preview.locator('h1')).toHaveText('Mermaid Snippets')
        await expect(preview.locator('h2')).toHaveText('Sequence Diagram')

        // Check diagrams render via snippets
        const diagram = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagram.first()).toBeVisible({ timeout: 15000 })
    })

    test('should reactively update snippet diagrams when input changes', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        const preview = page.getByTestId('preview')

        // Wait for initial diagrams
        const wrappers = preview.locator('[data-testid="snippet-wrapper"]')
        const diagrams = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagrams.first()).toBeVisible({ timeout: 15000 })
        await expect(wrappers).toHaveCount(2)

        // Change to a single diagram
        await textarea.clear()
        await textarea.fill('```mermaid\ngraph LR\n    A --> B\n```')

        await expect(wrappers).toHaveCount(1, { timeout: 15000 })
        await expect(diagrams.first()).toBeVisible({ timeout: 15000 })
    })

    test('should handle invalid syntax in snippet mode gracefully', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill('```mermaid\ninvalid @@@ syntax\n```')

        const preview = page.getByTestId('preview')

        // The snippet wrapper should still be present
        const wrapper = preview.locator('[data-testid="snippet-wrapper"]')
        await expect(wrapper).toBeVisible({ timeout: 15000 })

        // Should show error or diagram inside the wrapper (not crash)
        const errorOrDiagram = wrapper.locator(
            '[data-testid="mermaid-error"], [data-testid="mermaid-diagram"]'
        )
        await expect(errorOrDiagram.first()).toBeVisible({ timeout: 15000 })
    })

    test('should show no snippet wrappers for plain markdown', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill('# No diagrams\n\nJust text.')

        const preview = page.getByTestId('preview')
        await expect(preview.locator('h1')).toHaveText('No diagrams')
        await expect(preview.locator('[data-testid="snippet-wrapper"]')).toHaveCount(0)
    })
})
