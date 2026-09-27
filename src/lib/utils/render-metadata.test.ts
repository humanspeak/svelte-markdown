import Slugger from 'github-slugger'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defaultOptions, type Token } from './markdown-parser.js'
import { createRenderMetadata, type RenderMetadata } from './render-metadata.js'

const heading = (text: string): Token =>
    Object.freeze({ type: 'heading', depth: 1, raw: `# ${text}\n`, text })

const prepare = (
    metadata: RenderMetadata,
    tokens: Token[],
    startIndex = 0,
    options = defaultOptions
) => {
    metadata.prepareTokensForRender(tokens, options, {
        source: tokens.map((token) => token.raw).join(''),
        startIndex,
        startOffset: tokens
            .slice(0, startIndex)
            .reduce((offset, token) => offset + token.raw.length, 0)
    })
    return tokens.map((token) => metadata.getPreparedHeadingId(token))
}

const coldIds = (labels: string[]) => {
    const slugger = new Slugger()
    return labels.map((label) => slugger.slug(label))
}

afterEach(() => vi.restoreAllMocks())

describe('heading render metadata', () => {
    it('keeps an unstable duplicate heading at the same suffix on repeated tail passes', () => {
        const metadata = createRenderMetadata()
        const prefix = [heading('foo'), heading('foo')]
        expect(prepare(metadata, prefix)).toEqual(['foo', 'foo-1'])

        for (const text of ['foo', 'foo ', 'foo', 'foo!', 'foo']) {
            const tokens = [...prefix, heading(text)]
            expect(prepare(metadata, tokens, prefix.length)).toEqual(coldIds(['foo', 'foo', text]))
        }
        expect(prepare(metadata, [...prefix, heading('foo')], prefix.length)).toEqual([
            'foo',
            'foo-1',
            'foo-2'
        ])
    })

    it('rewinds collisions that skipped occupied suffixes, including collisions on generated ids', () => {
        const metadata = createRenderMetadata()
        const prefix = [heading('foo'), heading('foo-1'), heading('foo-2')]
        expect(prepare(metadata, [...prefix, heading('foo'), heading('foo-3')])).toEqual([
            'foo',
            'foo-1',
            'foo-2',
            'foo-3',
            'foo-3-1'
        ])

        expect(prepare(metadata, [...prefix, heading('FOO!'), heading('foo')], 3)).toEqual([
            'foo',
            'foo-1',
            'foo-2',
            'foo-3',
            'foo-4'
        ])

        // Remove every collided heading, then grow again from the same boundary.
        prepare(metadata, prefix, 3)
        expect(prepare(metadata, [...prefix, heading('foo-3'), heading('foo')], 3)).toEqual([
            'foo',
            'foo-1',
            'foo-2',
            'foo-3',
            'foo-4'
        ])
    })

    it('rebuilds all ids when options change even if the caller supplies a reusable prefix', () => {
        const metadata = createRenderMetadata()
        const tokens = [heading('foo'), heading('foo'), heading('foo')]
        prepare(metadata, tokens)

        expect(prepare(metadata, tokens, 2, { ...defaultOptions, headerPrefix: 'docs-' })).toEqual([
            'docs-foo',
            'docs-foo-1',
            'docs-foo-2'
        ])
        expect(prepare(metadata, tokens, 2, { ...defaultOptions, headerIds: false })).toEqual([
            undefined,
            undefined,
            undefined
        ])
        expect(prepare(metadata, tokens, 2)).toEqual(['foo', 'foo-1', 'foo-2'])
    })

    it('matches cold slugs through deterministic tail replacements and truncations', () => {
        const metadata = createRenderMetadata()
        const labels = ['foo', 'foo-1', 'foo-2', 'FOO!', '', '💬', '__proto__', 'constructor']
        let seed = 328
        const random = (limit: number) => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
            return seed % limit
        }
        let tokens: Token[] = []
        for (let pass = 0; pass < 150; pass++) {
            const boundary = random(tokens.length + 1)
            const tail = Array.from({ length: random(8) }, () =>
                heading(labels[random(labels.length)])
            )
            tokens = [...tokens.slice(0, boundary), ...tail]
            const texts = tokens.map((token) => (token as Token & { text: string }).text)
            expect(prepare(metadata, tokens, boundary), `pass ${pass}`).toEqual(coldIds(texts))
        }
    })

    it('resets for sourceless tokens, document replacement, and an emptied document', () => {
        const metadata = createRenderMetadata()
        const old = [heading('foo'), heading('foo')]
        prepare(metadata, old)
        metadata.prepareTokensForRender([old[1]], defaultOptions)
        expect(metadata.getPreparedHeadingId(old[1])).toBe('foo')

        const next = [old[1], heading('foo')]
        expect(prepare(metadata, next, 1)).toEqual(['foo', 'foo-1'])
        expect(prepare(metadata, [heading('foo')])).toEqual(['foo'])
        expect(prepare(metadata, [])).toEqual([])
        expect(prepare(metadata, [heading('foo')])).toEqual(['foo'])
    })

    it('keeps heading state isolated between mounted documents', () => {
        const first = createRenderMetadata()
        const second = createRenderMetadata()
        const prefix = [heading('foo'), heading('foo')]
        prepare(first, prefix)
        expect(prepare(second, [heading('foo')])).toEqual(['foo'])
        expect(prepare(first, [...prefix, heading('foo')], 2)).toEqual(['foo', 'foo-1', 'foo-2'])
    })

    it('does not enumerate accumulated slug history quadratically when preparing a long document', () => {
        // Count map-enumeration work, not wall time: copying H accumulated
        // entries after every heading used to visit H*(H+1)/2 properties.
        let enumeratedEntries = 0
        // Saved deliberately, then called with the actual slugger as `this` below.
        // trunk-ignore(eslint/@typescript-eslint/unbound-method)
        const reset = Slugger.prototype.reset
        vi.spyOn(Slugger.prototype, 'reset').mockImplementation(function (this: Slugger) {
            reset.call(this)
            this.occurrences = new Proxy(this.occurrences, {
                ownKeys(target) {
                    const keys = Reflect.ownKeys(target)
                    enumeratedEntries += keys.length
                    return keys
                }
            })
        })

        const count = 256
        const metadata = createRenderMetadata()
        const tokens = Array.from({ length: count }, (_, index) => heading(`section ${index}`))
        expect(prepare(metadata, tokens)).toEqual(tokens.map((_, index) => `section-${index}`))
        expect(enumeratedEntries).toBeLessThanOrEqual(count * 2)

        enumeratedEntries = 0
        const slugSpy = vi.spyOn(Slugger.prototype, 'slug')
        prepare(metadata, [...tokens, heading('tail')], tokens.length)
        expect(slugSpy).toHaveBeenCalledTimes(1)
        expect(enumeratedEntries).toBeLessThanOrEqual(2)
    })
})
