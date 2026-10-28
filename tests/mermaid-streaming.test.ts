import { expect, test } from '@playwright/test'

test.describe('Mermaid diagrams while streaming (renderOpenFences)', () => {
    test.beforeEach(async ({ page }) => {
        // Wait for hydration: the Stream click is a no-op until the handler is attached.
        await page.goto('/test/mermaid-streaming', { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="mermaid-streaming-page"]')
    })

    test('draws the diagram before the fence closes', async ({ page }) => {
        await page.getByTestId('stream-start').click()

        // Poll until a diagram exists, and record whether the stream had already finished.
        const outcome = await page.waitForFunction(
            () => {
                const hasDiagram = document.querySelector('[data-testid="mermaid-diagram"] svg')
                const isDone = document.querySelector('[data-testid="stream-done"]')
                if (hasDiagram) return isDone ? 'diagram-after-done' : 'diagram-before-done'
                if (isDone) return 'done-without-diagram'
                return null
            },
            undefined,
            { timeout: 15000 }
        )

        expect(await outcome.jsonValue()).toBe('diagram-before-done')
        await expect(page.getByTestId('stream-done')).toBeVisible({ timeout: 15000 })
    })

    test('never shows the error box while the diagram streams', async ({ page }) => {
        await page.evaluate(() => {
            const observer = new MutationObserver(() => {
                if (document.querySelector('[data-testid="mermaid-error"]')) {
                    ;(window as Window & { __sawMermaidError?: boolean }).__sawMermaidError = true
                }
            })
            observer.observe(document.body, { childList: true, subtree: true })
        })

        await page.getByTestId('stream-start').click()
        await expect(page.getByTestId('stream-done')).toBeVisible({ timeout: 15000 })

        const sawError = await page.evaluate(
            () => (window as Window & { __sawMermaidError?: boolean }).__sawMermaidError
        )
        expect(sawError).toBeUndefined()
    })

    test('leaves exactly one diagram once the stream is done', async ({ page }) => {
        await page.getByTestId('stream-start').click()
        await expect(page.getByTestId('stream-done')).toBeVisible({ timeout: 15000 })

        await expect(page.locator('[data-testid="mermaid-diagram"] svg')).toHaveCount(1)
    })
})
