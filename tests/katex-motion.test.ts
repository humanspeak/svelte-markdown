import { expect, test, type Page } from '@playwright/test'

// Records every distinct animation on a KaTeX wrapper, keyed by pane and TeX source.
async function recordMathFades(page: Page) {
    await page.evaluate(() => {
        const seen = new WeakSet<Animation>()
        const fades: { pane: string; tex: string }[] = []
        ;(window as unknown as { mathFades: typeof fades }).mathFades = fades
        const poll = () => {
            for (const animation of document.getAnimations()) {
                const target = (animation.effect as KeyframeEffect | null)?.target
                if (!target || seen.has(animation) || !target.querySelector('.katex')) continue
                seen.add(animation)
                fades.push({
                    pane: target.closest<HTMLElement>('[data-testid]')?.dataset.testid ?? '',
                    tex: target.querySelector('annotation')?.textContent ?? ''
                })
            }
            requestAnimationFrame(poll)
        }
        poll()
    })
}
const takeFades = (page: Page) =>
    page.evaluate(() => {
        const fades = (window as unknown as { mathFades: { pane: string; tex: string }[] })
            .mathFades
        return fades.splice(0)
    })

async function streamAnswer(page: Page, answer: string) {
    await page.getByRole('combobox').selectOption(answer)
    await page.getByRole('button', { name: /Stream again|Restart stream/ }).click()
    await expect(page.getByRole('button', { name: 'Stream again' })).toBeVisible({
        timeout: 15_000
    })
    // Let the last fade start.
    await page.waitForTimeout(300)
}

test.describe('KaTeX arrival fade', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/katex-motion')
        await expect(page.getByRole('button', { name: 'Stream again' })).toBeVisible({
            timeout: 15_000
        })
        await recordMathFades(page)
    })

    test('fades each streamed formula once and never fades output that was already there', async ({
        page
    }) => {
        await streamAnswer(page, 'With math')
        const fades = await takeFades(page)
        expect(fades.filter((fade) => fade.pane === 'already-output')).toEqual([])
        expect(fades.map((fade) => fade.tex)).toEqual([
            'ax^2 + bx + c = 0',
            'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
            'e^{i\\pi} + 1 = 0'
        ])
        await page.getByRole('button', { name: 'Re-mount output' }).click()
        await page.waitForTimeout(300)
        expect(await takeFades(page)).toEqual([])
    })

    test('does not replay the fade when a paragraph holding math changes structure', async ({
        page
    }) => {
        await streamAnswer(page, 'Structure changes')
        const streaming = page.getByTestId('streaming')
        await expect(streaming.locator('h1 .katex')).toHaveCount(1)
        const fades = await takeFades(page)
        expect(fades.map((fade) => [fade.pane, fade.tex])).toEqual([
            ['streaming', 'e^{i\\pi} + 1 = 0'],
            ['streaming', 'a+b']
        ])
    })
})
