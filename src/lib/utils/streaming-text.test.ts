import { describe, expect, it, vi } from 'vitest'
import type { StreamingTextMetadata } from '../types.js'
import { segmentText, StreamingTextSegments } from './streaming-text.js'

const metadata = (text: string): StreamingTextMetadata => ({
    epoch: 1,
    leafId: 'leaf',
    renderBatchId: 1,
    provenance: 'exact',
    ranges: Array.from(text, (_, index) => ({
        start: index,
        end: index + 1,
        originId: `origin:${index}`,
        change: 'append',
        batchId: 1,
        revealedBeforeBatch: false
    }))
})
describe('segmentation', () => {
    it.each([
        [[{ text: 'a', start: 1, end: 2 }]],
        [[{ text: 'b', start: 0, end: 1 }]],
        [[]],
        [[{ text: '', start: 0, end: 0 }]]
    ])('rejects invalid custom spans %j', (spans) => {
        expect(() => segmentText('a', 'word', undefined, () => spans)).toThrow(/segmenter/)
    })
    it('reports missing Intl and permits custom segmentation', () => {
        const original = Intl.Segmenter
        vi.stubGlobal('Intl', { ...Intl, Segmenter: undefined })
        expect(() => segmentText('😀')).toThrow(/Intl.Segmenter/)
        expect(
            segmentText('😀', 'grapheme', undefined, (text) => [{ text, start: 0, end: 2 }])
        ).toHaveLength(1)
        vi.unstubAllGlobals()
        expect(Intl.Segmenter).toBe(original)
    })
    it('keeps mounted creation fields, suppresses old remounts, and caches unchanged text', () => {
        const helper = new StreamingTextSegments()
        const first = helper.update('hi', metadata('hi'))[0]
        expect(first.isNew).toBe(true)
        expect(helper.update('hi', metadata('hi'), 'word', undefined, undefined, 2)[0].isNew).toBe(
            true
        )
        expect(helper.counters.segmentationInputUnits).toBe(2)
        expect(
            new StreamingTextSegments().update(
                'hi',
                metadata('hi'),
                'word',
                undefined,
                undefined,
                2
            )[0].isNew
        ).toBe(false)
        expect(helper.update('hi', metadata('hi'), 'grapheme')[0].isNew).toBe(false)
    })
    it('only segments the unstable tail on append', () => {
        const helper = new StreamingTextSegments()
        helper.update('one two ')
        const before = helper.counters.segmentationInputUnits
        helper.update('one two three')
        expect(helper.counters.segmentationInputUnits - before).toBe(6)
    })
})
