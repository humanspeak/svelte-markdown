import { expect, test, type Locator, type Page } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const baseline = 'The notebook is already open. '
const first =
    "We can't hurry the morning. 👩‍💻 brings a café greeting, é carries its accent, and  two spaces stay together. "
const second =
    'A new thought gets a little lift. The story continues while const greeting = "Hello, 世界" stays plain.'
const presets = ['FadeWords', 'RiseWords', 'FadeCharacters'] as const

// Computed styles observe browser animation, including WAAPI effects that do not
// update inline style. Sample on animation frames rather than sleeping a fixed time.
async function sample(output: Locator) {
    return output.evaluate(async (element) => {
        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
        const read = (span: Element) => {
            const style = getComputedStyle(span)
            return {
                opacity: Number(style.opacity),
                y: style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m42
            }
        }
        const paragraphs = element.querySelectorAll('p')
        const spans = [...element.querySelectorAll('span')]
        // Baseline occupies the first 29 UTF-16 units of the first paragraph.
        let offset = 0
        const old: ReturnType<typeof read>[] = []
        const arriving: ReturnType<typeof read>[] = []
        for (const span of spans) {
            if (span.closest('p') === paragraphs[0] && offset < 29) old.push(read(span))
            else arriving.push(read(span))
            offset += span.textContent?.length ?? 0
            // Whitespace is a literal sibling, so use Range to get the true offset.
            const range = document.createRange()
            range.setStart(paragraphs[0], 0)
            if (span.closest('p') === paragraphs[0]) {
                range.setEndAfter(span)
                offset = range.toString().length
            }
        }
        return { old, arriving }
    })
}

async function exactText(output: Locator, expected: string) {
    await expect.poll(() => output.evaluate((element) => element.textContent)).toBe(expected)
}

async function setup(page: Page) {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/streaming-motion')
    await expect(page.getByRole('button', { name: 'Append passage', exact: true })).toBeEnabled()
    await page.getByLabel('Duration (seconds)').fill('2')
    return errors
}

for (const preset of presets) {
    test(`${preset}: actual entrance, settled text, stable baseline and replay`, async ({
        page
    }) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        const errors = await setup(page)
        const output = page.getByTestId(preset)
        await exactText(output, baseline)
        const initial = await sample(output)
        expect(initial.old.length).toBeGreaterThan(0)
        expect(initial.old.every((part) => part.opacity === 1 && Math.abs(part.y) < 0.01)).toBe(
            true
        )
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await exactText(output, baseline + first)
        await exactText(page.getByTestId('Plain'), baseline + first)
        await expect
            .poll(async () => {
                const frame = await sample(output)
                expect(
                    frame.old.every((part) => part.opacity === 1 && Math.abs(part.y) < 0.01)
                ).toBe(true)
                return frame.arriving.some(
                    (part) =>
                        part.opacity > 0 &&
                        part.opacity < 0.95 &&
                        (preset === 'RiseWords' ? part.y > 0.1 : Math.abs(part.y) < 0.01)
                )
            })
            .toBe(true)
        await expect
            .poll(async () => {
                const frame = await sample(output)
                expect(
                    frame.old.every((part) => part.opacity === 1 && Math.abs(part.y) < 0.01)
                ).toBe(true)
                return (
                    frame.arriving.length > 0 &&
                    frame.arriving.every((part) => part.opacity > 0.99 && Math.abs(part.y) < 0.01)
                )
            })
            .toBe(true)
        // Emoji/combining accents must occupy whole graphemes, not broken spans.
        await expect(output.locator('span').filter({ hasText: /^👩‍💻$/ })).toHaveCount(1)
        await expect(output.locator('span').filter({ hasText: /^é$/ })).toHaveCount(1)
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await exactText(output, baseline + first + second)
        await expect
            .poll(async () => {
                return output
                    .locator('p')
                    .first()
                    .evaluate(async (element) => {
                        await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
                        return [...element.querySelectorAll('span')].every(
                            (span) => Number(getComputedStyle(span).opacity) === 1
                        )
                    })
            })
            .toBe(true)
        await expect(output.locator('code')).toHaveText('const greeting = "Hello, 世界"')
        await expect(output.locator('code span')).toHaveCount(0)
        await page.getByRole('button', { name: 'Reset', exact: true }).click()
        await exactText(output, baseline)
        await page.getByRole('button', { name: 'Stream / Replay sample' }).click()
        await expect
            .poll(async () =>
                (await sample(output)).arriving.some(
                    (part) => part.opacity > 0 && part.opacity < 0.95
                )
            )
            .toBe(true)
        // Replaying while active replaces the run rather than duplicating timers.
        await page.getByRole('button', { name: 'Stream / Replay sample' }).click()
        await expect
            .poll(() => output.textContent(), { timeout: 15000 })
            .toBe(baseline + first + second)
        await expect(page.getByRole('status')).toContainText('Complete')
        await expect
            .poll(async () =>
                (await sample(output)).arriving.every(
                    (part) => part.opacity > 0.99 && Math.abs(part.y) < 0.01
                )
            )
            .toBe(true)
        expect(errors).toEqual([])
    })

    for (const mode of ['disabled', 'reduced-motion'] as const) {
        test(`${preset}: ${mode} is immediately readable, including live preference changes`, async ({
            page,
            request
        }) => {
            await page.emulateMedia({
                reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference'
            })
            const response = await request.get('/streaming-motion')
            const html = await response.text()
            expect(html).toContain(baseline)
            expect(html).not.toContain('opacity: 0')
            const errors = await setup(page)
            if (mode === 'disabled') await page.getByLabel('Disable motion').check()
            const output = page.getByTestId(preset)
            await page.getByRole('button', { name: 'Append passage', exact: true }).click()
            await exactText(output, baseline + first)
            await expect(output.locator('span')).toHaveCount(0)
            expect(await output.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
            if (mode === 'reduced-motion') {
                await page.emulateMedia({ reducedMotion: 'no-preference' })
                await expect(page.getByTestId('motion-preference')).toHaveText('Motion enabled')
            } else await page.getByLabel('Disable motion').uncheck()
            // Re-enabling baselines existing content instead of replaying it.
            await expect
                .poll(async () =>
                    (await sample(output)).arriving.every((part) => part.opacity === 1)
                )
                .toBe(true)
            await page.getByRole('button', { name: 'Append passage', exact: true }).click()
            await expect
                .poll(async () =>
                    (await sample(output)).arriving.some(
                        (part) => part.opacity > 0 && part.opacity < 0.95
                    )
                )
                .toBe(true)
            await page.emulateMedia({ reducedMotion: 'reduce' })
            await expect(page.getByTestId('motion-preference')).toContainText(
                'System reduced motion'
            )
            await expect(output.locator('span')).toHaveCount(0)
            await exactText(output, baseline + first + second)
            expect(errors).toEqual([])
        })
    }
}

test('partial words retain their entrance and agree with plain at realistic cadence', async ({
    page
}, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const errors = await setup(page)
    await page.getByLabel('Chunk shape').selectOption('fragment')
    // Record every rendered frame through completion, including unfinished words.
    await page.evaluate(() => {
        const state = {
            done: false,
            frames: [] as {
                text: string
                exact: boolean
                opacity: number[]
                y: number[]
                retained: boolean[]
                baselineVisible: boolean
            }[]
        }
        Object.assign(window, { motionFrames: state })
        const previous: (Element | undefined)[] = []
        const record = () => {
            const plain = document.querySelector('[data-testid="Plain"]')!
            const motion = ['FadeWords', 'RiseWords', 'FadeCharacters'].map((name) =>
                document.querySelector(`[data-testid="${name}"]`)!
            )
            const targets = motion.map((element) =>
                [...element.querySelectorAll('span')].find((span) =>
                    /^(W|We)$/.test(span.textContent ?? '')
                )
            )
            state.frames.push({
                text: plain.textContent ?? '',
                exact: motion.every((element) => element.textContent === plain.textContent),
                opacity: targets.map((span) =>
                    span ? Number(getComputedStyle(span).opacity) : -1
                ),
                y: targets.map((span) => {
                    const transform = span ? getComputedStyle(span).transform : 'none'
                    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m42
                }),
                retained: targets.map(
                    (span, index) => !previous[index] || span === previous[index]
                ),
                baselineVisible: motion.every((element) =>
                    [...element.querySelectorAll('p:first-child span')]
                        .filter((span) => span.textContent === 'The' || span.textContent === 'T')
                        .every((span) => Number(getComputedStyle(span).opacity) === 1)
                )
            })
            targets.forEach((span, index) => {
                if (span) previous[index] = span
            })
            if (!state.done) requestAnimationFrame(record)
        }
        requestAnimationFrame(record)
    })
    await page.getByRole('button', { name: 'Stream / Replay sample' }).click()
    await expect
        .poll(() => page.getByTestId('Plain').textContent(), { timeout: 15000 })
        .toBe(baseline + first + second)
    await expect(page.getByRole('status')).toContainText('Complete')
    const frames = await page.evaluate(() => {
        const state = (
            window as unknown as {
                motionFrames: {
                    done: boolean
                    frames: {
                        text: string
                        exact: boolean
                        opacity: number[]
                        y: number[]
                        retained: boolean[]
                        baselineVisible: boolean
                    }[]
                }
            }
        ).motionFrames
        state.done = true
        return state.frames
    })
    await writeFile(testInfo.outputPath('partial-word-browser-frames.json'), JSON.stringify(frames))
    await testInfo.attach('partial-word-browser-frames', {
        body: JSON.stringify(frames),
        contentType: 'application/json'
    })
    expect(frames.every((frame) => frame.exact && frame.baselineVisible)).toBe(true)
    expect(frames.some((frame) => frame.text === baseline + 'W')).toBe(true)
    expect(frames.some((frame) => frame.text.startsWith(baseline + 'We '))).toBe(true)
    for (let preset = 0; preset < presets.length; preset++) {
        const visible = frames.filter((frame) => frame.opacity[preset] >= 0)
        expect(visible.length).toBeGreaterThan(2)
        expect(visible.every((frame) => frame.retained[preset])).toBe(true)
        expect(
            visible.some((frame) => frame.opacity[preset] > 0 && frame.opacity[preset] < 1)
        ).toBe(true)
        for (let index = 1; index < visible.length; index++) {
            expect(visible[index].opacity[preset]).toBeGreaterThanOrEqual(
                visible[index - 1].opacity[preset] - 0.001
            )
        }
        if (preset !== 1)
            expect(visible.every((frame) => Math.abs(frame.y[preset]) < 0.01)).toBe(true)
    }
    expect(errors).toEqual([])
})
