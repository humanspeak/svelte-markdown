import { expect, test, type Locator } from '@playwright/test'

const textContent = async (selector: Locator) =>
    selector.evaluate((node: Element) => node.textContent ?? '')

test.describe('Imperative Streaming', () => {
    test('supports append-mode writes and resets through the component instance', async ({
        page
    }) => {
        await page.goto('/test/imperative-streaming', { waitUntil: 'networkidle' })

        await page.getByTestId('append-write-hello').click()
        await page.getByTestId('append-write-space').click()
        await page.getByTestId('append-write-space').click()
        await page.getByTestId('append-write-world').click()

        await expect(page.getByTestId('append-preview').locator('p')).toHaveText('Hello  World')

        await page.getByTestId('append-reset').click()
        await expect(page.getByTestId('append-preview')).toBeEmpty()

        await page.getByTestId('append-reset-seed').click()
        await expect(page.getByTestId('append-preview').locator('h1')).toHaveText('Seed')

        await page.getByTestId('append-prop-reset').click()
        await expect(page.getByTestId('append-preview').locator('h1')).toHaveText('Prop Seed')

        await page.getByTestId('append-write-tail').click()
        await expect(page.getByTestId('append-preview')).toContainText('Tail')
    })

    test('supports offset-mode writes, gaps, overwrites, and mode-lock warnings', async ({
        page
    }) => {
        const warnings: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'warning') {
                warnings.push(msg.text())
            }
        })

        await page.goto('/test/imperative-streaming', { waitUntil: 'networkidle' })
        warnings.length = 0

        await page.getByTestId('offset-write-hello').click()
        await page.getByTestId('offset-write-tail').click()
        await expect(page.getByTestId('offset-preview').locator('p')).toHaveText('Hello World')

        await page.getByTestId('offset-overwrite').click()
        await expect(page.getByTestId('offset-preview').locator('p')).toHaveText('HeZlo World')

        await page.getByTestId('offset-reset').click()
        await page.getByTestId('offset-gap').click()
        expect(await textContent(page.getByTestId('offset-preview').locator('p'))).toBe('ab  XY')

        await page.getByTestId('offset-try-append').click()
        expect(
            warnings.some((warning) => warning.includes('offset mode active, string chunk dropped'))
        ).toBe(true)

        warnings.length = 0

        await page.getByTestId('append-write-hello').click()
        await page.getByTestId('append-try-offset').click()
        expect(
            warnings.some((warning) => warning.includes('append mode active, offset chunk dropped'))
        ).toBe(true)

        await page.getByTestId('offset-prop-reset').click()
        await expect(page.getByTestId('offset-preview').locator('p')).toHaveText('Seed')
    })

    test('warns and no-ops when imperative writes are attempted with async extensions', async ({
        page
    }) => {
        const warnings: string[] = []
        page.on('console', (msg) => {
            if (msg.type() === 'warning') {
                warnings.push(msg.text())
            }
        })

        await page.goto('/test/imperative-streaming', { waitUntil: 'networkidle' })
        warnings.length = 0

        await page.getByTestId('async-write').click()

        await expect(page.getByTestId('async-preview')).toBeEmpty()
        expect(
            warnings.some((warning) =>
                warning.includes('writeChunk() is unavailable when async extensions are used')
            )
        ).toBe(true)
    })
})
