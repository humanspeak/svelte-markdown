import { expect, test, type Page } from '@playwright/test'

const expectFinishedHeadingDocument = async (page: Page) => {
    const stats = page.getByTestId('perf-stats')
    await expect(stats).toContainText('scenario=parse-heading-heavy-done')
    await expect(stats).toContainText('headingCount=2000')
    await expect(stats).toContainText('headingIdMismatches=0')

    const ids = await page
        .getByTestId('perf-preview')
        .locator('h1')
        .evaluateAll((headings) => headings.map((heading) => heading.id))
    expect(ids).toEqual(
        Array.from({ length: 2_000 }, (_, index) => {
            if (index % 10 !== 0) return `section-${index}`
            return index === 0 ? 'overview' : `overview-${index / 10}`
        })
    )
}

test.describe('Heading metadata in long documents', () => {
    test('assigns every heading id in a finished 2,000-heading document', async ({ page }) => {
        await page.goto('/test/perf-bench')
        await expect(page.getByTestId('perf-stats')).toHaveAttribute('data-ready', 'true')
        await page.getByTestId('parse-heading-heavy').click()
        await expectFinishedHeadingDocument(page)
    })

    test('matches cold heading ids after a large imperative stream', async ({ page }) => {
        await page.goto('/test/perf-bench')
        await expect(page.getByTestId('perf-stats')).toHaveAttribute('data-ready', 'true')
        await page.getByTestId('stream-large').click()
        const stats = page.getByTestId('perf-stats')
        await expect(stats).toContainText('scenario=stream-large-done', { timeout: 45_000 })
        await expect(stats).toContainText('headingIdMismatches=0')
        const headingCount = Number((await stats.textContent())?.match(/headingCount=(\d+)/)?.[1])
        expect(headingCount).toBeGreaterThan(100)
        await expect(page.getByTestId('perf-preview').locator('h1,h2,h3,h4,h5,h6')).toHaveCount(
            headingCount
        )
    })
    test('waits for real hydration before running the heading benchmark', async ({ page }) => {
        const runtimeErrors: string[] = []
        page.on('pageerror', (error) => runtimeErrors.push(error.message))
        page.on('console', (message) => {
            if (message.type() === 'error') runtimeErrors.push(message.text())
        })

        let releaseModules!: () => void
        const modulesReleased = new Promise<void>((resolve) => {
            releaseModules = resolve
        })
        let recordModuleRequest!: () => void
        const moduleRequested = new Promise<void>((resolve) => {
            recordModuleRequest = resolve
        })
        // Hold production route imports, not the entry script: browser load
        // still completes with the real SSR document before hydration starts.
        await page.route('**/_app/immutable/nodes/*.js', async (route) => {
            recordModuleRequest()
            await modulesReleased
            await route.continue()
        })
        try {
            await page.goto('/test/perf-bench')
            await moduleRequested
            expect(await page.evaluate(() => document.readyState)).toBe('complete')
            const stats = page.getByTestId('perf-stats')
            await expect(stats).toHaveAttribute('data-ready', 'false')
            await expect(page.getByTestId('parse-heading-heavy')).toBeDisabled()
            await expect(page.getByTestId('stream-large')).toBeDisabled()
            await expect(stats).toContainText('scenario=idle')

            releaseModules()
            await expect(stats).toHaveAttribute('data-ready', 'true')
            await expect(page.getByTestId('parse-heading-heavy')).toBeEnabled()
            await expect(page.getByTestId('stream-large')).toBeEnabled()
            await page.getByTestId('parse-heading-heavy').click()
            await expectFinishedHeadingDocument(page)
            expect(runtimeErrors).toEqual([])
        } finally {
            releaseModules()
            await page.unrouteAll({ behavior: 'wait' })
        }
    })
})
