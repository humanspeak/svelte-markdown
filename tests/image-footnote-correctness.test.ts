import { expect, test, type Locator, type Page } from '@playwright/test'

const resolvedFragmentTarget = async (page: Page, link: Locator) => {
    const href = await link.getAttribute('href')
    expect(href).toMatch(/^#.+/)
    if (!href) throw new Error('Footnote link did not provide a fragment href')

    const id = decodeURIComponent(href.slice(1))
    return page.locator(`[id=${JSON.stringify(id)}]`)
}

test.describe('Image recovery demonstration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/image-recovery')
        await expect(page.getByTestId('image-recovery-page')).toHaveAttribute(
            'data-hydrated',
            'true'
        )
        await expect(page.getByTestId('image-preview').locator('img')).toBeVisible()
    })

    test('recovers from an error and preserves the node when its source is unchanged', async ({
        page
    }) => {
        const preview = page.getByTestId('image-preview')
        const image = preview.locator('img[alt="Recovery target"]')

        await expect
            .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0)

        await page.getByRole('button', { name: 'Load broken image' }).click()
        await expect(image).toHaveAttribute('data-src', '/missing-image-recovery-demo.png')
        await expect(image).toHaveClass(/error/)
        expect(await image.evaluate((node) => (node as HTMLImageElement).naturalWidth)).toBe(0)

        await page.getByRole('button', { name: 'Recover with valid image' }).click()
        await expect(image).toHaveAttribute('data-src', '/test-image-150.png')
        await expect
            .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0)
        await expect(image).not.toHaveClass(/error/)

        await page.evaluate(() => {
            const testWindow = window as Window & { recoveryImageNode?: Element }
            const imageNode = document.querySelector(
                '[data-testid="image-preview"] img[alt="Recovery target"]'
            )
            if (!imageNode) throw new Error('Recovery image was not rendered')
            testWindow.recoveryImageNode = imageNode
        })

        const sourceBeforeAppend = await image.getAttribute('data-src')
        await page.getByRole('button', { name: 'Append prose' }).click()
        await expect(
            preview.locator('p').filter({
                hasText: 'This paragraph was appended without changing the image URL.'
            })
        ).toHaveText('This paragraph was appended without changing the image URL.')
        expect(await image.getAttribute('data-src')).toBe(sourceBeforeAppend)
        expect(
            await page.evaluate(() => {
                const testWindow = window as Window & { recoveryImageNode?: Element }
                return (
                    testWindow.recoveryImageNode ===
                    document.querySelector(
                        '[data-testid="image-preview"] img[alt="Recovery target"]'
                    )
                )
            })
        ).toBe(true)

        await page.getByRole('button', { name: 'Switch valid image' }).click()
        await expect(image).toHaveAttribute('data-src', '/test-image-50.png')
        await expect
            .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
            .toBeGreaterThan(0)
        await expect(image).not.toHaveClass(/error/)
    })
})

test.describe('Footnote correctness demonstration', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/footnote-correctness')
        await expect(page.getByTestId('footnote-correctness-page')).toHaveAttribute(
            'data-hydrated',
            'true'
        )
        await expect(page.getByTestId('footnote-preview').locator('h1')).toHaveText(
            'Repeated references'
        )
    })

    test('navigates repeated references through unique IDs and the second return link', async ({
        page
    }) => {
        const preview = page.getByTestId('footnote-preview')
        const references = preview.locator('.footnote-ref a')
        await expect(references).toHaveCount(2)

        const referenceIds = await references.evaluateAll((links) => links.map((link) => link.id))
        expect(new Set(referenceIds).size).toBe(2)
        expect(referenceIds).toEqual(['fnref-repeat', 'fnref-repeat:ref:2'])

        const definitionTarget = await resolvedFragmentTarget(page, references.first())
        await references.first().click()
        await expect(definitionTarget).toHaveAttribute('id', 'fn-repeat')
        await expect(preview.locator(':target')).toHaveAttribute('id', 'fn-repeat')

        const returnLinks = definitionTarget.locator('[role="doc-backlink"]')
        await expect(returnLinks).toHaveCount(2)
        const secondReferenceTarget = await resolvedFragmentTarget(page, returnLinks.nth(1))
        await returnLinks.nth(1).click()
        await expect(secondReferenceTarget).toHaveAttribute('id', 'fnref-repeat:ref:2')
        await expect(preview.locator(':target')).toHaveAttribute('id', 'fnref-repeat:ref:2')
    })

    test('keeps content after a definition and keeps the first duplicate definition', async ({
        page
    }) => {
        const preview = page.getByTestId('footnote-preview')

        await page.getByRole('button', { name: 'Following content' }).click()
        await expect(
            preview.locator('p').filter({
                hasText: 'Paragraph after the definition remains visible.'
            })
        ).toHaveText('Paragraph after the definition remains visible.')
        await expect(preview.locator('[role="doc-endnotes"] li')).toContainText(
            'The definition belongs in the footnote section.'
        )
        await expect(
            preview.getByRole('heading', {
                name: 'Heading after the definition remains visible',
                level: 2
            })
        ).toBeVisible()

        await page.getByRole('button', { name: 'Duplicate definitions' }).click()
        const definition = preview.locator('[role="doc-endnotes"] li')
        await expect(definition).toHaveCount(1)
        await expect(definition).toContainText('First definition wins.')
        await expect(preview).not.toContainText('Second definition must be ignored.')
    })

    test('uses resolvable fragments for Unicode and punctuation labels', async ({ page }) => {
        const preview = page.getByTestId('footnote-preview')
        await page.getByRole('button', { name: 'Special labels' }).click()

        const references = preview.locator('.footnote-ref a')
        await expect(references).toHaveCount(2)

        for (const reference of await references.all()) {
            const target = await resolvedFragmentTarget(page, reference)
            await reference.click()
            await expect(target).toBeVisible()
            expect(await target.evaluate((node) => node.matches(':target'))).toBe(true)
        }
    })

    test('completes from accumulated stream source and reset restores the initial controls', async ({
        page
    }) => {
        await page.clock.install()

        const preview = page.getByTestId('footnote-preview')
        const progress = page.getByTestId('stream-progress')

        await page.getByRole('button', { name: 'Stream example' }).click()
        await expect(progress).toContainText('Streaming')
        await expect(page.getByTestId('footnote-source')).toContainText(
            '# Streaming footnote completion'
        )

        await page.getByRole('button', { name: 'Complete' }).click()
        await expect(progress).toHaveText('7 / 7 chunks — Complete')
        await expect(preview.getByRole('heading', { level: 1 })).toHaveText(
            'Streaming footnote completion'
        )
        await expect(preview.locator('.footnote-ref a')).toHaveCount(2)
        await expect(preview.locator('[role="doc-endnotes"] [role="doc-backlink"]')).toHaveCount(2)
        await expect(preview).toContainText(
            'Streamed paragraph after the definition remains visible.'
        )
        await expect(
            preview.getByRole('heading', {
                name: 'Streamed heading after the definition remains visible',
                level: 2
            })
        ).toBeVisible()

        await page.getByRole('button', { name: 'Stream example' }).click()
        await expect(progress).toContainText('Streaming')
        await page.getByRole('button', { name: 'Reset' }).click()
        await page.clock.fastForward(1000)

        await expect(progress).toHaveText('0 / 7 chunks — Ready')
        await expect(page.getByTestId('selected-fixture')).toHaveText('Repeated references')
        await expect(page.getByRole('button', { name: 'Repeated references' })).toHaveAttribute(
            'aria-pressed',
            'true'
        )
        await expect(page.getByTestId('footnote-source')).toContainText('# Repeated references')
        await expect(preview.getByRole('heading', { level: 1 })).toHaveText('Repeated references')
        await expect(preview).not.toContainText('Streaming footnote completion')
    })
})
