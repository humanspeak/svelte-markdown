import { expect, test, type Page } from '@playwright/test'

const ROUTE = '/test/preprocess/hybrid'
const GREETING = 'Hello from SvelteKit load'
const CODE_SAMPLE = '<Counter start={6} />'

/**
 * Assertions shared by the server-rendered and hydrated pages: page data,
 * the compiled counter's initial state, layout-provided custom renderers,
 * Markdown interpolation, and literal code.
 */
const expectInitialDocument = async (page: Page) => {
    await expect(page.getByTestId('load-greeting')).toHaveText(GREETING)

    const counter = page.getByTestId('typed-counter')
    await expect(counter).toHaveText('Count: 6 / typed object')
    await expect(counter).toHaveAttribute('data-start-type', 'number')
    await expect(counter).toHaveAttribute('data-details-type', 'object')
    await expect(page.getByTestId('parent-changes')).toHaveText('Parent updates: 0')
    await expect(page.getByTestId('conditional')).toHaveCount(0)

    const customHeadings = page.getByTestId('custom-heading')
    await expect(customHeadings).toHaveCount(2)
    await expect(customHeadings.nth(0)).toHaveAttribute('data-depth', '1')
    await expect(customHeadings.nth(0)).toHaveText('Build-time markdown, runtime renderers')
    await expect(customHeadings.nth(1)).toHaveAttribute('data-depth', '2')
    await expect(customHeadings.nth(1)).toHaveText('Markdown after the compiled island')

    await expectCustomLinks(page)
    await expectInlineDataAndCode(page)
}

const expectCustomLinks = async (page: Page) => {
    const customLinks = page.getByTestId('custom-link')
    await expect(customLinks).toHaveCount(2)
    for (const link of await customLinks.all()) {
        await expect(link).toHaveText('reference link')
        await expect(link).toHaveAttribute('href', 'https://example.com/proof')
    }
}

const expectInlineDataAndCode = async (page: Page) => {
    const inline = page.locator('p', { hasText: 'Inline page data:' })
    await expect(inline).toHaveCount(1)
    await expect(inline).toHaveText(`Inline page data: ${GREETING}.`)
    await expect(inline.locator('strong')).toHaveText(GREETING)

    const code = page.locator('pre code')
    await expect(code).toHaveCount(1)
    await expect(code).toHaveText(CODE_SAMPLE)
    await expect(page.locator('pre').getByTestId('typed-counter')).toHaveCount(0)
}

test.describe('Hybrid preprocessor production page', () => {
    test('server-rendered HTML is complete without JavaScript', async ({ browser }) => {
        const context = await browser.newContext({ javaScriptEnabled: false })
        try {
            const page = await context.newPage()
            const response = await page.goto(ROUTE)
            expect(response?.status()).toBe(200)

            await expectInitialDocument(page)
        } finally {
            await context.close()
        }
    })

    test('hydrates counter, callbacks, control flow, and renderer toggles', async ({
        page,
        baseURL
    }) => {
        const origin = new URL(baseURL ?? 'http://localhost:4173').origin
        const pageErrors: string[] = []
        const consoleProblems: string[] = []
        const assetFailures: string[] = []

        page.on('pageerror', (error) => pageErrors.push(error.message))
        page.on('console', (message) => {
            if (message.type() === 'error' || message.type() === 'warning') {
                consoleProblems.push(`${message.type()}: ${message.text()}`)
            }
        })
        page.on('requestfailed', (request) => {
            assetFailures.push(`${request.url()} failed: ${request.failure()?.errorText}`)
        })
        page.on('response', (response) => {
            const url = new URL(response.url())
            // The document navigation status is asserted separately below.
            if (url.origin === origin && url.pathname !== ROUTE && !response.ok()) {
                assetFailures.push(`${response.url()} responded ${response.status()}`)
            }
        })

        const response = await page.goto(ROUTE, { waitUntil: 'networkidle' })
        expect(response?.status()).toBe(200)

        await expectInitialDocument(page)

        // Hydrated event handlers, prop callbacks, and compiled control flow.
        await page.getByTestId('typed-counter').click()
        await expect(page.getByTestId('typed-counter')).toHaveText('Count: 7 / typed object')
        await expect(page.getByTestId('parent-changes')).toHaveText('Parent updates: 1')
        await expect(page.getByTestId('conditional')).toHaveText('Compiled control flow works')

        // Layout renderer context stays reactive after hydration.
        await page.getByTestId('toggle-renderer').click()
        await expect(page.getByTestId('custom-heading')).toHaveCount(0)
        await expect(
            page.getByRole('heading', { level: 1, name: 'Build-time markdown, runtime renderers' })
        ).toBeVisible()
        await expect(
            page.getByRole('heading', { level: 2, name: 'Markdown after the compiled island' })
        ).toBeVisible()
        await expectCustomLinks(page)
        await expectInlineDataAndCode(page)

        // Hydration state survives the renderer swap.
        await expect(page.getByTestId('typed-counter')).toHaveText('Count: 7 / typed object')
        await expect(page.getByTestId('parent-changes')).toHaveText('Parent updates: 1')

        expect(pageErrors).toEqual([])
        expect(consoleProblems).toEqual([])
        expect(assetFailures).toEqual([])
    })
})
