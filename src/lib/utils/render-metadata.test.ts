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

describe('streaming re-walk of a diverged open list (plan 010, H3)', () => {
    const textToken = (text: string): Token => ({
        type: 'text',
        raw: text,
        text,
        tokens: [{ type: 'text', raw: text, text }]
    })
    const listItem = (text: string, children: Token[] = [textToken(text)]): Token => ({
        type: 'list_item',
        raw: `- ${text}\n`,
        task: false,
        loose: false,
        text,
        tokens: children
    })
    const list = (items: Token[]): Token => ({
        type: 'list',
        raw: items.map((item) => item.raw).join(''),
        ordered: false,
        start: '',
        loose: false,
        items
    })
    const prepareRoot = (metadata: RenderMetadata, root: Token) =>
        metadata.prepareTokensForRender([root], defaultOptions, {
            source: root.raw,
            startIndex: 0,
            startOffset: 0
        })
    const countSourceKeyWrites = () => {
        // Saved deliberately, then called with the actual map as `this`.
        // trunk-ignore(eslint/@typescript-eslint/unbound-method)
        const set = WeakMap.prototype.set
        const writes = { count: 0 }
        vi.spyOn(WeakMap.prototype, 'set').mockImplementation(function (
            this: WeakMap<WeakKey, unknown>,
            key: WeakKey,
            value: unknown
        ) {
            if (typeof value === 'string' && value.startsWith('src:')) writes.count++
            return set.call(this, key, value)
        })
        return writes
    }

    it('re-keys only the grown item when 199 of 200 items are reused', () => {
        const metadata = createRenderMetadata()
        const items = Array.from({ length: 200 }, (_, index) => listItem(`Item ${index}`))
        prepareRoot(metadata, list(items))
        const keysBefore = items.map((item, index) => metadata.getStableNodeKey(item, index))

        const grown = listItem('Item 199 grows')
        const next = [...items.slice(0, 199), grown]
        const writes = countSourceKeyWrites()
        prepareRoot(metadata, list(next))

        // The new list object, the grown item, its text token and that
        // token's inline child. Re-keying every reused item would be ~800.
        expect(writes.count).toBeLessThanOrEqual(4)
        expect(next.map((item, index) => metadata.getStableNodeKey(item, index))).toEqual(
            keysBefore
        )
        const grownText = (grown as { tokens: Token[] }).tokens[0]
        const grownOffset = items
            .slice(0, 199)
            .reduce((offset, item) => offset + item.raw.length, 0)
        expect(metadata.getStableNodeKey(grownText, 0)).toBe(`src:${grownOffset}`)
    })

    it('re-keys reused items whose offset shifted after an earlier sibling grew', () => {
        const metadata = createRenderMetadata()
        const items = Array.from({ length: 5 }, (_, index) => listItem(`Item ${index}`))
        prepareRoot(metadata, list(items))

        const grown = listItem('Item 0 grows')
        const next = [grown, ...items.slice(1)]
        prepareRoot(metadata, list(next))
        const fresh = createRenderMetadata()
        prepareRoot(fresh, list(next))

        const keys = (meta: RenderMetadata) =>
            next.flatMap((item, index) => [
                meta.getStableNodeKey(item, index),
                meta.getStableNodeKey((item as { tokens: Token[] }).tokens[0], 0)
            ])
        expect(keys(metadata)).toEqual(keys(fresh))
    })

    it('does not descend into reused heading-free items on a streaming pass', () => {
        const metadata = createRenderMetadata()
        let tokenReads = 0
        const counted = (item: Token): Token =>
            new Proxy(item, {
                get(target, property, receiver) {
                    if (property === 'tokens') tokenReads++
                    return Reflect.get(target, property, receiver) as unknown
                }
            })
        const items = Array.from({ length: 50 }, (_, index) => counted(listItem(`Item ${index}`)))
        prepareRoot(metadata, list(items))

        tokenReads = 0
        prepareRoot(metadata, list([...items.slice(0, 49), listItem('Item 49 grows')]))
        expect(tokenReads).toBe(0)
    })

    it('still re-prepares heading ids nested in reused items after a rewind', () => {
        const metadata = createRenderMetadata()
        const withHeading = (index: number) => listItem(`Item ${index}`, [heading('foo')])
        const items = Array.from({ length: 4 }, (_, index) => withHeading(index))
        const idsOf = (listItems: Token[]) =>
            listItems.map((item) =>
                metadata.getPreparedHeadingId((item as { tokens: Token[] }).tokens[0])
            )

        const headingPrefix = heading('foo')
        const prepareDoc = (root: Token, startIndex: number) =>
            metadata.prepareTokensForRender([headingPrefix, root], defaultOptions, {
                source: `${headingPrefix.raw}${root.raw}`,
                startIndex,
                startOffset: startIndex === 0 ? 0 : headingPrefix.raw.length
            })
        prepareDoc(list(items), 0)
        expect(idsOf(items)).toEqual(['foo-1', 'foo-2', 'foo-3', 'foo-4'])

        for (let pass = 0; pass < 3; pass++) {
            const next = [...items.slice(0, 3), listItem(`Item 3 pass ${pass}`, [heading('foo')])]
            prepareDoc(list(next), 1)
            expect(metadata.getPreparedHeadingId(headingPrefix)).toBe('foo')
            expect(idsOf(next)).toEqual(['foo-1', 'foo-2', 'foo-3', 'foo-4'])
        }
    })
})
