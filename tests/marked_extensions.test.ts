import { expect, test } from '@playwright/test'

test.describe('Alert Tokenizer Extension', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/marked_extensions')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test('should render basic alert with warning level', async ({ page }) => {
        const markdown = '> [!WARNING]\n> This is a warning message'
        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        await page.waitForSelector('.preview')
        const alert = page.locator('[data-markdown-test="data-markdown-test-alert"]')
        await expect(alert).toBeVisible()
        await expect(alert).toHaveAttribute('data-markdown-test-level', 'warning')
        await expect(alert).toHaveText('> This is a warning message')
    })

    test('should handle different alert levels', async ({ page }) => {
        const markdown = `> [!INFO]
> Information message

> [!NOTE]
> Note message

> [!CAUTION]
> Caution message`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        await page.waitForSelector('.preview')
        const alerts = page.locator('[data-markdown-test="data-markdown-test-alert"]')
        await expect(alerts).toHaveCount(3)

        const allAlerts = await alerts.all()
        await expect(allAlerts[0]).toHaveAttribute('data-markdown-test-level', 'info')
        await expect(allAlerts[0]).toHaveText('> Information message')
        await expect(allAlerts[1]).toHaveAttribute('data-markdown-test-level', 'note')
        await expect(allAlerts[1]).toHaveText('> Note message')
        await expect(allAlerts[2]).toHaveAttribute('data-markdown-test-level', 'caution')
        await expect(allAlerts[2]).toHaveText('> Caution message')
    })

    test('should handle multi-line alert content', async ({ page }) => {
        const markdown = `> [!WARNING]
> First line
> Second line
> Third line with **bold** text`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        await page.waitForSelector('.preview')
        const alert = page.locator('[data-markdown-test="data-markdown-test-alert"]')
        await expect(alert).toBeVisible()
        await expect(alert).toHaveAttribute('data-markdown-test-level', 'warning')
        await expect(alert).toHaveText(
            '> First line\n> Second line\n> Third line with **bold** text'
        )
    })

    test('should handle alert edge cases', async ({ page }) => {
        const markdown = `> [!INVALID]
> Invalid alert type

>[!WARNING]
>Malformed spacing

> [!WARNING] Extra content on first line
> Should still work

> [!]
> Missing level`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        await page.waitForSelector('.preview')
        const alerts = page.locator('[data-markdown-test="data-markdown-test-alert"]')

        // Only valid alerts should be rendered
        await expect(alerts).toHaveCount(2)

        // Check the well-formed warning alerts
        const allAlerts = await alerts.all()
        await expect(allAlerts[0]).toHaveAttribute('data-markdown-test-level', 'invalid')
        await expect(allAlerts[0]).toHaveText('> Invalid alert type')
        await expect(allAlerts[1]).toHaveAttribute('data-markdown-test-level', 'warning')
        await expect(allAlerts[1]).toHaveText('>Malformed spacing')
    })

    test('should handle alerts mixed with other markdown', async ({ page }) => {
        const markdown = `# Header

> [!WARNING]
> Warning message

Regular paragraph

> [!INFO]
> Info message

- List item`

        const textarea = page.getByTestId('markdown-input')
        await textarea.clear()
        await textarea.fill(markdown)

        await page.waitForSelector('.preview')

        // Check alerts
        const alerts = page.locator('[data-markdown-test="data-markdown-test-alert"]')
        await expect(alerts).toHaveCount(2)

        const allAlerts = await alerts.all()
        await expect(allAlerts[0]).toHaveAttribute('data-markdown-test-level', 'warning')
        await expect(allAlerts[1]).toHaveAttribute('data-markdown-test-level', 'info')

        // Check other markdown elements
        await expect(page.locator('h1')).toHaveText('Header')
        await expect(page.locator('p')).toHaveText('Regular paragraph')
        await expect(page.locator('li')).toHaveText('List item')
    })
})
