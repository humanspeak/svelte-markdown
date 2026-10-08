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

type MotionFrame = {
    time: number
    text: string
    prefix: string
    exact: boolean
    baselineVisible: boolean
    graphemesIntact: boolean
    targets: {
        text: string
        start: number
        end: number
        opacity: number
        y: number
        layoutX: number
        layoutY: number
        retained: boolean
    }[]
    pending: number[]
    oldestPending: number[]
    unreadable: number[]
    oldestUnreadable: number[]
    resets: number[]
}

// The first paragraph has no markdown delimiters, so Range offsets are also
// source offsets. Select the c in can/can't, never another c later in the sample.
const targetOffset = baseline.length + 'We '.length

async function startRecorder(page: Page) {
    await page.evaluate(
        ({ baseline, targetOffset }) => {
            const state = { done: false, frames: [] as MotionFrame[] }
            Object.assign(window, { motionFrames: state })
            const previous: (Element | undefined)[] = []
            const history = new WeakMap<Element, { born: number; opacity: number }>()
            const offsetRange = document.createRange()
            const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
            const record = (time: number) => {
                const plain = document.querySelector('[data-testid="Plain"]')!
                const motion = ['FadeWords', 'RiseWords', 'FadeCharacters'].map((name) =>
                    document.querySelector(`[data-testid="${name}"]`)!
                )
                const pending: number[] = []
                const oldestPending: number[] = []
                const unreadable: number[] = []
                const oldestUnreadable: number[] = []
                const resets: number[] = []
                let baselineVisible = true
                let graphemesIntact = true
                const targets = motion.map((element, index) => {
                    const paragraph = element.querySelector('p')!
                    const prefix = paragraph.textContent ?? ''
                    const spans = [...element.querySelectorAll('span')]
                    let coveredBaseline = 0
                    let target: Element | undefined
                    let start = -1
                    let end = -1
                    pending[index] = 0
                    oldestPending[index] = 0
                    unreadable[index] = 0
                    oldestUnreadable[index] = 0
                    resets[index] = 0
                    const graphemes = new Map(
                        Array.from(segmenter.segment(prefix), (part) => [part.index, part.segment])
                    )
                    for (const span of spans) {
                        const opacity = Number(getComputedStyle(span).opacity)
                        const old = history.get(span)
                        if (old && opacity < old.opacity - 0.001) resets[index]++
                        const born = old?.born ?? time
                        history.set(span, { born, opacity })
                        if (opacity < 0.99) {
                            pending[index]++
                            oldestPending[index] = Math.max(oldestPending[index], time - born)
                        }
                        if (opacity < 0.5) {
                            unreadable[index]++
                            oldestUnreadable[index] = Math.max(oldestUnreadable[index], time - born)
                        }
                        if (span.closest('p') !== paragraph) continue
                        const range = offsetRange
                        range.setStart(paragraph, 0)
                        range.setEndBefore(span)
                        const offset = range.toString().length
                        const text = span.textContent ?? ''
                        if (offset < baseline.length) {
                            coveredBaseline += text.length
                            baselineVisible &&=
                                (opacity === 1 && getComputedStyle(span).transform === 'none') ||
                                (opacity === 1 &&
                                    Math.abs(
                                        new DOMMatrixReadOnly(getComputedStyle(span).transform).m42
                                    ) < 0.01)
                        }
                        if (index === 2) graphemesIntact &&= graphemes.get(offset) === text
                        if (offset === targetOffset) {
                            target = span
                            start = offset
                            end = offset + text.length
                        }
                    }
                    const expectedCovered = Array.from(baseline).filter(
                        (char) => !/\s/u.test(char)
                    ).length
                    baselineVisible &&=
                        prefix.startsWith(baseline) && coveredBaseline === expectedCovered
                    const style = target ? getComputedStyle(target) : undefined
                    const y =
                        !style || style.transform === 'none'
                            ? 0
                            : new DOMMatrixReadOnly(style.transform).m42
                    const box = target?.getBoundingClientRect()
                    const parentBox = paragraph.getBoundingClientRect()
                    const retained = !!target && (!previous[index] || previous[index] === target)
                    if (target) previous[index] = target
                    return {
                        text: target?.textContent ?? '',
                        start,
                        end,
                        opacity: style ? Number(style.opacity) : -1,
                        y,
                        layoutX: box ? box.x - parentBox.x : -1,
                        layoutY: box ? box.y - parentBox.y - y : -1,
                        retained
                    }
                })
                state.frames.push({
                    time,
                    text: plain.textContent ?? '',
                    prefix: plain.querySelector('p')?.textContent ?? '',
                    exact: motion.every((element) => element.textContent === plain.textContent),
                    baselineVisible,
                    graphemesIntact,
                    targets,
                    pending,
                    oldestPending,
                    unreadable,
                    oldestUnreadable,
                    resets
                })
                if (!state.done) requestAnimationFrame(record)
            }
            requestAnimationFrame(record)
        },
        { baseline, targetOffset }
    )
}

async function recordedFrames(page: Page, done = false) {
    return page.evaluate((done) => {
        const state = (
            window as unknown as { motionFrames: { done: boolean; frames: MotionFrame[] } }
        ).motionFrames
        state.done = done
        return state.frames
    }, done)
}

for (const run of [
    { name: 'partial word continuity with a long entrance', mode: 'fragment', duration: 2 },
    { name: 'default presets at partial-word 50 ms cadence', mode: 'fragment', duration: 0.18 },
    { name: 'default presets at whole-word 100 ms cadence', mode: 'word', duration: 0.18 }
]) {
    test(run.name, async ({ page }, testInfo) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        const errors = await setup(page, run.duration)
        await page.getByLabel('Chunk shape').selectOption(run.mode)
        await startRecorder(page)
        await page.getByRole('button', { name: 'Stream / Replay sample' }).click()
        await expect
            .poll(() => page.getByTestId('Plain').textContent(), { timeout: 15000 })
            .toBe(baseline + first + second)
        await expect(page.getByRole('status')).toContainText('Complete')
        await expect
            .poll(async () => {
                const frames = await recordedFrames(page)
                const last = frames.at(-1)
                return (
                    !!last &&
                    last.text === baseline + first + second &&
                    last.pending.every((count) => count === 0)
                )
            })
            .toBe(true)
        const frames = await recordedFrames(page, true)
        await writeFile(testInfo.outputPath('motion-browser-frames.json'), JSON.stringify(frames))
        await testInfo.attach('motion-browser-frames', {
            body: JSON.stringify(frames),
            contentType: 'application/json'
        })
        expect(frames.length).toBeGreaterThan(10)
        expect(
            frames.every((frame) => frame.exact && frame.baselineVisible && frame.graphemesIntact)
        ).toBe(true)
        expect(frames.every((frame) => frame.resets.every((count) => count === 0))).toBe(true)
        for (let preset = 0; preset < presets.length; preset++) {
            const visible = frames.filter((frame) => frame.targets[preset].start === targetOffset)
            expect(visible.length).toBeGreaterThan(2)
            expect(visible.every((frame) => frame.targets[preset].retained)).toBe(true)
            expect(
                visible.some(
                    (frame) =>
                        frame.targets[preset].opacity > 0 && frame.targets[preset].opacity < 0.99
                )
            ).toBe(true)
            expect(visible.at(-1)!.targets[preset].opacity).toBe(1)
            if (preset === 1)
                expect(visible.some((frame) => frame.targets[preset].y > 0.1)).toBe(true)
            else
                expect(visible.every((frame) => Math.abs(frame.targets[preset].y) < 0.01)).toBe(
                    true
                )
            for (let index = 1; index < visible.length; index++) {
                expect(visible[index].targets[preset].opacity).toBeGreaterThanOrEqual(
                    visible[index - 1].targets[preset].opacity - 0.001
                )
            }
            if (run.mode === 'fragment') {
                const unfinished = visible.find((frame) => frame.prefix === baseline + 'We can')
                const completed = visible.find((frame) => frame.prefix === baseline + "We can't ")
                expect(unfinished).toBeDefined()
                expect(completed).toBeDefined()
                expect(unfinished!.targets[preset].text).toBe(preset === 2 ? 'c' : 'can')
                expect(completed!.targets[preset].text).toBe(preset === 2 ? 'c' : "can't")
                expect(unfinished!.targets[preset].end).toBe(targetOffset + (preset === 2 ? 1 : 3))
                expect(completed!.targets[preset].end).toBe(targetOffset + (preset === 2 ? 1 : 5))
                if (run.duration === 2) {
                    expect(completed!.targets[preset].opacity).toBeLessThan(0.99)
                    expect(completed!.targets[preset].opacity).toBeGreaterThan(
                        unfinished!.targets[preset].opacity
                    )
                }
            }
        }
        if (run.duration === 0.18) {
            // Observe actual default rise motion through a growing word: it must
            // stay inside the smaller travel window, settle without reversal,
            // and retain its layout position as can becomes can't.
            const rise = frames
                .filter((frame) => frame.targets[1].start === targetOffset)
                .map((frame) => frame.targets[1])
            expect(rise.every((part) => part.y >= -0.01 && part.y <= 4.01)).toBe(true)
            expect(rise.at(-1)!.y).toBeLessThan(0.01)
            for (let index = 1; index < rise.length; index++) {
                expect(rise[index].y).toBeLessThanOrEqual(rise[index - 1].y + 0.01)
                expect(Math.abs(rise[index].layoutX - rise[0].layoutX)).toBeLessThan(0.1)
                expect(Math.abs(rise[index].layoutY - rise[0].layoutY)).toBeLessThan(0.1)
            }
            // Default entrance + capped 160 ms batch delay, with 60 ms of
            // scheduling tolerance. An old, unreadable tail must not accumulate.
            expect(Math.max(...frames.flatMap((frame) => frame.oldestPending))).toBeLessThan(400)
        }
        for (const preset of presets) {
            const output = page.getByTestId(preset)
            await exactText(output, baseline + first + second)
            await expect(output.locator('span').filter({ hasText: /^👩‍💻$/ })).toHaveCount(1)
            await expect(output.locator('span').filter({ hasText: /^é$/ })).toHaveCount(1)
            await expect(output.locator('code')).toHaveText('const greeting = "Hello, 世界"')
            await expect(output.locator('code span')).toHaveCount(0)
        }
        expect(errors).toEqual([])
    })
}

async function exactText(output: Locator, expected: string) {
    await expect.poll(() => output.evaluate((element) => element.textContent)).toBe(expected)
}

async function setup(page: Page, duration = 2) {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
    })
    await page.goto('/streaming-motion')
    await expect
        .poll(async () => ({
            ready: await page
                .getByRole('button', { name: 'Append passage', exact: true })
                .isEnabled(),
            errors
        }))
        .toEqual({ ready: true, errors: [] })
    if (duration !== 0.18) await page.getByLabel('Duration (seconds)').fill(String(duration))
    await expect(page.getByLabel('Duration (seconds)')).toHaveValue(String(duration))
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
                        const spans = [...element.querySelectorAll('span')]
                        return (
                            spans.length > 0 &&
                            spans.every((span) => Number(getComputedStyle(span).opacity) === 1)
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
            .poll(async () => {
                const frame = await sample(output)
                return (
                    frame.arriving.length > 0 &&
                    frame.arriving.every((part) => part.opacity > 0.99 && Math.abs(part.y) < 0.01)
                )
            })
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
                .poll(async () => {
                    const frame = await sample(output)
                    return (
                        frame.arriving.length > 0 &&
                        frame.arriving.every((part) => part.opacity === 1)
                    )
                })
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

// Record only the first arriving word; keep the observer small enough that it
// does not change the stream cadence or animation scheduling.
async function recordTrial(page: Page, preset = 'RiseWords') {
    await page.evaluate((preset) => {
        const state = {
            done: false,
            frames: [] as { opacity: number; y: number; baselineVisible: boolean }[]
        }
        Object.assign(window, { trialFrames: state })
        const record = () => {
            const spans = [...document.querySelectorAll(`[data-testid="${preset}"] span`)]
            const target = spans.find((span) => span.textContent === 'We')
            if (target) {
                const style = getComputedStyle(target)
                state.frames.push({
                    opacity: Number(style.opacity),
                    y: style.transform === 'none' ? 0 : new DOMMatrixReadOnly(style.transform).m42,
                    baselineVisible: spans.slice(0, 5).every((span) => {
                        const old = getComputedStyle(span)
                        return (
                            Number(old.opacity) === 1 &&
                            (old.transform === 'none' ||
                                Math.abs(new DOMMatrixReadOnly(old.transform).m42) < 0.01)
                        )
                    })
                })
            }
            if (!state.done) requestAnimationFrame(record)
        }
        requestAnimationFrame(record)
    }, preset)
}

async function trialFrames(page: Page, done = false) {
    return page.evaluate((done) => {
        const state = (
            window as unknown as {
                trialFrames: {
                    done: boolean
                    frames: { opacity: number; y: number; baselineVisible: boolean }[]
                }
            }
        ).trialFrames
        state.done = done
        return state.frames
    }, done)
}

for (const setting of [
    { name: 'starting settings', lift: 2, liftDuration: 0.14, fadeDuration: 0.24 },
    { name: 'longer fade', lift: 6, liftDuration: 0.14, fadeDuration: 0.5 },
    { name: 'longer lift', lift: 6, liftDuration: 0.5, fadeDuration: 0.14 }
]) {
    test(`custom soft fade/rise: ${setting.name} controls actual motion`, async ({
        page
    }, testInfo) => {
        await page.emulateMedia({ reducedMotion: 'no-preference' })
        const errors = await setup(page, 0.18)
        const trial = page.getByLabel('Custom soft fade/rise trial')
        await expect(trial).not.toBeChecked()
        await expect(page.getByLabel('Lift (pixels)', { exact: true })).toHaveCount(0)
        await trial.check()
        await expect(page.getByLabel('Lift (pixels)', { exact: true })).toHaveValue('2')
        await expect(page.getByLabel('Lift duration (seconds)', { exact: true })).toHaveValue(
            '0.14'
        )
        await expect(page.getByLabel('Fade duration (seconds)', { exact: true })).toHaveValue(
            '0.24'
        )
        await page.getByLabel('Lift (pixels)', { exact: true }).fill(String(setting.lift))
        await page
            .getByLabel('Lift duration (seconds)', { exact: true })
            .fill(String(setting.liftDuration))
        await page
            .getByLabel('Fade duration (seconds)', { exact: true })
            .fill(String(setting.fadeDuration))
        // The global preset duration must not replace the trial's property timings.
        await page.getByLabel('Duration (seconds)', { exact: true }).fill('2')
        const output = page.getByTestId('RiseWords')
        await exactText(output, baseline)
        await recordTrial(page)
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await exactText(output, baseline + first)
        await expect
            .poll(async () => {
                const frames = await trialFrames(page)
                return frames.some(
                    (frame) => frame.opacity > 0 && frame.opacity < 0.99 && frame.y > 0.1
                )
            })
            .toBe(true)
        await expect
            .poll(async () => {
                const frames = await trialFrames(page)
                const last = frames.at(-1)
                return !!last && last.opacity === 1 && Math.abs(last.y) < 0.01
            })
            .toBe(true)
        const frames = await trialFrames(page, true)
        await testInfo.attach('soft-fade-rise-frames', {
            body: JSON.stringify({ setting, frames }),
            contentType: 'application/json'
        })
        expect(
            frames.every(
                (frame) =>
                    frame.baselineVisible && frame.y >= -0.01 && frame.y <= setting.lift + 0.01
            )
        ).toBe(true)
        if (setting.lift === 6)
            expect(Math.max(...frames.map((frame) => frame.y))).toBeGreaterThan(2)
        if (setting.fadeDuration > setting.liftDuration)
            expect(
                frames.some((frame) => frame.y < 0.01 && frame.opacity > 0 && frame.opacity < 0.99)
            ).toBe(true)
        else expect(frames.some((frame) => frame.opacity === 1 && frame.y > 0.1)).toBe(true)
        for (let index = 1; index < frames.length; index++) {
            expect(frames[index].opacity).toBeGreaterThanOrEqual(frames[index - 1].opacity - 0.001)
            expect(frames[index].y).toBeLessThanOrEqual(frames[index - 1].y + 0.01)
        }
        await expect(output.locator('span').filter({ hasText: /^👩‍💻$/ })).toHaveCount(1)
        await expect(output.locator('span').filter({ hasText: /^é$/ })).toHaveCount(1)
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await exactText(output, baseline + first + second)
        await expect
            .poll(async () =>
                (await sample(output)).arriving.every(
                    (part) => part.opacity === 1 && Math.abs(part.y) < 0.01
                )
            )
            .toBe(true)
        expect(errors).toEqual([])
    })
}

for (const mode of ['disabled', 'reduced-motion'] as const) {
    test(`custom soft fade/rise: ${mode} and re-enabling preserve readable text`, async ({
        page
    }) => {
        await page.emulateMedia({
            reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference'
        })
        const errors = await setup(page, 0.18)
        await page.getByLabel('Custom soft fade/rise trial').check()
        if (mode === 'disabled') await page.getByLabel('Disable motion').check()
        const output = page.getByTestId('RiseWords')
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await exactText(output, baseline + first)
        await expect(output.locator('span')).toHaveCount(0)
        if (mode === 'disabled') await page.getByLabel('Disable motion').uncheck()
        else await page.emulateMedia({ reducedMotion: 'no-preference' })
        await expect
            .poll(async () => {
                const frame = await sample(output)
                return (
                    frame.arriving.length > 0 &&
                    [...frame.old, ...frame.arriving].every(
                        (part) => part.opacity === 1 && Math.abs(part.y) < 0.01
                    )
                )
            })
            .toBe(true)
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await exactText(output, baseline + first + second)
        await expect(output.locator('span')).toHaveCount(0)
        expect(errors).toEqual([])
    })
}

test('custom soft fade/rise: partial words retain their active entrance', async ({
    page
}, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const errors = await setup(page, 0.18)
    await page.getByLabel('Custom soft fade/rise trial').check()
    await page.getByLabel('Chunk shape').selectOption('fragment')
    await startRecorder(page)
    await page.getByRole('button', { name: 'Stream / Replay sample' }).click()
    await expect
        .poll(() => page.getByTestId('Plain').textContent(), { timeout: 15000 })
        .toBe(baseline + first + second)
    await expect
        .poll(async () =>
            (await recordedFrames(page)).at(-1)?.pending.every((count) => count === 0)
        )
        .toBe(true)
    const frames = await recordedFrames(page, true)
    await testInfo.attach('trial-partial-word-frames', {
        body: JSON.stringify(frames),
        contentType: 'application/json'
    })
    expect(
        frames.every((frame) => frame.exact && frame.baselineVisible && frame.graphemesIntact)
    ).toBe(true)
    const rise = frames.filter((frame) => frame.targets[1].start === targetOffset)
    expect(rise.every((frame) => frame.targets[1].retained)).toBe(true)
    const unfinished = rise.find((frame) => frame.prefix === baseline + 'We can')!
    const completed = rise.find((frame) => frame.prefix === baseline + "We can't ")!
    expect(unfinished).toBeDefined()
    expect(completed).toBeDefined()
    expect(unfinished.targets[1].text).toBe('can')
    expect(completed.targets[1].text).toBe("can't")
    expect(completed.targets[1].opacity).toBeGreaterThanOrEqual(unfinished.targets[1].opacity)
    expect(completed.targets[1].opacity).toBeLessThan(0.99)
    expect(rise.at(-1)!.targets[1].opacity).toBe(1)
    expect(rise.at(-1)!.targets[1].y).toBeLessThan(0.01)
    expect(errors).toEqual([])
})

test('FadeWords soft fade/rise: independent controls and matching screenshot motion', async ({
    page
}, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const errors = await setup(page, 0.18)
    const fade = page.getByRole('article', { name: 'FadeWords comparison', exact: true })
    const rise = page.getByRole('article', { name: 'RiseWords comparison', exact: true })
    const toggle = page.getByLabel('FadeWords soft lift and fade trial', { exact: true })
    await expect(toggle).not.toBeChecked()
    await expect(fade.getByLabel('Lift (pixels)', { exact: true })).toHaveCount(0)
    await toggle.check()
    await page.getByLabel('Custom soft fade/rise trial', { exact: true }).check()
    for (const [label, fadeDefault, riseDefault] of [
        ['Lift (pixels)', '3', '2'],
        ['Lift duration (seconds)', '0.4', '0.14'],
        ['Fade duration (seconds)', '0.5', '0.24']
    ]) {
        await expect(fade.getByLabel(label, { exact: true })).toHaveValue(fadeDefault)
        await expect(rise.getByLabel(label, { exact: true })).toHaveValue(riseDefault)
        await fade.getByLabel(label, { exact: true }).fill('1')
        await expect(rise.getByLabel(label, { exact: true })).toHaveValue(riseDefault)
        await rise.getByLabel(label, { exact: true }).fill(fadeDefault)
        await expect(fade.getByLabel(label, { exact: true })).toHaveValue('1')
        await fade.getByLabel(label, { exact: true }).fill(fadeDefault)
    }
    await page.getByLabel('Duration (seconds)', { exact: true }).fill('2')
    const output = page.getByTestId('FadeWords')
    await exactText(output, baseline)
    await recordTrial(page, 'FadeWords')
    await startRecorder(page)
    await page.getByRole('button', { name: 'Append passage', exact: true }).click()
    await exactText(output, baseline + first)
    await expect
        .poll(async () =>
            (await trialFrames(page)).some(
                (frame) => frame.opacity > 0 && frame.opacity < 0.99 && frame.y > 0.1
            )
        )
        .toBe(true)
    await expect
        .poll(async () => {
            const last = (await trialFrames(page)).at(-1)
            return !!last && last.opacity === 1 && Math.abs(last.y) < 0.01
        })
        .toBe(true)
    // The recorder follows can (batch index 1), which settles after We.
    await expect
        .poll(async () =>
            (await recordedFrames(page))
                .at(-1)
                ?.targets.slice(0, 2)
                .every((part) => part.opacity === 1 && Math.abs(part.y) < 0.01)
        )
        .toBe(true)
    const frames = await trialFrames(page, true)
    const matching = (await recordedFrames(page, true)).filter(
        (frame) =>
            frame.targets[0].start === targetOffset && frame.targets[1].start === targetOffset
    )
    await testInfo.attach('matching-fade-rise-frames', {
        body: JSON.stringify({ frames, matching }),
        contentType: 'application/json'
    })
    expect(
        frames.every((frame) => frame.baselineVisible && frame.y >= -0.01 && frame.y <= 3.01)
    ).toBe(true)
    expect(
        frames.some((frame) => frame.y < 0.01 && frame.opacity > 0 && frame.opacity < 0.99)
    ).toBe(true)
    expect(
        matching.every((frame) => frame.exact && frame.baselineVisible && frame.graphemesIntact)
    ).toBe(true)
    expect(
        matching.some((frame) =>
            frame.targets
                .slice(0, 2)
                .every(
                    (part) =>
                        part.opacity > 0 && part.opacity < 0.99 && part.y > 0.1 && part.y <= 3.01
                )
        )
    ).toBe(true)
    expect(
        matching
            .at(-1)!
            .targets.slice(0, 2)
            .every((part) => part.opacity === 1 && Math.abs(part.y) < 0.01)
    ).toBe(true)
    for (let index = 1; index < frames.length; index++) {
        expect(frames[index].opacity).toBeGreaterThanOrEqual(frames[index - 1].opacity - 0.001)
        expect(frames[index].y).toBeLessThanOrEqual(frames[index - 1].y + 0.01)
    }
    await page.getByRole('button', { name: 'Append passage', exact: true }).click()
    await exactText(output, baseline + first + second)
    await expect
        .poll(async () =>
            (await sample(output)).arriving.every(
                (part) => part.opacity === 1 && Math.abs(part.y) < 0.01
            )
        )
        .toBe(true)
    // Turning off the consumer trial restores the original FadeWords preset.
    await toggle.uncheck()
    await page.getByLabel('Duration (seconds)', { exact: true }).fill('0.18')
    await page.getByRole('button', { name: 'Reset', exact: true }).click()
    await recordTrial(page, 'FadeWords')
    await page.getByRole('button', { name: 'Append passage', exact: true }).click()
    await expect
        .poll(async () =>
            (await trialFrames(page)).some((frame) => frame.opacity > 0 && frame.opacity < 0.99)
        )
        .toBe(true)
    await expect.poll(async () => (await trialFrames(page)).at(-1)?.opacity).toBe(1)
    expect((await trialFrames(page, true)).every((frame) => Math.abs(frame.y) < 0.01)).toBe(true)
    expect(errors).toEqual([])
})

for (const mode of ['disabled', 'reduced-motion'] as const) {
    test(`FadeWords soft fade/rise: ${mode} and re-enabling preserve readable text`, async ({
        page
    }) => {
        await page.emulateMedia({
            reducedMotion: mode === 'reduced-motion' ? 'reduce' : 'no-preference'
        })
        const errors = await setup(page, 0.18)
        await page.getByLabel('FadeWords soft lift and fade trial', { exact: true }).check()
        if (mode === 'disabled') await page.getByLabel('Disable motion').check()
        const output = page.getByTestId('FadeWords')
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await exactText(output, baseline + first)
        await expect(output.locator('span')).toHaveCount(0)
        if (mode === 'disabled') await page.getByLabel('Disable motion').uncheck()
        else await page.emulateMedia({ reducedMotion: 'no-preference' })
        await expect
            .poll(async () => {
                const frame = await sample(output)
                return (
                    frame.arriving.length > 0 &&
                    [...frame.old, ...frame.arriving].every(
                        (part) => part.opacity === 1 && Math.abs(part.y) < 0.01
                    )
                )
            })
            .toBe(true)
        await page.getByRole('button', { name: 'Append passage', exact: true }).click()
        await page.emulateMedia({ reducedMotion: 'reduce' })
        await exactText(output, baseline + first + second)
        await expect(output.locator('span')).toHaveCount(0)
        expect(errors).toEqual([])
    })
}

test('FadeWords soft fade/rise: partial words retain their active entrance', async ({
    page
}, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    const errors = await setup(page, 0.18)
    await page.getByLabel('FadeWords soft lift and fade trial', { exact: true }).check()
    await page.getByLabel('Chunk shape').selectOption('fragment')
    await startRecorder(page)
    await page.getByRole('button', { name: 'Stream / Replay sample' }).click()
    await expect
        .poll(() => page.getByTestId('Plain').textContent(), { timeout: 15000 })
        .toBe(baseline + first + second)
    await expect
        .poll(async () =>
            (await recordedFrames(page)).at(-1)?.pending.every((count) => count === 0)
        )
        .toBe(true)
    const frames = await recordedFrames(page, true)
    await testInfo.attach('fade-trial-partial-word-frames', {
        body: JSON.stringify(frames),
        contentType: 'application/json'
    })
    expect(
        frames.every((frame) => frame.exact && frame.baselineVisible && frame.graphemesIntact)
    ).toBe(true)
    const fade = frames.filter((frame) => frame.targets[0].start === targetOffset)
    expect(fade.every((frame) => frame.targets[0].retained)).toBe(true)
    const unfinished = fade.find((frame) => frame.prefix === baseline + 'We can')!
    const completed = fade.find((frame) => frame.prefix === baseline + "We can't ")!
    expect(unfinished).toBeDefined()
    expect(completed).toBeDefined()
    expect(unfinished.targets[0].text).toBe('can')
    expect(completed.targets[0].text).toBe("can't")
    expect(completed.targets[0].opacity).toBeGreaterThanOrEqual(unfinished.targets[0].opacity)
    expect(completed.targets[0].opacity).toBeLessThan(0.99)
    expect(fade.some((frame) => frame.targets[0].y > 0.1)).toBe(true)
    expect(fade.at(-1)!.targets[0].opacity).toBe(1)
    expect(fade.at(-1)!.targets[0].y).toBeLessThan(0.01)
    expect(errors).toEqual([])
})
