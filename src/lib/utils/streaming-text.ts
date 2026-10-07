import type {
    StreamingTextChange,
    StreamingTextGranularity,
    StreamingTextMetadata,
    StreamingTextRange,
    StreamingTextSegment,
    StreamingTextSegmenter,
    StreamingTextSpan
} from '../types.js'

const segmenters = new Map<string, Intl.Segmenter>()
export function segmentText(
    text: string,
    granularity: StreamingTextGranularity = 'word',
    locale?: string,
    custom?: StreamingTextSegmenter
): readonly StreamingTextSpan[] {
    let spans: readonly StreamingTextSpan[]
    if (custom) {
        spans = custom(text)
        if (!Array.isArray(spans))
            throw new Error('StreamingText segmenter must return an array of spans')
    } else {
        if (typeof Intl.Segmenter !== 'function') {
            throw new Error(
                'StreamingText requires Intl.Segmenter or a custom segmenter for Unicode segmentation'
            )
        }
        const key = JSON.stringify([locale, granularity])
        let segmenter = segmenters.get(key)
        if (!segmenter) {
            segmenter = new Intl.Segmenter(locale, { granularity })
            segmenters.set(key, segmenter)
        }
        spans = Array.from(segmenter.segment(text), (part) => ({
            text: part.segment,
            start: part.index,
            end: part.index + part.segment.length
        }))
    }
    let cursor = 0
    for (const span of spans) {
        if (
            !Number.isInteger(span.start) ||
            !Number.isInteger(span.end) ||
            span.start !== cursor ||
            span.end <= span.start ||
            span.end > text.length ||
            span.text !== text.slice(span.start, span.end)
        ) {
            throw new Error(
                'StreamingText segmenter must return ordered UTF-16 spans covering the exact text once'
            )
        }
        cursor = span.end
    }
    if (cursor !== text.length) throw new Error('StreamingText segmenter must cover all text')
    return spans
}

function getSegmentId(
    span: StreamingTextSpan,
    anchor: StreamingTextRange | undefined,
    metadata: StreamingTextMetadata | undefined,
    granularity: StreamingTextGranularity,
    locale: string | undefined
): string {
    return `${metadata?.epoch ?? 0}:${granularity}:${locale ?? ''}:${anchor?.originId ?? `${metadata?.leafId ?? 'plain'}:${span.start}`}`
}

function getMappedView(
    occurrence: ProvenanceNode | undefined,
    text: string
): MappedView | undefined {
    if (occurrence?.text?.value === text) return occurrence.text
    if (occurrence?.raw?.value === text) return occurrence.raw
    return undefined
}

function getRangeChange(ranges: readonly StreamingTextRange[]): StreamingTextChange {
    if (ranges.some((range) => range.change === 'revision')) return 'revision'
    if (ranges.some((range) => range.change === 'baseline')) return 'baseline'
    return ranges[0]?.change ?? 'baseline'
}

function isNewSegment(
    ranges: readonly StreamingTextRange[],
    change: StreamingTextChange,
    policyChanged: boolean,
    currentBatch: number | undefined
): boolean {
    return (
        !policyChanged &&
        change === 'append' &&
        ranges.length > 0 &&
        ranges.every((range) => !range.revealedBeforeBatch && range.batchId === currentBatch)
    )
}

/** One reconciler per mounted helper. Creation fields survive updates, never remounts. */
export class StreamingTextSegments {
    private text: string | undefined
    private granularity?: StreamingTextGranularity
    private locale?: string
    private custom?: StreamingTextSegmenter
    private spans: readonly StreamingTextSpan[] = []
    private previous = new Map<string, StreamingTextSegment>()
    readonly counters = { segmentationInputUnits: 0 }

    update(
        text: string,
        metadata?: StreamingTextMetadata,
        granularity: StreamingTextGranularity = 'word',
        locale?: string,
        custom?: StreamingTextSegmenter,
        currentBatch = metadata?.renderBatchId
    ): readonly StreamingTextSegment[] {
        const policyChanged =
            this.granularity !== undefined &&
            (this.granularity !== granularity || this.locale !== locale || this.custom !== custom)
        this.updateSpans(text, granularity, locale, custom, policyChanged)
        const next = new Map<string, StreamingTextSegment>()
        const batches = new Map<number, number>()
        let rangeCursor = 0
        const sourceRanges = metadata?.provenance === 'exact' ? metadata.ranges : []
        const parts = this.spans.map((span, index) => {
            while (rangeCursor < sourceRanges.length && sourceRanges[rangeCursor].end <= span.start)
                rangeCursor++
            const ranges = []
            for (
                let cursor = rangeCursor;
                cursor < sourceRanges.length && sourceRanges[cursor].start < span.end;
                cursor++
            )
                ranges.push(sourceRanges[cursor])
            const part = this.createSegment(
                span,
                index,
                ranges,
                metadata,
                granularity,
                locale,
                policyChanged,
                batches,
                currentBatch
            )
            next.set(part.id, part)
            return part
        })
        this.previous = next
        return parts
    }
    private updateSpans(
        text: string,
        granularity: StreamingTextGranularity,
        locale: string | undefined,
        custom: StreamingTextSegmenter | undefined,
        policyChanged: boolean
    ): void {
        if (this.text !== text || policyChanged || this.granularity === undefined) {
            // Intl boundaries before the final segment remain stable for append-only input.
            const append =
                !policyChanged && !custom && this.text !== undefined && text.startsWith(this.text)
            const tailStart = append ? (this.spans.at(-1)?.start ?? 0) : 0
            this.counters.segmentationInputUnits += text.length - tailStart
            const tail = segmentText(text.slice(tailStart), granularity, locale, custom).map(
                (span) => ({ ...span, start: span.start + tailStart, end: span.end + tailStart })
            )
            this.spans = [...this.spans.filter((span) => span.end <= tailStart), ...tail]
            this.text = text
            this.granularity = granularity
            this.locale = locale
            this.custom = custom
        }
    }

    private createSegment(
        span: StreamingTextSpan,
        index: number,
        ranges: readonly StreamingTextRange[],
        metadata: StreamingTextMetadata | undefined,
        granularity: StreamingTextGranularity,
        locale: string | undefined,
        policyChanged: boolean,
        batches: Map<number, number>,
        currentBatch: number | undefined
    ): StreamingTextSegment {
        const anchor = ranges[0]
        const id = getSegmentId(span, anchor, metadata, granularity, locale)
        const old = policyChanged ? undefined : this.previous.get(id)
        const batchId = old?.batchId ?? anchor?.batchId ?? 0
        const batchIndex = old?.batchIndex ?? batches.get(batchId) ?? 0
        batches.set(batchId, batchIndex + 1)
        const change = getRangeChange(ranges)
        return Object.freeze({
            ...span,
            id,
            index,
            isWhitespace: /^\s+$/u.test(span.text),
            change: old?.change ?? change,
            isNew: old?.isNew ?? isNewSegment(ranges, change, policyChanged, currentBatch),
            batchId,
            batchIndex
        })
    }
}

import type { Token } from './markdown-parser.js'
import type {
    MappedView,
    MappingRun,
    ProvenanceCollector,
    ProvenanceNode
} from './streaming-provenance.js'

interface SourcePiece {
    start: number
    end: number
    piece: number
    offset: number
    change: StreamingTextChange
    batchId: number
}

/** Source positions are identities, not matches of visible strings. Allocated only when opted in. */
export class StreamingTextLedger {
    private source = ''
    private pieces: SourcePiece[] = []
    private nextPiece = 0
    private readonly revealed = new Map<string, number>()
    private readonly metadata = new WeakMap<object, StreamingTextMetadata>()
    private readonly projected = new WeakMap<object, ProvenanceNode>()
    batchId = 0
    readonly counters = { projectedLeaves: 0, projectedUnits: 0, visitedNodes: 0, sourceUnits: 0 }

    readonly epoch: number

    constructor(epoch: number, source = '') {
        this.epoch = epoch
        this.source = source
        this.add(0, source.length, 'baseline')
    }
    private add(start: number, end: number, change: StreamingTextChange): void {
        if (end > start)
            this.pieces.push({
                start,
                end,
                piece: this.nextPiece++,
                offset: 0,
                change,
                batchId: this.batchId
            })
        this.counters.sourceUnits += end - start
    }
    private locate(position: number): SourcePiece | undefined {
        let low = 0,
            high = this.pieces.length - 1
        while (low <= high) {
            const middle = (low + high) >>> 1
            const piece = this.pieces[middle]
            if (position < piece.start) high = middle - 1
            else if (position >= piece.end) low = middle + 1
            else return piece
        }
        return undefined
    }
    private origin(piece: SourcePiece, position: number): string {
        return `${piece.piece}:${piece.offset + position - piece.start}`
    }
    /** Append is proportional to the new input. Patches inspect only their overwritten interval. */
    update(source: string, patch?: { offset: number; value: string }): void {
        if (source === this.source) return
        this.batchId++
        if (!patch) {
            this.add(this.source.length, source.length, 'append')
        } else {
            const oldLength = this.source.length
            const start = patch.offset
            const end = start + patch.value.length
            const retained: SourcePiece[] = []
            for (const piece of this.pieces) {
                if (piece.end <= start || piece.start >= end) retained.push(piece)
                else {
                    if (piece.start < start) retained.push({ ...piece, end: start })
                    if (piece.end > end)
                        retained.push({
                            ...piece,
                            start: end,
                            offset: piece.offset + end - piece.start
                        })
                }
            }
            // Preserve unchanged units at corresponding source positions, including interior repeats.
            for (let position = start; position < Math.min(end, oldLength); position++) {
                const old = this.locate(position)!
                if (source[position] === this.source[position])
                    retained.push({
                        ...old,
                        start: position,
                        end: position + 1,
                        offset: old.offset + position - old.start
                    })
                else this.revealed.delete(this.origin(old, position))
            }
            const changed: SourcePiece[] = []
            let cursor = start
            while (cursor < Math.min(end, oldLength)) {
                if (source[cursor] === this.source[cursor]) {
                    cursor++
                    continue
                }
                const begin = cursor++
                while (cursor < Math.min(end, oldLength) && source[cursor] !== this.source[cursor])
                    cursor++
                changed.push({
                    start: begin,
                    end: cursor,
                    piece: this.nextPiece++,
                    offset: 0,
                    change: 'revision',
                    batchId: this.batchId
                })
            }
            this.pieces = [...retained, ...changed].sort((a, b) => a.start - b.start)
            this.add(oldLength, Math.max(oldLength, start), 'baseline')
            this.add(Math.max(oldLength, start), source.length, 'append')
            this.counters.sourceUnits += patch.value.length
        }
        this.source = source
    }
    get(node: object): StreamingTextMetadata | undefined {
        return this.metadata.get(node)
    }

    prepare(tokens: readonly Token[], collector: ProvenanceCollector, start = 0): void {
        const pending = new Set<string>()
        const visit = (node: object) => {
            const occurrence = collector.get(node)
            if (occurrence && this.projected.get(node) === occurrence) return
            this.counters.visitedNodes++
            if (occurrence) this.projected.set(node, occurrence)
            const token = node as {
                tokens?: object[]
                items?: object[]
                header?: object[]
                rows?: object[][]
                text?: string
                raw?: string
                type?: string
            }
            if (
                !token.tokens &&
                !token.items &&
                !Array.isArray(token.header) &&
                typeof (token.text ?? token.raw) === 'string'
            ) {
                this.project(node, occurrence, token.text ?? token.raw ?? '', pending)
            }
            token.tokens?.forEach(visit)
            token.items?.forEach(visit)
            if (Array.isArray(token.header)) token.header.forEach(visit)
            token.rows?.forEach((row) => row.forEach(visit))
        }
        for (let index = start; index < tokens.length; index++) visit(tokens[index])
        for (const origin of pending)
            if (!this.revealed.has(origin)) this.revealed.set(origin, this.batchId)
    }
    private getContributors(run: MappingRun, output: number): { id: string; piece: SourcePiece }[] {
        const sources =
            run.mode === 'copy'
                ? [
                      {
                          start: run.sources[0].start + output - run.outputStart,
                          end: run.sources[0].start + output - run.outputStart + 1
                      }
                  ]
                : run.sources
        const contributors: { id: string; piece: SourcePiece }[] = []
        for (const span of sources) {
            for (let position = span.start; position < span.end; position++) {
                const piece = this.locate(position)
                if (piece) contributors.push({ id: this.origin(piece, position), piece })
            }
        }
        return contributors
    }

    private projectRange(
        run: MappingRun,
        output: number,
        contributors: readonly { id: string; piece: SourcePiece }[]
    ): StreamingTextRange | undefined {
        const anchor = contributors[0]
        if (!anchor) return undefined
        const change = contributors.some(({ piece }) => piece.change === 'revision')
            ? 'revision'
            : contributors.some(({ piece }) => piece.change === 'baseline')
              ? 'baseline'
              : 'append'
        const revealedBeforeBatch = contributors.some(({ id }) => this.revealed.has(id))
        return Object.freeze({
            start: output,
            end: output + 1,
            originId: `${anchor.id}${run.mode === 'copy' ? '' : `:out:${output - run.outputStart}`}`,
            change,
            batchId: revealedBeforeBatch
                ? Math.min(...contributors.map(({ id }) => this.revealed.get(id) ?? this.batchId))
                : this.batchId,
            revealedBeforeBatch
        })
    }

    private project(
        node: object,
        occurrence: ProvenanceNode | undefined,
        text: string,
        pending: Set<string>
    ): void {
        this.counters.projectedLeaves++
        const view = getMappedView(occurrence, text)
        const ranges: StreamingTextRange[] = []
        if (occurrence?.exact && view) {
            for (const run of view.runs) {
                for (let output = run.outputStart; output < run.outputEnd; output++) {
                    this.counters.projectedUnits++
                    const contributors = this.getContributors(run, output)
                    const range = this.projectRange(run, output, contributors)
                    if (!range) continue
                    ranges.push(range)
                    contributors.forEach(({ id }) => pending.add(id))
                }
            }
        }
        const exact = !!occurrence?.exact && !!view && ranges.length === text.length
        this.metadata.set(
            node,
            Object.freeze({
                epoch: this.epoch,
                leafId: ranges[0]?.originId ?? `unknown:${this.counters.projectedLeaves}`,
                renderBatchId: this.batchId,
                provenance: exact ? 'exact' : 'unknown',
                ranges: Object.freeze(ranges)
            })
        )
    }
}
