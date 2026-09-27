import { expect, test } from '@playwright/test'

test.describe('Heading metadata in long documents', () => {
    test('assigns every heading id in a finished 2,000-heading document', async ({ page }) => {
        await page.goto('/test/perf-bench')
        await page.getByTestId('parse-heading-heavy').click()
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
    })

    test('matches cold heading ids after a large imperative stream', async ({ page }) => {
        await page.goto('/test/perf-bench')
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
})
