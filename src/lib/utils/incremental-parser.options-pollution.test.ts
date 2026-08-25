import type { SvelteMarkdownOptions } from '$lib/types.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'

/**
 * marked's Lexer writes its default tokenizer back onto the options object it
 * receives. If that mutation leaks to caller-held options, any
 * IncrementalParser constructed afterwards from the same object sees
 * `options.tokenizer != null` and silently disables the tail window — every
 * parser rebuild (resetStream, streamId change) then falls back to a full
 * re-lex per chunk. `lexAndClean` guards this by lexing a shallow copy.
 */
describe('parser options are not polluted by marked', () => {
    const createOptions = (): SvelteMarkdownOptions => ({ gfm: true })

    it('lexAndClean does not mutate the options object', () => {
        const options = createOptions()

        lexAndClean('# Hello\n\nWorld', options, false)

        expect(options.tokenizer).toBeUndefined()
        expect(options.renderer).toBeUndefined()
    })

    it('keeps the tail window enabled for a parser rebuilt from the same options object', () => {
        const options = createOptions()

        // First parser lexes with these options — previously this installed
        // marked's tokenizer onto them.
        const first = new IncrementalParser(options)
        first.update('# Hello\n\nWorld')

        // A rebuilt parser (resetStream / streamId change reuses the same
        // combinedOptions object) must still get the tail-window fast path.
        const second = new IncrementalParser(options)
        second.update('# Hello\n\n')
        const result = second.update('# Hello\n\nWorld')

        expect(result.usedTailWindow).toBe(true)
    })
})
