/**
 * Streaming parity suite: a streamed parse must equal a one-shot parse of the
 * same cumulative source after EVERY chunk, whatever the chunk boundaries.
 *
 * Tests are bucketed by the mechanism that breaks parity, not by symptom:
 *
 *   A. Offset integrity  — marked consumed source without emitting a token of
 *                          the same length, so tail-window offset arithmetic
 *                          (`sourceLength - raw.length`) lands in the wrong place.
 *   B. Block boundaries  — a block was frozen into the reused prefix while the
 *                          next chunk could still continue or enclose it.
 *   C. Reference scope   — a definition the line-anchored detector cannot see
 *                          changed how earlier references resolve.
 *   D. Fuzz              — seeded random chunk boundaries over a corpus of
 *                          tricky documents; the tripwire for the next rewrite.
 *
 * `red` marks a known failure: the test asserts the CORRECT behavior and is
 * expected to fail until the fix lands. When a fix makes one pass, vitest
 * reports it as a failure ("expected to fail") — switch that test to `it`.
 * `it` tests in this file are guards that pass today and must keep passing.
 *
 * Run with `PARITY_STRICT=1` to see the real failure of every red test.
 */

import type { SvelteMarkdownOptions } from '$lib/types.js'
import type { Token } from '$lib/utils/markdown-parser.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'
import { isSameStableNode, type ReusableStreamingNode } from './streaming-token-reuse.js'

// `PARITY_STRICT=1 pnpm vitest run <this file>` runs the red tests as normal
// tests, so their real failure messages are printed.
const red = process.env.PARITY_STRICT ? it : it.fails

const createOptions = (): SvelteMarkdownOptions => ({ gfm: true })

/** Compact shape of a root token array, for readable failure messages. */
const describeRoots = (tokens: Token[]): string =>
    tokens.map((token) => `${token.type}${JSON.stringify(token.raw)}`).join(' ')

/**
 * Index of the first root that differs between a streamed and a fresh parse,
 * or -1 when every root (and every nested field) is semantically equal.
 */
const firstDivergence = (streamed: Token[], fresh: Token[]): number => {
    const shared = Math.min(streamed.length, fresh.length)
    for (let index = 0; index < shared; index++) {
        const same = isSameStableNode(
            streamed[index] as unknown as ReusableStreamingNode,
            fresh[index] as unknown as ReusableStreamingNode
        )
        if (!same) return index
    }
    return streamed.length === fresh.length ? -1 : shared
}

interface ParityFailure {
    chunkIndex: number
    source: string
    streamed: string
    fresh: string
}

/**
 * Streams `chunks` through one parser and returns the first chunk after which
 * the streamed tokens differ from a one-shot parse, or `undefined`.
 */
const findParityFailure = (chunks: string[]): ParityFailure | undefined => {
    const options = createOptions()
    const parser = new IncrementalParser(options)
    let source = ''
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        source += chunks[chunkIndex]
        const streamed = parser.update(source).tokens
        const fresh = lexAndClean(source, createOptions(), false)
        if (firstDivergence(streamed, fresh) !== -1) {
            return {
                chunkIndex,
                source,
                streamed: describeRoots(streamed),
                fresh: describeRoots(fresh)
            }
        }
    }
    return undefined
}

/** Asserts parity after every chunk, with the diverging state in the message. */
const expectParity = (chunks: string[]): void => {
    const failure = findParityFailure(chunks)
    expect(
        failure,
        failure &&
            `diverged after chunk ${failure.chunkIndex} at ${JSON.stringify(failure.source)}\n` +
                `  streamed: ${failure.streamed}\n  fresh:    ${failure.fresh}`
    ).toBeUndefined()
}

const chunkBy = (source: string, size: number): string[] => {
    const chunks: string[] = []
    for (let index = 0; index < source.length; index += size) {
        chunks.push(source.slice(index, index + size))
    }
    return chunks
}

describe('streaming parity', () => {
    describe('A. offset integrity (marked consumed source without a same-length token)', () => {
        it('CRLF line endings do not drop earlier content', () => {
            // marked normalizes `\r\n` to `\n`, so token raws are shorter than
            // the source span and the reparse offset lands past paragraph `a`.
            expectParity(chunkBy('a\r\n\r\nb', 3))
        })

        it('CRLF prose keeps parity at every chunk size', () => {
            const source = '# Title\r\n\r\nFirst paragraph.\r\n\r\n- one\r\n- two\r\n\r\nLast.\r\n'
            for (const size of [1, 2, 3, 5, 8]) expectParity(chunkBy(source, size))
        })

        it('a lone carriage return split from its line feed keeps parity (guard)', () => {
            expectParity(['first\r', '\n\r', '\nsecond\r\n'])
        })

        it('a duplicate reference definition does not leak its URL as text', () => {
            // marked consumes a duplicate `[label]:` without emitting a token.
            expectParity([
                'See [1] for details.\n\n[1]: https://a.example\n\nSome prose.\n\n',
                '[1]: https://b.exam',
                'ple',
                '\n\nFinal paragraph.\n'
            ])
        })

        it('a duplicate definition streamed character by character keeps parity', () => {
            const head = 'See [a].\n\n[a]: /first\n\nProse.\n\n'
            expectParity([head, ...chunkBy('[a]: /second\n\nEnd.\n', 1)])
        })

        it('tabs inside list items keep parity (guard)', () => {
            expectParity(chunkBy('- a\n\t- nested\n- b\n\nAfter.\n', 4))
        })

        // Plan 007, found by the executor's corpus after the three-iteration
        // limit; present at the plan's base commit too. The roots add up to
        // the source length although two errors are present: CRLF makes a
        // root one character shorter than its span, and marked's blockquote
        // raw gains a line break the source does not have (source
        // `> - q\n` + backtick => raw ends in backtick + `\n`). The sum check passes; the offset is wrong.
        it('two cancelling length errors do not pass the integrity check', () => {
            expectParity(['a\r\n\n> - q\n`', '``'])
            expectParity(['a\r\n\n> - q\n`', '\n'])
            // Plan 008: the reviewer's corpus reproduction, character by character.
            expectParity(chunkBy('\r\n\n\n\n> - list in quote\n> - second\nlazy\n', 1))
        })

        it('a carriage return keeps the tail window off for the rest of the stream (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            const chunks = ['a\r\n\n', 'One.\n\n', 'Two.\n\n', 'Three.\n\n']
            const used: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            expect(used).toEqual([false, false, false, false])
            expectParity(chunks)
        })
    })

    describe('B. block boundaries (a block frozen while it could still grow)', () => {
        it('a loose ordered list stays one list when a boundary splits the marker', () => {
            // After chunk 1 the tokens are `list space paragraph("2")`: the
            // open paragraph hides that the list before the blank line can
            // still continue.
            expectParity(['1. first\n\n2', '. second\n\n3', '. third\n'])
        })

        it('a loose bullet list stays one list when a boundary splits the marker (guard)', () => {
            // A lone `-` already lexes as an empty list item, so the list stays open.
            expectParity(['- first\n\n-', ' second\n\n-', ' third\n'])
        })

        it('a loose ordered list keeps parity at every chunk size', () => {
            const source = '1. first\n\n2. second\n\n3. third\n\nAfter the list.\n'
            for (const size of [1, 2, 3, 4, 7]) expectParity(chunkBy(source, size))
        })

        it('an HTML block with blank lines nests its children', () => {
            // One-shot: a single `html` root whose children include `**b**`.
            // Streamed: `<div>` is frozen as a childless root before `</div>`
            // arrives, leaving three flat siblings.
            expectParity(['<div>\n\n', '**b**\n\n', '</div>\n'])
        })

        it('an HTML block with blank lines keeps parity at every chunk size', () => {
            const source = 'Intro.\n\n<div>\n\n**bold** inside\n\n- item\n\n</div>\n\nAfter.\n'
            for (const size of [1, 3, 5, 9]) expectParity(chunkBy(source, size))
        })

        it('nested HTML blocks with blank lines keep parity', () => {
            const source =
                '<details>\n\n<summary>More</summary>\n\nHidden **text**.\n\n</details>\n\nAfter.\n'
            for (const size of [2, 6, 11]) expectParity(chunkBy(source, size))
        })

        it('a list followed by a real paragraph still closes (guard)', () => {
            expectParity(['- a\n\n', 'A paragraph, not an item.\n\n', 'More.\n'])
        })

        it('a tight list keeps parity at every chunk size (guard)', () => {
            const source = '- one\n- two\n  - nested\n- three\n\nAfter.\n'
            for (const size of [1, 2, 5]) expectParity(chunkBy(source, size))
        })

        it('an opening tag with an unquoted slash-ending attribute still encloses (guard)', () => {
            // `<a href=/x/>` is an opening tag, not a self-closed one.
            expectParity(['<a href=/x/>\n\n', 'link **body**\n\n', '</a>\n\nAfter.\n'])
        })

        it('a void element followed by blank lines does not hold the tail open (guard)', () => {
            expectParity(chunkBy('Intro.\n\n<hr>\n\nMiddle.\n\nEnd.\n', 3))
        })

        it('an HTML block without blank lines keeps parity (guard)', () => {
            expectParity(chunkBy('<div>\n**b**\n</div>\n\nAfter.\n', 4))
        })

        // Plan 005, mechanism 1: a definition frozen before its title line.
        it.each([
            ['double quotes', '"Title"'],
            ['single quotes', "'Title'"],
            ['parentheses', '(Title)']
        ])('a definition keeps its title on the next line (%s)', (_name, title) => {
            expectParity(['[d]: /d\n', `${title}\n`])
            expectParity(['Intro.\n\n[d]: /d\n', title.slice(0, 3), `${title.slice(3)}\n`])
            expectParity(chunkBy(`Intro.\n\n[d]: /d\n${title}\n\nAfter.\n`, 1))
        })

        it('a definition keeps a long title on the next line, streamed character by character', () => {
            expectParity(chunkBy('See [d].\n\n[d]: /d\n"Long title here"\n\nAfter.\n', 1))
        })

        it('a definition keeps an indented title on the next line', () => {
            // With four or more columns the partial title lexes as indented code.
            expectParity(chunkBy('Intro.\n\n[d]: /d\n    "Indented title"\n\nAfter.\n', 1))
            expectParity(chunkBy('Intro.\n\n[d]: /d\n\t(Tab title)\n\nAfter.\n', 2))
        })

        it('a definition followed by prose joins the prefix once another block follows (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            let source = ''
            for (const chunk of ['Intro.\n\n[d]: /d\n', 'Prose line.\n', '\n', 'More.\n']) {
                source += chunk
                parser.update(source)
            }
            // tokens: paragraph, space, def, paragraph, space, paragraph —
            // the definition is in the reused prefix.
            const boundary = (
                parser as unknown as { getTailWindowBoundary: () => { prefixCount: number } }
            ).getTailWindowBoundary()
            expect(boundary.prefixCount).toBeGreaterThanOrEqual(3)
            expectParity(chunkBy('Intro.\n\n[d]: /d\nProse line.\n\nMore.\n', 1))
        })

        // Plan 005, mechanism 2: a block frozen while the stream sits on a
        // whitespace-only line that may still become indentation.
        it('a heading followed by a whitespace-only line keeps parity', () => {
            expectParity(['# Heading one\n ', '   indented\n'])
        })

        it('a definition followed by a whitespace-only line keeps parity', () => {
            expectParity(['[a]: /x\n  ', '  code\n'])
        })

        it('a paragraph followed by a blank then whitespace-only line keeps parity', () => {
            expectParity(['Para.\n\n   ', ' more\n'])
        })

        // Plan 006: HTML blocks of CommonMark types 1–5 are not ended by a
        // blank line; they run to their own terminator (or to the end of the
        // input while unclosed), so they must not be frozen before it.
        it('an HTML comment with a blank line stays one block until it closes', () => {
            expectParity(['<!-- a comment\n\n', 'sp', 'anning -->\n\n', 'After.\n'])
            const source = 'Intro.\n\n<!-- a comment\n\nspanning -->\n\nAfter.\n'
            for (const size of [1, 3, 7]) expectParity(chunkBy(source, size))
            // Indented up to three spaces, and after a closed comment.
            expectParity(chunkBy('Intro.\n\n  <!-- ind\n\nx -->\n\nAfter.\n', 1))
            expectParity(chunkBy('Intro.\n\n<!-- x -->\n<!-- y\n\nz -->\n\nAfter.\n', 1))
        })

        it.each([
            ['pre', '<pre>\nkeep\n\n  this\n</pre>'],
            ['script', '<script>\nlet a = 1\n\nlet b = 2\n</script>'],
            ['style', '<style>\np { color: red }\n\n</style>'],
            ['textarea', '<textarea>\nline one\n\nline two\n</textarea>'],
            // Anchor: a type-1 opener before its `>` has no tag for the
            // tag-based detector.
            ['pre (bracket on a later line)', '<pre\n\nkeep\n</pre>']
        ])('a <%s> block with a blank line keeps parity', (_name, block) => {
            const source = `Intro.\n\n${block}\n\nAfter.\n`
            for (const size of [1, 3, 7]) expectParity(chunkBy(source, size))
        })

        it.each([
            ['a processing instruction', '<?php echo 1;\n\n ?>'],
            // Without the leading space the whitespace-only-line rule (plan
            // 005) does not happen to hold the block, so this one is the anchor.
            ['a processing instruction closed at column 0', '<?php echo 1;\n\n?>'],
            ['a declaration', '<!DOCTYPE html>'],
            ['a declaration with a blank line', '<!DOCTYPE\n\nhtml>'],
            ['a CDATA section', '<![CDATA[ a\n\nb ]]>']
        ])('%s keeps parity', (_name, block) => {
            const source = `Intro.\n\n${block}\n\nAfter.\n`
            for (const size of [1, 3, 7]) expectParity(chunkBy(source, size))
        })

        it('an HTML block split into several roots is not frozen before its end', () => {
            // One marked html block (`<li>x</li>\n<`) becomes two roots after
            // cleanup (`<li>` + text `\n<`); the next chunk still extends that
            // block, and `</u` is absorbed into the `<li>` root's span.
            expectParity(['<li>x</li>\n<', '/u'])
            expectParity(chunkBy('Para <ul>\n<li>html item</li>\n</ul>\n\nAfter.\n', 1))
            expectParity(chunkBy('Intro.\n\n<img src=a>\n<img src=b>\n<i>c</i>\n\nAfter.\n', 1))
        })

        it('a cut inside a split HTML block is never used, whatever held the tail', () => {
            // The whitespace-only-line rule holds only the last piece
            // (`<img b>`) of the block `<img a>\n<img b>`; the tail then lexes
            // it as a block of its own (different fields).
            expectParity(['<img src=a>\n<img src=b>\n\n', '\t', 'Ta'])
        })

        // Plan 006: marked's inline lexer state (`inRawBlock` after an inline
        // `<pre>`/`<code>`/`<kbd>`/`<script>`, `inLink` after `<a `) carries
        // across blocks until the closing tag, so a tail lexed from a fresh
        // state differs while such an inline tag is still open.
        it('an inline raw tag left open in a paragraph keeps later text escaped', () => {
            expectParity(['a <code>\n\n', 'b'])
            expectParity(['Final line<pre>\nkeep\n\n', '  th'])
            // Inside a table cell, a list item and a blockquote.
            expectParity(['| a <code> | b |\n|---|---|\n| c | d |\n\n', 'after'])
            expectParity(['- item <kbd>\n- two\n\n', 'after'])
            expectParity(['> quoted <pre>\n\n', 'after'])
            expectParity(chunkBy('Use <kbd>Ctrl\n\nthen more\n\nand </kbd> done\n\nAfter.\n', 1))
        })

        it('an inline link tag left open in a paragraph keeps later URLs unlinked', () => {
            expectParity(['a <a href="x">link\n\n', 'see https://example.com/x'])
        })

        it('an inline raw tag open around a citing root keeps parity when the definition arrives', () => {
            expectParity(['Open <code>\n\nSee [a].\n\nClose </code>\n\n', '[a]: /x\n'])
        })

        it('an inline raw tag closed in a later paragraph regains the tail window (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            const chunks = ['a <code>\n\n', 'b </code>\n\n', 'One.\n\n', 'Two.\n\n', 'Three.\n\n']
            const used: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            expect(used.slice(-2)).toEqual([true, true])
            expectParity(chunks)
        })

        it('a closed HTML comment regains the tail window (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            const used: boolean[] = []
            let source = ''
            for (const chunk of [
                '<!-- a comment\n\nspanning -->\n\n',
                'One.\n\n',
                'Two.\n\n',
                'Three.\n\n'
            ]) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            expect(used.slice(-2)).toEqual([true, true])
            expectParity([
                '<!-- a comment\n\nspanning -->\n\n',
                'One.\n\n',
                'Two.\n\n',
                'Three.\n\n'
            ])
        })

        it('an HTML comment that never closes keeps parity to the end (guard)', () => {
            const source = 'Intro.\n\n<!-- never closed\n\nstill hidden\n\n# not a heading\n\nEnd'
            for (const size of [1, 4, 9]) expectParity(chunkBy(source, size))
        })

        // Plan 007: a block ADJACENT to the open last block (no blank line
        // between them) can still absorb the next line — a lazy continuation,
        // a setext underline, another list item or table row — so it must not
        // be frozen before a blank line closes it.
        it.each([
            ['an empty ordered item then the next marker', '1.\n2. after empty ordered\n\n'],
            ['an empty bullet item then the next marker', '-\n- after empty item\n\n'],
            ['a hard-break line then a look-alike heading', 'Line\\\n#NotAHeading\n\n'],
            ['a paragraph then a look-alike heading', 'Para\n#NotAHeading\n\n'],
            ['a list item then a look-alike heading', '- item\n#NotAHeading\n\n'],
            ['a blockquote then a look-alike heading', '> quote\n#NotAHeading\n\n'],
            ['a paragraph then a setext underline', 'Paragraph then setext?\n---\n\n'],
            ['a paragraph then a setext H1 underline', 'Title\n===\n\n'],
            [
                'a table then a row without pipes',
                '| a | b |\n|---|---|\n| c | d |\nrow without pipes\n\n'
            ],
            ['a paragraph then two backticks', 'Para\n``\n\n']
        ])('%s keeps parity', (_name, block) => {
            for (const size of [1, 2, 3]) {
                expectParity(chunkBy(block, size))
                expectParity(chunkBy(`Intro.\n\n${block}After.\n`, size))
            }
        })

        it.each([
            ['a heading directly followed by a list', '# Heading\n- one\n- two\n\nAfter.\n'],
            [
                'a closed fence directly followed by a paragraph',
                '```\ncode\n```\nPara right after\n\nAfter.\n'
            ]
        ])('%s keeps parity (guard)', (_name, source) => {
            for (const size of [1, 2, 3]) expectParity(chunkBy(source, size))
        })

        // Plan 007, found by the executor's corpus after the three-iteration
        // limit; present at the plan's base commit too. An unclosed
        // processing instruction or comment runs to the end of the input, but
        // once its block contains a tag, cleanup expands it into roots that no
        // longer carry the unterminated opener (`<?pi\n<li>x</li>\n\n` =>
        // text `x` + space), so the boundary moves past the blank line.
        it('an unclosed HTML construct containing a tag stays open across a blank line', () => {
            expectParity(['<?pi\n<li>x</li>\n', '\n', '['])
            expectParity(['<!--\n<hr>\n', '\n', '!'])
        })

        it('an HTML construct containing a tag regains the tail window once it closes (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            const chunks = [
                '<!--\n<hr>\n',
                '\n',
                '!',
                ' -->\n\n',
                'One.\n\n',
                'Two.\n\n',
                'Three.\n\n'
            ]
            const used: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            expect(used.slice(0, 3)).toEqual([false, false, false])
            expect(used.slice(-2)).toEqual([true, true])
            expectParity(chunks)
            expectParity(chunkBy('<?pi\n<li>x</li>\n\nstill inside ?>\n\nAfter.\n', 1))
        })

        // Found by guard after plan 007 with inputs from upstream
        // Streamdown's tests. For a block-level tag name directly followed
        // by a line break, marked consumes that line break as part of the
        // opener, so the blank line after it does not end the block
        // (`<div\n\ns` => one html root; `<div>\n\ns` => html, space,
        // paragraph). The stream froze `<div` when the blank line arrived.
        it('a tag cut before its closing bracket stays open across a blank line', () => {
            expectParity(['<div\n', '\n', 's'])
            expectParity(chunkBy('Intro.\n\n</div\n\nHeading text\n', 1))
        })

        it('a complete tag followed by a blank line keeps the tail window (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            const chunks = ['<div>x</div>\n\n', 'Prose.\n\n', 'More.\n\n', 'End.\n\n']
            const used: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            expect(used.slice(1)).toEqual([true, true, true])
            expectParity(chunks)
        })

        it('a tag whose closing bracket arrives later regains the tail window (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            const chunks = [
                '<div\n',
                '\n',
                'class="a">\n\n',
                'Inside.\n\n',
                '</div>\n\n',
                'One.\n\n',
                'Two.\n\n'
            ]
            const used: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            expect(used.slice(-2)).toEqual([true, true])
            expectParity(chunks)
        })

        // Found by guard after plan 008 (1 of 8426 documents). marked's
        // `inLink` state is cleared by a bracket link or an image, but NOT by
        // an autolink (`<https://…>`) or a bare GFM URL, which never touch
        // it. After an unclosed `<a>` the state tracker must do the same, or
        // a later bare URL is linked in the stream and plain in a one-shot
        // parse (or the reverse).
        red('inline link state after an unclosed anchor and an autolink matches', () => {
            const first = '<a href="x">open <https://b.example>\n\n'
            expectParity([first, 'https://a.example\n'])
            expectParity([first, 'Text.\n\n', 'https://a.example\n'])
        })

        it.each([
            ['a bare URL', '<a href="x">open https://b.example\n\n'],
            ['an image', '<a href="x">open ![i](/u)\n\n'],
            ['a bracket link', '<a href="x">open [t](/u)\n\n']
        ])('inline link state after an unclosed anchor and %s matches (guard)', (_name, first) => {
            expectParity([first, 'https://a.example\n'])
            expectParity([first, 'Text.\n\n', 'https://a.example\n'])
        })

        it('a long chain of adjacent open blocks refuses the boundary, then regains it (guard)', () => {
            // `> q` and `- l` interrupt each other, so no blank line closes
            // any of them: past the walk's cap the boundary is refused (a full
            // re-lex) instead of scanning further back.
            const chain = '> quote\n- item\n'.repeat(6)
            const parser = new IncrementalParser(createOptions())
            const chunks = [
                'Intro.\n\n',
                chain,
                '> more',
                '\n\n',
                'After.\n\n',
                'Again.\n\n',
                'End.\n'
            ]
            const used: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            // The update after the chain lexes everything; the intro would
            // otherwise be a reusable prefix.
            expect(used[2]).toBe(false)
            expect(used.slice(-2)).toEqual([true, true])
            expectParity(chunks)
            expectParity(chunkBy(`Intro.\n\n${chain}\nAfter.\n`, 3))
        })

        it('a paragraph before a blank line joins the prefix once a heading is followed (guard)', () => {
            const parser = new IncrementalParser(createOptions())
            const chunks = ['Para.\n\n', '# Heading\n', 'After heading.\n', 'More.\n']
            const used: boolean[] = []
            let source = ''
            for (const chunk of chunks) {
                source += chunk
                used.push(parser.update(source).usedTailWindow)
            }
            // paragraph, space, heading, paragraph: the paragraph and the
            // heading are closed and in the reused prefix.
            expect(used.slice(-2)).toEqual([true, true])
            const boundary = (
                parser as unknown as { getTailWindowBoundary: () => { prefixCount: number } }
            ).getTailWindowBoundary()
            expect(boundary.prefixCount).toBe(3)
            expectParity(chunks)
        })
    })

    describe('C. reference scope (definitions the line-anchored detector misses)', () => {
        it('a definition whose URL is on the next line resolves earlier uses', () => {
            expectParity(['See [a].\n\n', '[a]:\n', '/x\n'])
        })

        it('a definition nested in a blockquote resolves earlier uses', () => {
            expectParity(['See [one].\n\n', '> [one]: /in-quote\n'])
        })

        it('a definition nested in a list item resolves earlier uses', () => {
            expectParity(['See [two].\n\n', '- [two]: /in-list\n'])
        })

        it('a definition indented by four or more columns inside a container resolves', () => {
            expectParity(['See [deep].\n\n', '> - item\n>\n>   [deep]: /nested\n'])
        })

        it('a definition title arriving on the following line updates earlier uses', () => {
            // An append that starts with a line break is treated as not touching
            // the definition, so the title never reaches the citing link.
            expectParity(['See [r].\n\n[r]: /a', '\n"Title"\n', '\nAfter.\n'])
        })

        it('a duplicate definition with no earlier use emits no def token', () => {
            // Without seeded links the tail lexer would register `[a]` again
            // and emit a `def` a one-shot parse drops; lengths still add up,
            // so only seeding every tail lex keeps parity here.
            expectParity(['Intro.\n\n[a]: /first\n\nProse.\n\n', '[a]: /second\n', '\nEnd.\n'])
        })

        it('a dropped duplicate definition keeps blank lines split as in a one-shot parse', () => {
            // Plan 005, mechanism 3: the tail's roots do not add up once
            // marked drops the duplicate, so this update must not keep them.
            expectParity(['Intro.\n\n[two]: /2 "Two"\n\n', '[two]: /2 "Two"\n', '\nAfter.\n'])
            // Fuzz document 45: the duplicate is a paragraph until its title
            // closes, then marked drops it and its line break joins the
            // blank line before it (`space "\n\n\n"`, not `"\n\n" + "\n"`).
            expectParity(['Intro.\n\n[two]: /2 "Two"\n\n', '[two]: /2 "T', 'wo"\n', '\nAfter.\n'])
            expectParity(chunkBy('Intro.\n\n[two]: /2 "Two"\n\n[two]: /2 "Two"\n\nAfter.\n', 1))
        })

        it('a duplicate definition with no earlier use keeps parity at every chunk size', () => {
            const source = 'Intro.\n\n[a]: /first\n\nProse.\n\n[a]: /second\n\nEnd.\n'
            for (const size of [1, 3, 7]) expectParity(chunkBy(source, size))
        })

        // Plan 007, found by the executor's corpus: a definition-shaped line
        // that continues a paragraph is paragraph text (a definition cannot
        // interrupt a paragraph), so its `[k]` is a reference use that a
        // later definition must resolve.
        it('a definition-shaped line inside a paragraph is a use a later definition resolves', () => {
            expectParity(['Intro\n[k]: /k\n\n', '[k]: /k\n'])
            expectParity(['Intro\n', '[k]: /k\n\n', 'x\n\n', '[k]: /k\n'])
            expectParity(chunkBy('Intro\n[k]: /k\n\n[k]: /k\n', 1))
            expectParity(chunkBy('- item\n[k]: /k\n\n> q\n[j]: /j\n\n[k]: /k\n[j]: /j\n', 2))
        })

        it('a definition-shaped line marked rejects is a use a later definition resolves', () => {
            // `[k2]:` takes `7.` as its destination, then ` seven` is not a
            // title, so the lines are one paragraph citing `[k2]`.
            expectParity(['Intro.\n\n[k2]:\n7. seven\n\n', '[k2]:\n- '])
            expectParity(['Intro.\n\n[k]: /k junk\n\n', '[k]: /k\n'])
        })

        it('definitions that follow definitions stay definitions (guard)', () => {
            expectParity(chunkBy('See [a].\n\n[a]: /a\n[b]: /b\n\nUses [b].\n\n[b]: /dup\n', 1))
        })

        it('a plain definition after a use resolves (guard)', () => {
            expectParity(chunkBy('See [p] here.\n\n[p]: https://example.com/p\n', 3))
        })
    })

    describe('D. fuzz (seeded random chunk boundaries)', () => {
        /** Deterministic PRNG so every failure is reproducible from its seed. */
        const mulberry32 = (seed: number) => (): number => {
            seed = (seed + 0x6d2b79f5) | 0
            let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
            value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
            return ((value ^ (value >>> 14)) >>> 0) / 4294967296
        }

        const randomChunks = (source: string, random: () => number): string[] => {
            const chunks: string[] = []
            let index = 0
            while (index < source.length) {
                const size = 1 + Math.floor(random() * 9)
                chunks.push(source.slice(index, index + size))
                index += size
            }
            return chunks
        }

        /** Documents that are already parity-clean: these must stay green. */
        const CLEAN_CORPUS: Record<string, string> = {
            prose: '# Title\n\nA paragraph with **bold**, *em*, `code` and a [link](https://x.y).\n\n> A quote.\n\nLast.\n',
            tightLists:
                '- one\n- two\n  - nested a\n  - nested b\n- three\n\n1. a\n2. b\n\nAfter.\n',
            fence: 'Before.\n\n```ts\nconst a = 1\n\nconst b = 2\n```\n\nAfter.\n',
            table: '| a | b |\n|---|:-:|\n| 1 | 2 |\n| 3 | 4 |\n\nAfter.\n',
            references:
                'See [one] and [two][2].\n\nMore [one].\n\n[one]: https://example.com/1\n[2]: https://example.com/2 "Two"\n',
            headings: '# A\n## B\n\n### C\n\n---\n\nText.\n'
        }

        /** Documents covering buckets A–C: red until those fixes land. */
        const TRICKY_CORPUS: Record<string, string> = {
            crlf: '# Title\r\n\r\nParagraph one.\r\n\r\n- a\r\n- b\r\n\r\nEnd.\r\n',
            looseOrdered: '1. first\n\n2. second\n\n3. third\n\nAfter.\n',
            looseBullets: '- first\n\n- second\n\n  continued\n\n- third\n\nAfter.\n',
            htmlBlankLines: 'Intro.\n\n<div>\n\n**b** and *i*\n\n</div>\n\nAfter.\n',
            duplicateDefinition:
                'See [1].\n\n[1]: https://a.example\n\nProse.\n\n[1]: https://b.example\n\nEnd.\n',
            nestedDefinition: 'See [q].\n\n> [q]: /in-quote\n\nEnd.\n',
            multiLineDefinition: 'See [m].\n\n[m]:\n/next-line\n\nEnd.\n'
        }

        const RUNS_PER_DOCUMENT = 40

        const fuzz = (corpus: Record<string, string>): string[] => {
            const failures: string[] = []
            for (const [name, source] of Object.entries(corpus)) {
                for (let seed = 1; seed <= RUNS_PER_DOCUMENT; seed++) {
                    const failure = findParityFailure(randomChunks(source, mulberry32(seed)))
                    if (failure) {
                        failures.push(
                            `${name} seed ${seed}: chunk ${failure.chunkIndex} at ` +
                                `${JSON.stringify(failure.source)}\n    streamed: ${failure.streamed}\n    fresh:    ${failure.fresh}`
                        )
                        break
                    }
                }
            }
            return failures
        }

        it('parity-clean documents stay clean under random chunking (guard)', () => {
            expect(fuzz(CLEAN_CORPUS)).toEqual([])
        })

        it('tricky documents keep parity under random chunking', () => {
            expect(fuzz(TRICKY_CORPUS)).toEqual([])
        })
    })
})
