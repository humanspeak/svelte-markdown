import { expect, test } from '@playwright/test'

test.describe('Mermaid Diagram Extension', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/mermaid')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('should render mermaid diagrams as SVG elements', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // Wait for at least one diagram to finish rendering
        const diagram = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagram.first()).toBeVisible({ timeout: 15000 })
    })

    test('should render multiple diagram types', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // Wait for diagrams to render (default content has flowchart + sequence)
        const diagrams = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagrams.first()).toBeVisible({ timeout: 15000 })
        await expect(diagrams).toHaveCount(2, { timeout: 15000 })
    })

    test('should render mixed markdown and mermaid content', async ({ page }) => {
        const preview = page.getByTestId('preview')

        // Check markdown elements render alongside diagrams
        await expect(preview.locator('h1')).toHaveText('Mermaid Diagrams')
        await expect(preview.locator('strong')).toHaveText('bold')
        await expect(preview.locator('em')).toHaveText('italic')
        await expect(preview.locator('li')).toHaveCount(2)

        // Check diagrams also render
        const diagrams = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagrams.first()).toBeVisible({ timeout: 15000 })
    })

    test('should show loading state before diagrams render', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill('```mermaid\ngraph TD\n    A --> B\n```')

        const preview = page.getByTestId('preview')

        // Either loading or rendered diagram should be present
        const loadingOrDiagram = preview.locator(
            '[data-testid="mermaid-loading"], [data-testid="mermaid-diagram"] svg'
        )
        await expect(loadingOrDiagram.first()).toBeVisible({ timeout: 15000 })

        // Eventually the diagram should render as SVG
        const diagram = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagram).toBeVisible({ timeout: 15000 })
    })

    test('should handle invalid mermaid syntax gracefully', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill('```mermaid\ninvalid syntax here @@@ !!!\n```')

        const preview = page.getByTestId('preview')

        // Should show either an error or a diagram (mermaid may partially render)
        const errorOrDiagram = preview.locator(
            '[data-testid="mermaid-error"], [data-testid="mermaid-diagram"]'
        )
        await expect(errorOrDiagram.first()).toBeVisible({ timeout: 15000 })
    })

    test('should render a single flowchart diagram', async ({ page }) => {
        const markdown = '```mermaid\ngraph LR\n    A --> B --> C\n```'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        const preview = page.getByTestId('preview')
        const diagram = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagram).toBeVisible({ timeout: 15000 })
        await expect(diagram).toHaveCount(1)
    })

    test('should reactively update when input changes', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        const preview = page.getByTestId('preview')

        // Start with a simple flowchart
        await textarea.clear()
        await textarea.fill('```mermaid\ngraph LR\n    A --> B\n```')

        const diagram = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagram).toBeVisible({ timeout: 15000 })
        await expect(diagram).toHaveCount(1)

        // Change to a different diagram
        await textarea.clear()
        await textarea.fill(
            '```mermaid\ngraph TD\n    X --> Y\n```\n\n```mermaid\ngraph LR\n    P --> Q\n```'
        )

        // Should now have two diagrams
        await expect(diagram).toHaveCount(2, { timeout: 15000 })
    })

    test('should handle transition from diagrams to plain markdown', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        const preview = page.getByTestId('preview')

        // Start with a diagram
        await textarea.clear()
        await textarea.fill('```mermaid\ngraph LR\n    A --> B\n```')
        const diagram = preview.locator('[data-testid="mermaid-diagram"] svg')
        await expect(diagram).toBeVisible({ timeout: 15000 })

        // Replace with plain markdown — no diagrams
        await textarea.clear()
        await textarea.fill('# Just a heading\n\nNo diagrams here.')

        await expect(preview.locator('h1')).toHaveText('Just a heading')
        await expect(diagram).toHaveCount(0)
    })

    test('should handle empty mermaid block', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill('```mermaid\n```')

        const preview = page.getByTestId('preview')

        // Empty block — should show error or be absent (not crash)
        const errorOrDiagram = preview.locator(
            '[data-testid="mermaid-error"], [data-testid="mermaid-diagram"]'
        )
        await expect(errorOrDiagram.first()).toBeVisible({ timeout: 15000 })
    })

    test('should not render non-mermaid fenced code blocks as diagrams', async ({ page }) => {
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill('```javascript\nconsole.log("hello")\n```')

        const preview = page.getByTestId('preview')

        // Should render as a code block, not a mermaid diagram
        await expect(preview.locator('code')).toBeVisible()
        await expect(preview.locator('[data-testid="mermaid-diagram"]')).toHaveCount(0)
        await expect(preview.locator('[data-testid="mermaid-loading"]')).toHaveCount(0)
    })
})
