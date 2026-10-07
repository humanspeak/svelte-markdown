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
