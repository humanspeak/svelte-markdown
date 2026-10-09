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

// "Stream again" is also the label before hydration, so wait for the stream's last
// words rather than the button alone.
async function waitForStream(page: Page, ending: string) {
    await expect(page.getByTestId('streaming')).toContainText(ending, { timeout: 20_000 })
    await expect(page.getByRole('button', { name: 'Stream again' })).toBeVisible()
    // Let the last fade start.
    await page.waitForTimeout(300)
}

async function streamAnswer(page: Page, answer: string, ending: string) {
    await page.getByRole('combobox').selectOption(answer)
    await page.getByRole('button', { name: 'Stream again' }).click()
    await expect(page.getByRole('button', { name: 'Restart stream' })).toBeVisible()
    await waitForStream(page, ending)
}

test.describe('KaTeX arrival fade', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/test/katex-motion')
        // The page streams "With math" on load; record only after it and its fades finish.
        await waitForStream(page, 'and moved on.')
        await page.waitForFunction(() => document.getAnimations().length === 0)
        await recordMathFades(page)
    })

    test('fades each streamed formula once and never fades output that was already there', async ({
        page
    }) => {
        await streamAnswer(page, 'With math', 'and moved on.')
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
        await streamAnswer(page, 'Structure changes', 'item')
        const streaming = page.getByTestId('streaming')
        await expect(streaming.locator('h1 .katex')).toHaveCount(1)
        const fades = await takeFades(page)
        expect(fades.map((fade) => [fade.pane, fade.tex])).toEqual([
            ['streaming', 'e^{i\\pi} + 1 = 0'],
            ['streaming', 'a+b']
        ])
    })
})
