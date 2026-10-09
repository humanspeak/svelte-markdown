import { expect, test } from '@playwright/test'

test('SSR baseline hydrates without replay, resets and isolates arrivals', async ({
    page,
    request
}) => {
    const response = await request.get('/streaming-text')
    expect(await response.text()).toContain('data-new="false"')
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/streaming-text')
    const output = page.getByTestId('output')
    await expect(output).toHaveText('Baseline ')
    await expect(output.locator('[data-new="true"]')).toHaveCount(0)
    const original = await output.locator('[data-id]').first().getAttribute('data-id')
    await page.getByRole('button', { name: 'Append', exact: true }).click()
    await expect(output).toHaveText("Baseline can't 👩‍💻 é ")
    await expect(output.locator('[data-new="true"]').first()).toBeVisible()
    await expect(page.getByTestId('isolated')).toHaveText('Baseline ')
    await expect(page.getByTestId('ordinary').locator('span')).toHaveCount(0)
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await expect(output).toHaveText('Baseline ')
    expect(await output.locator('[data-id]').first().getAttribute('data-id')).not.toBe(original)
    await expect(output.locator('[data-new="true"]')).toHaveCount(0)
    expect(errors).toEqual([])
})

test('wrapper completion and offset revisions preserve old reveal eligibility', async ({
    page
}) => {
    await page.goto('/streaming-text')
    const output = page.getByTestId('output')
    await page.getByRole('button', { name: 'Seed link' }).click()
    await expect(output).toHaveText('[label')
    await page.getByRole('button', { name: 'Complete link' }).click()
    await expect(output).toHaveText('label label')
    await expect(output.locator('a [data-new="true"]')).toHaveCount(0)
    await expect(output.locator('[data-new="true"]').last()).toHaveText('label')
    await page.getByRole('button', { name: 'Offset tail' }).click()
    await expect(page.getByTestId('patch')).toHaveText('     tail')
    await page.getByRole('button', { name: 'Offset fill' }).click()
    await expect(page.getByTestId('patch')).toHaveText('Head tail')
    await expect(page.getByTestId('patch').locator('[data-change="revision"]')).toHaveText('Head')
})

test('tracking toggles and grapheme selection baseline existing text', async ({ page }) => {
    await page.goto('/streaming-text')
    const output = page.getByTestId('output')
    await page.getByRole('button', { name: 'Append', exact: true }).click()
    await expect(output).toHaveText("Baseline can't 👩‍💻 é ")
    await page.getByRole('button', { name: 'Toggle tracking' }).click()
    await page.getByRole('button', { name: 'Toggle tracking' }).click()
    await expect(output.locator('[data-new="true"]')).toHaveCount(0)
    await page.getByLabel('Granularity').selectOption('grapheme')
    await expect(output).toHaveText("Baseline can't 👩‍💻 é ")
    await expect(output.locator('[data-new="true"]')).toHaveCount(0)
})
