import type { MarkedExtension, TokenizerExtension } from 'marked'
import { describe, expect, it } from 'vitest'
import { markedKatex } from './markedKatex.js'

function getBlockDef(opts?: Parameters<typeof markedKatex>[0]): TokenizerExtension {
    const ext = markedKatex(opts)
    return ext.extensions!.find(
        (e) => (e as TokenizerExtension).name === 'blockKatex'
    )! as TokenizerExtension
}

function getInlineDef(opts?: Parameters<typeof markedKatex>[0]): TokenizerExtension {
    const ext = markedKatex(opts)
    return ext.extensions!.find(
        (e) => (e as TokenizerExtension).name === 'inlineKatex'
    )! as TokenizerExtension
}

describe('markedKatex', () => {
    it('returns an extension with both inline and block tokenizers', () => {
        const ext = markedKatex()
        expect(ext).toBeDefined()
        expect(ext.extensions).toHaveLength(2)
        const names = ext.extensions!.map((e) => (e as TokenizerExtension).name).sort()
        expect(names).toEqual(['blockKatex', 'inlineKatex'])
    })

    it('block extension is level "block", inline is level "inline"', () => {
        expect(getBlockDef().level).toBe('block')
        expect(getInlineDef().level).toBe('inline')
    })

    describe('block start()', () => {
        it('returns the index of \\[', () => {
            const def = getBlockDef()
            expect(def.start!.call({} as never, 'prefix\n\\[\nx\n\\]')).toBe(7)
        })

        it('returns the index of $$', () => {
            const def = getBlockDef()
            expect(def.start!.call({} as never, 'prefix $$\nx\n$$')).toBe(7)
        })

        it('returns the index of \\begin{', () => {
            const def = getBlockDef()
            expect(def.start!.call({} as never, 'prefix \\begin{equation}x\\end{equation}')).toBe(7)
        })

        it('returns the earliest delimiter when multiple are present', () => {
            const def = getBlockDef()
            // \\[ at 7, $$ at 19 — should pick 7
            expect(def.start!.call({} as never, 'prefix \\[\nx\n\\] then $$y$$')).toBe(7)
        })

        it('returns undefined when no delimiter is present', () => {
            const def = getBlockDef()
            expect(def.start!.call({} as never, 'just text')).toBeUndefined()
        })
    })

    describe('block tokenizer()', () => {
        it('matches \\[ ... \\] and produces a block token with displayMode true', () => {
            const def = getBlockDef()
            const src = '\\[\nx = y^2\n\\]'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('blockKatex')
            expect(token!.raw).toBe(src)
            expect(token!.text).toBe('x = y^2')
            expect((token as unknown as { displayMode: boolean }).displayMode).toBe(true)
        })

        it('matches $$ ... $$ block form', () => {
            const def = getBlockDef()
            const src = '$$\nc = \\sqrt{a^2 + b^2}\n$$'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('blockKatex')
            expect(token!.text).toBe('c = \\sqrt{a^2 + b^2}')
            expect((token as unknown as { displayMode: boolean }).displayMode).toBe(true)
        })

        it('matches \\begin{equation}...\\end{equation} and passes the full env to the renderer', () => {
            const def = getBlockDef()
            const src = '\\begin{equation}\nx = 1\n\\end{equation}'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('blockKatex')
            expect(token!.text).toContain('\\begin{equation}')
            expect(token!.text).toContain('\\end{equation}')
            expect((token as unknown as { displayMode: boolean }).displayMode).toBe(true)
        })

        it('matches all five AMS environment names', () => {
            const def = getBlockDef()
            const envs = ['equation', 'align', 'alignat', 'gather', 'CD']
            for (const env of envs) {
                const src = `\\begin{${env}}\nx\n\\end{${env}}`
                const token = def.tokenizer.call({} as never, src, [])
                expect(token, `expected match for ${env}`).toBeDefined()
                expect(token!.text).toContain(`\\begin{${env}}`)
            }
        })

        it('matches all five starred AMS variants', () => {
            const def = getBlockDef()
            const envs = ['equation*', 'align*', 'alignat*', 'gather*', 'CD*']
            for (const env of envs) {
                const src = `\\begin{${env}}\nx\n\\end{${env}}`
                const token = def.tokenizer.call({} as never, src, [])
                expect(token, `expected match for ${env}`).toBeDefined()
                expect(token!.text).toContain(`\\begin{${env}}`)
            }
        })

        it('handles multi-line content inside \\[ \\]', () => {
            const def = getBlockDef()
            const src = '\\[\nx = 1 \\\\\ny = 2\n\\]'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('x = 1 \\\\\ny = 2')
        })

        // LLM output frequently uses single-line $$x$$ instead of the
        // own-line form. Keep both shapes parseable as block math.
        it('matches single-line $$x$$ as block', () => {
            const def = getBlockDef()
            const src = '$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('blockKatex')
            expect(token!.text).toBe('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')
            expect((token as unknown as { displayMode: boolean }).displayMode).toBe(true)
        })

        it('matches single-line \\[x\\] as block', () => {
            const def = getBlockDef()
            const src = '\\[e^{i\\pi} + 1 = 0\\]'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('blockKatex')
            expect(token!.text).toBe('e^{i\\pi} + 1 = 0')
            expect((token as unknown as { displayMode: boolean }).displayMode).toBe(true)
        })

        it('returns undefined for unclosed \\[ block', () => {
            const def = getBlockDef()
            expect(def.tokenizer.call({} as never, '\\[\nx', [])).toBeUndefined()
        })

        it('returns undefined for plain text', () => {
            const def = getBlockDef()
            expect(def.tokenizer.call({} as never, 'no math here', [])).toBeUndefined()
        })

        it('only matches from the start of the string', () => {
            const def = getBlockDef()
            expect(def.tokenizer.call({} as never, 'prefix \\[\nx\n\\]', [])).toBeUndefined()
        })
    })

    describe('inline tokenizer()', () => {
        it('matches \\( ... \\) and produces an inline token with displayMode false', () => {
            const def = getInlineDef()
            const src = '\\(x^2\\)'
            const token = def.tokenizer.call({} as never, src, [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('inlineKatex')
            expect(token!.raw).toBe(src)
            expect(token!.text).toBe('x^2')
            expect((token as unknown as { displayMode: boolean }).displayMode).toBe(false)
        })

        it('does NOT match $...$ by default (singleDollarInline off)', () => {
            const def = getInlineDef()
            expect(def.tokenizer.call({} as never, '$x^2$', [])).toBeUndefined()
        })

        it('does NOT match currency strings like $5,000 by default', () => {
            const def = getInlineDef()
            expect(def.tokenizer.call({} as never, '$5,000', [])).toBeUndefined()
        })

        it('inline start() returns undefined for a $-only string when singleDollarInline is off', () => {
            const def = getInlineDef()
            expect(def.start!.call({} as never, 'cost is $5')).toBeUndefined()
        })

        it('inline start() locates $ when singleDollarInline is on', () => {
            const def = getInlineDef({ singleDollarInline: true })
            expect(def.start!.call({} as never, 'price $5 here')).toBe(6)
        })

        it('matches $...$ when singleDollarInline is true (whitespace-bounded)', () => {
            const def = getInlineDef({ singleDollarInline: true })
            const token = def.tokenizer.call({} as never, '$x + y$ trailing', [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('inlineKatex')
            expect(token!.text).toBe('x + y')
        })

        it('still rejects $5,000-style currency even with singleDollarInline on', () => {
            const def = getInlineDef({ singleDollarInline: true })
            // No closing whitespace-bounded $ -> no match
            expect(def.tokenizer.call({} as never, '$5,000', [])).toBeUndefined()
        })

        it('returns undefined for unclosed \\(', () => {
            const def = getInlineDef()
            expect(def.tokenizer.call({} as never, '\\(x', [])).toBeUndefined()
        })

        it('only matches from the start of the string', () => {
            const def = getInlineDef()
            expect(def.tokenizer.call({} as never, 'prefix \\(x\\)', [])).toBeUndefined()
        })

        // Boundary expansion: closing math followed by a closing
        // bracket / paren / brace should match. Upstream marked-katex-extension
        // omits these from the lookahead, which broke `($e$, $i$, $\pi$, $1$, $0$)`
        // (the trailing `$0$)` failed). We add `)`, `]`, `}` to the boundary class.
        it('matches $...$ followed by ) as boundary', () => {
            const def = getInlineDef({ singleDollarInline: true })
            const token = def.tokenizer.call({} as never, '$0$)', [])
            expect(token).toBeDefined()
            expect(token!.type).toBe('inlineKatex')
            expect(token!.text).toBe('0')
        })

        it('matches $...$ followed by ] as boundary', () => {
            const def = getInlineDef({ singleDollarInline: true })
            const token = def.tokenizer.call({} as never, '$x$]', [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('x')
        })

        it('matches $...$ followed by } as boundary', () => {
            const def = getInlineDef({ singleDollarInline: true })
            const token = def.tokenizer.call({} as never, '$x$}', [])
            expect(token).toBeDefined()
            expect(token!.text).toBe('x')
        })

        // Negative complement to the boundary expansion above: digits and
        // letters after the closing $ must still NOT match. Locks in the
        // currency guard so a future boundary-class edit can't quietly
        // regress `$5,000$` / `$0$42` style content into math.
        it('does not match when a digit follows the closing $', () => {
            const def = getInlineDef({ singleDollarInline: true })
            expect(def.tokenizer.call({} as never, '$0$42', [])).toBeUndefined()
        })
    })

    describe('factory', () => {
        it('returns a new extension object on each call', () => {
            const a = markedKatex()
            const b = markedKatex()
            expect(a).not.toBe(b)
            expect(a.extensions!.map((e) => (e as TokenizerExtension).name).sort()).toEqual(
                b.extensions!.map((e) => (e as TokenizerExtension).name).sort()
            )
        })

        it('accepts an empty options object', () => {
            const ext = markedKatex({})
            expect(ext.extensions).toHaveLength(2)
        })

        // The token-cache hashes resolved options by JSON.stringify, which
        // serializes functions via fn.toString(). Keep this serializable
        // marker so direct cache users can still distinguish KaTeX options.
        it('emits a serializable config marker so the token cache can distinguish options', () => {
            const off = markedKatex({ singleDollarInline: false }) as MarkedExtension & {
                _humanspeakKatexConfig?: string
            }
            const on = markedKatex({ singleDollarInline: true }) as MarkedExtension & {
                _humanspeakKatexConfig?: string
            }
            expect(off._humanspeakKatexConfig).toBeTypeOf('string')
            expect(on._humanspeakKatexConfig).toBeTypeOf('string')
            expect(off._humanspeakKatexConfig).not.toBe(on._humanspeakKatexConfig)
        })

        it('marker survives JSON serialization of the options object', () => {
            // Simulates what the token cache does internally. If the marker
            // doesn't survive JSON.stringify, the cache can't distinguish.
            const a = JSON.stringify(markedKatex({ singleDollarInline: false }))
            const b = JSON.stringify(markedKatex({ singleDollarInline: true }))
            expect(a).not.toBe(b)
        })
    })
})
