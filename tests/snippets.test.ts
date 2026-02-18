import { expect, test } from '@playwright/test'

test.describe('Snippet Overrides', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/snippets')
        await page.waitForSelector('[data-testid="markdown-input"]')
    })

    test.describe('Markdown snippet rendering', () => {
        test('paragraph snippet renders with custom class and data-testid', async ({ page }) => {
            const paragraphs = page.locator('[data-testid="snippet-paragraph"]')
            await expect(paragraphs.first()).toBeVisible()
            await expect(paragraphs.first()).toHaveClass(/custom-paragraph/)
        })

        test('heading snippet renders with correct depth attribute', async ({ page }) => {
            const h1 = page.locator('[data-testid="snippet-heading"][data-depth="1"]')
            await expect(h1).toBeVisible()
            await expect(h1.locator('h1')).toHaveText('Heading Level 1')
        })

        test('link snippet adds target="_blank"', async ({ page }) => {
            const link = page.locator('[data-testid="snippet-link"]')
            await expect(link).toBeVisible()
            await expect(link).toHaveAttribute('href', 'https://example.com')
            await expect(link).toHaveAttribute('target', '_blank')
        })

        test('code snippet renders with lang attribute (leaf node)', async ({ page }) => {
            const code = page.locator('[data-testid="snippet-code"]')
            await expect(code).toBeVisible()
            await expect(code).toHaveAttribute('data-lang', 'javascript')
            await expect(code.locator('code')).toContainText('const x = 42')
        })

        test('blockquote snippet renders with custom class', async ({ page }) => {
            const bq = page.locator('[data-testid="snippet-blockquote"]')
            await expect(bq).toBeVisible()
            await expect(bq).toHaveClass(/custom-quote/)
            // Nested bold should render inside
            await expect(bq.locator('strong')).toHaveText('nested bold')
        })

        test('list and listitem snippets render correctly', async ({ page }) => {
            const list = page.locator('[data-testid="snippet-list"]')
            await expect(list).toBeVisible()
            const items = page.locator('[data-testid="snippet-listitem"]')
            await expect(items).toHaveCount(3)
        })

        test('image snippet renders correctly (leaf node)', async ({ page }) => {
            const img = page.locator('[data-testid="snippet-image"]')
            await expect(img).toBeVisible()
            await expect(img).toHaveAttribute('alt', 'An image')
        })

        test('table renders correctly alongside snippet overrides', async ({ page }) => {
            // Tables use default renderers in this route (no table snippets)
            const table = page.locator('table')
            await expect(table).toBeVisible()
        })
    })

    test.describe('HTML snippet rendering', () => {
        test('html_div snippet renders with data-testid', async ({ page }) => {
            const div = page.locator('[data-testid="snippet-html-div"]')
            await expect(div).toBeVisible()
            await expect(div).toContainText('HTML div content')
        })

        test('html_a snippet renders with target="_blank"', async ({ page }) => {
            const a = page.locator('[data-testid="snippet-html-a"]')
            await expect(a).toBeVisible()
            await expect(a).toHaveAttribute('target', '_blank')
        })
    })

    test.describe('Children rendering', () => {
        test('paragraph snippet renders nested inline elements (bold, italic)', async ({
            page
        }) => {
            const p = page.locator('[data-testid="snippet-paragraph"]').first()
            await expect(p.locator('strong')).toHaveText('bold')
            await expect(p.locator('em')).toHaveText('italic')
        })

        test('blockquote children render through snippet', async ({ page }) => {
            const bq = page.locator('[data-testid="snippet-blockquote"]')
            // Children should include a paragraph (also snippet-overridden)
            await expect(bq.locator('[data-testid="snippet-paragraph"]')).toBeVisible()
        })
    })

    test.describe('Reactivity', () => {
        test('snippet overrides apply to dynamically updated content', async ({ page }) => {
            const textarea = page.getByTestId('markdown-input')
            await textarea.clear()
            await textarea.fill('# New heading\n\nNew paragraph')

            await expect(page.locator('[data-testid="snippet-heading"]')).toBeVisible()
            await expect(page.locator('[data-testid="snippet-paragraph"]')).toContainText(
                'New paragraph'
            )
        })

        test('switching between content types maintains snippet overrides', async ({ page }) => {
            const textarea = page.getByTestId('markdown-input')

            // Switch to list content
            await textarea.clear()
            await textarea.fill('- Alpha\n- Beta')
            await expect(page.locator('[data-testid="snippet-listitem"]')).toHaveCount(2)

            // Switch to heading content
            await textarea.clear()
            await textarea.fill('## Subtitle')
            await expect(
                page.locator('[data-testid="snippet-heading"][data-depth="2"]')
            ).toBeVisible()
            await expect(page.locator('[data-testid="snippet-listitem"]')).toHaveCount(0)
        })
    })

    test.describe('Default fallback', () => {
        test('non-overridden renderers use defaults (em, strong, del)', async ({ page }) => {
            // em/strong are NOT snippet-overridden in the test route
            // They should render with default renderers
            await expect(page.locator('strong').first()).toBeVisible()
            await expect(page.locator('em').first()).toBeVisible()
        })
    })
})
