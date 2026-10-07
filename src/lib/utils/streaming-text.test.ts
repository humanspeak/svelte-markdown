import { Tokenizer } from 'marked'
import { describe, expect, it, vi } from 'vitest'
import type { StreamingTextMetadata } from '../types.js'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'
import { ProvenanceCollector } from './streaming-provenance.js'
import { segmentText, StreamingTextLedger, StreamingTextSegments } from './streaming-text.js'

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
    it('caches unchanged leaves but resegments changed words with full context', () => {
        const helper = new StreamingTextSegments()
        helper.update('one two ')
        const before = helper.counters.segmentationInputUnits
        helper.update('one two three')
        expect(helper.counters.segmentationInputUnits - before).toBe(13)
    })
})

describe('incremental Unicode boundary parity', () => {
    it.each([
        ["can't", 'word', 'en'],
        ['l’homme déjà', 'word', 'fr'],
        ['你好世界，こんにちは', 'word', 'zh'],
        ['ภาษาไทยทดสอบ', 'word', 'th'],
        ['👩‍💻 é 🇺🇸🇨🇦', 'grapheme', 'en'],
        ['a\r\nb', 'grapheme', 'en']
    ] as const)(
        'matches one-shot segmentation at every split of %s',
        (text, granularity, locale) => {
            const expected = segmentText(text, granularity, locale)
            for (let split = 0; split <= text.length; split++) {
                const helper = new StreamingTextSegments()
                helper.update(text.slice(0, split), undefined, granularity, locale)
                expect(
                    helper
                        .update(text, undefined, granularity, locale)
                        .map(({ text, start, end }) => ({ text, start, end }))
                ).toEqual(expected)
            }
        }
    )
    it('retains the unfinished word id when apostrophe punctuation joins it', () => {
        const helper = new StreamingTextSegments()
        const first = helper.update("can'", undefined, 'word', 'en')[0]
        const next = helper.update("can't", undefined, 'word', 'en')
        expect(next.map((part) => part.text)).toEqual(["can't"])
        expect(next[0].id).toBe(first.id)
        expect(Object.isFrozen(next[0])).toBe(true)
    })
})

describe('source arrival ledger', () => {
    const project = (ledger: StreamingTextLedger, source: string) => {
        const collector = new ProvenanceCollector()
        const tokens = lexAndClean(source, { gfm: true }, false, undefined, collector)
        ledger.prepare(tokens, collector)
        const leaf = (tokens[0] as { tokens: object[] }).tokens[0]
        return ledger.get(leaf)!
    }
    it('freezes every public metadata layer and avoids bookkeeping on repeated reads', () => {
        const ledger = new StreamingTextLedger(7, 'old')
        const metadata = project(ledger, 'old')
        expect(metadata).toMatchObject({ epoch: 7, provenance: 'exact', renderBatchId: 0 })
        expect(metadata.ranges.map((range) => range.change)).toEqual([
            'baseline',
            'baseline',
            'baseline'
        ])
        expect(Object.isFrozen(metadata)).toBe(true)
        expect(Object.isFrozen(metadata.ranges)).toBe(true)
        expect(metadata.ranges.every(Object.isFrozen)).toBe(true)
        const before = { ...ledger.counters }
        ledger.update('old')
        expect(ledger.counters).toEqual(before)
        expect(ledger.batchId).toBe(0)
    })
    it('classifies patches by source positions, retains prefix/suffix and clears removed identities on reset', () => {
        const ledger = new StreamingTextLedger(1, 'same same')
        const before = project(ledger, 'same same')
        ledger.update('same tame', { offset: 5, value: 't' })
        const after = project(ledger, 'same tame')
        expect(after.ranges[0].originId).toBe(before.ranges[0].originId)
        expect(after.ranges[6].originId).toBe(before.ranges[6].originId)
        expect(after.ranges[5].change).toBe('revision')
        expect(after.ranges[5].revealedBeforeBatch).toBe(false)
        expect(after.ranges[5].originId).not.toBe(before.ranges[5].originId)
        const fresh = project(new StreamingTextLedger(2, 'same'), 'same')
        expect(fresh.epoch).not.toBe(after.epoch)
        expect(fresh.ranges.every((range) => range.change === 'baseline')).toBe(true)
    })
    it('suppresses unknown custom tokenizer provenance without losing output', () => {
        const ledger = new StreamingTextLedger(1)
        ledger.update('new')
        const collector = new ProvenanceCollector()
        const tokenizer = new Tokenizer()
        tokenizer.inlineText = (src) => ({ type: 'text', raw: src, text: src, escaped: false })
        const tokens = lexAndClean('new', { gfm: true, tokenizer }, false, undefined, collector)
        ledger.prepare(tokens, collector)
        const leaf = (tokens[0] as { tokens: object[] }).tokens[0]
        const metadata = ledger.get(leaf)!
        expect(metadata.provenance).toBe('unknown')
        expect(
            new StreamingTextSegments().update('new', metadata).every((part) => !part.isNew)
        ).toBe(true)
    })
    it('projects and segments only changed leaves after a completed history', () => {
        const prefix = Array.from({ length: 40 }, (_, i) => `# fixed **word** ${i}\n\n`).join('')
        const collector = new ProvenanceCollector()
        const parser = new IncrementalParser({ gfm: true }, collector)
        const ledger = new StreamingTextLedger(1, prefix + 'tail')
        const initial = parser.update(prefix + 'tail')
        ledger.prepare(initial.tokens, collector)
        const before = { ...ledger.counters }
        ledger.update(prefix + 'tail next')
        const next = parser.update(prefix + 'tail next')
        ledger.prepare(next.tokens, collector, next.divergeAt)
        expect(next.usedTailWindow).toBe(true)
        expect(ledger.counters.projectedLeaves - before.projectedLeaves).toBe(1)
        expect(ledger.counters.projectedUnits - before.projectedUnits).toBe(9)
        expect(ledger.counters.visitedNodes - before.visitedNodes).toBe(2)
        const stable = new StreamingTextSegments()
        stable.update('fixed word')
        const units = stable.counters.segmentationInputUnits
        stable.update('fixed word')
        expect(stable.counters.segmentationInputUnits).toBe(units)
        const projected = { ...ledger.counters }
        ledger.prepare(next.tokens, collector)
        expect(ledger.counters).toEqual(projected)
    })
})
