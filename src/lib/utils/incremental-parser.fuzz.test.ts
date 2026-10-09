/**
 * Generative streaming parity: random documents assembled from markdown
 * building blocks, streamed with random chunk boundaries, must equal a
 * one-shot parse after EVERY chunk.
 *
 * This complements `incremental-parser.parity.test.ts`, whose cases were
 * written for known failure mechanisms. The blocks here are combined at
 * random, so block PAIRS nobody thought about (a definition followed by its
 * title line, a heading followed by an indented line, a duplicate definition
 * followed by HTML) are exercised too. Everything is seeded: a failure names
 * the document seed and chunking seed that reproduce it.
 *
 * `red` marks a known failure that asserts the CORRECT behavior; run with
 * `PARITY_STRICT=1` to see the real failures. None is red today (plan 007
 * closed the adjacent-block gaps): when a new block exposes a failure, add it
 * here and mark the case `red` until the fix lands.
 */

import type { Token } from '$lib/utils/markdown-parser.js'
import { describe, expect, it } from 'vitest'
import { IncrementalParser } from './incremental-parser.js'
import { lexAndClean } from './parse-and-cache.js'
import { isSameStableNode, type ReusableStreamingNode } from './streaming-token-reuse.js'

const red = process.env.PARITY_STRICT ? it : it.fails

/** Deterministic PRNG so every failure is reproducible from its seeds. */
const mulberry32 = (seed: number) => (): number => {
    seed = (seed + 0x6d2b79f5) | 0
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
}

const describeRoots = (tokens: Token[]): string =>
    tokens.map((token) => `${token.type}${JSON.stringify(token.raw)}`).join(' ')

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

/** Blocks that are parity-clean in every combination tried so far. */
const CORE_BLOCKS = [
    '# Heading one\n\n',
    '## Heading two\n\n',
    'Plain paragraph with **bold** and `code`.\n\n',
    'See [a] and [b][two] and [c].\n\n',
    'Another cite [a], again [c].\n\n',
    '1. first\n\n2. second\n\n3. third\n\n',
    '- one\n- two\n  - nested\n- three\n\n',
    '- loose a\n\n- loose b\n\n  continued here\n\n',
    '10. ten\n11. eleven\n\n',
    '> quote line\n> more\n\n',
    '> [c]: /in-quote\n\n',
    '- [b]: /in-list\n\n',
    '```ts\nconst x = 1\n\nconst y = 2\n```\n\n',
    '| h1 | h2 |\n|---|---|\n| a | b |\n\n',
    '---\n\n',
    '<br>\n\n',
    '<hr>\n\n',
    '<div>\n\n**inside** div\n\n</div>\n\n',
    '<details>\n\n<summary>S</summary>\n\nBody [a].\n\n</details>\n\n',
    '<img src="/x.png" alt="x">\n\n',
    '<span>inline</span> after\n\n',
    '[two]: https://example.com/two "Two"\n\n',
    '[c]:\n/next-line-url\n\n',
    'Line one\r\nLine two\r\n\r\n',
    '2024 was a year.\n\n'
]

/** Blocks that expose the boundary gaps this suite was written to pin. */
const GAP_BLOCKS = [
    // A definition whose title arrives on the following line.
    '[d]: /d\n"Title on next line"\n\n',
    'Uses [d] late.\n\n',
    // A duplicate definition, directly followed by another block.
    '[a]: https://example.com/a\n',
    '[a]: https://dup.example/a\n\n',
    // Blocks without a blank line after them, so the next block follows at once.
    '# Tight heading\n',
    '    indented code\n\n    more code\n\n',
    'Trailing text without newline',
    // Plan 005 additions: block pairs not covered above.
    'Setext heading\n===\n\n',
    'Tight setext\n---\n',
    '| t1 | t2 |\n|---|---|\n| x | y |\nText right after the table\n\n',
    '> quoted\n    indented after the quote\n\n',
    '9. nine\n10. ten\n\n',
    '~~~\ntilde fence\n\n~~~\n\n',
    '<https://example.com/auto>\n\n',
    "[e]: /e\n  'Single title'\n(not a title)\n\n",
    '[f]:\n/f\n(Paren title)\n',
    '[g]: /g\nProse right after a definition\n\n',
    'Lazy paragraph\n    continuation line\n\n',
    '  \n   \n'
]

/**
 * Second-opinion blocks, written by the reviewer after the gap blocks went
 * green: HTML constructs a blank line does not end, container nesting, and
 * inline syntax that spans lines.
 */
const EDGE_BLOCKS = [
    '<!-- a comment\n\nspanning a blank line -->\n\n',
    '<pre>\nkeep\n\n  this\n</pre>\n\n',
    '<script>\nlet a = 1\n\nlet b = 2\n</script>\n\n',
    '<style>\np { color: red }\n\n</style>\n\n',
    '<table>\n<tr><td>\n\n**cell**\n\n</td></tr>\n</table>\n\n',
    '<p align="center">\n  <b>centered</b>\n</p>\n\n',
    '<div><div>\n\nnested **two** deep\n\n</div></div>\n\n',
    '<ul>\n<li>html item</li>\n</ul>\n\n',
    '- [ ] task one\n- [x] task two\n\n',
    '- a\n\n  ```js\n  fenced in item\n  ```\n\n- b\n\n',
    '> - quoted list\n> - second\n>\n> after\n\n',
    '> quote\n\n> separate quote\n\n',
    '> lazy\ncontinuation\n\n',
    '1. one\n   - inner\n   - inner two\n2. two\n\n',
    '* star\n+ plus\n- dash\n\n',
    '1) paren one\n2) paren two\n\n',
    '| Left | Center | Right |\n|:-----|:------:|------:|\n| a | b | c |\n| d | e | f |\n\n',
    '| no | trailing |\n|---|---|\n| row | one |\nparagraph right after table\n\n',
    '### Heading with trailing hashes ###\n\n',
    'Setext H1\n=========\n\nSetext H2\n---------\n\n',
    '***\n\n___\n\n',
    'Hard break at end  \nnext line\\\nthird line\n\n',
    'Escaped \\* star and \\[bracket\\]\n\n',
    '![image](https://example.com/i.png "Img title")\n\n',
    '<https://auto.example.com> and https://bare.example.com\n\n',
    'Inline <br> break and <kbd>Ctrl</kbd> keys\n\n',
    '**bold across\ntwo lines** and *em*\n\n',
    '`code with `` inside`\n\n',
    '[full][ref] and [collapsed][] and [shortcut]\n\n',
    "[ref]: <https://example.com/angle> 'Single'\n[collapsed]: /c\n[shortcut]: /s (Paren)\n\n",
    '[Case]: /case\n\nUses [CASE] and [case].\n\n',
    '~~~\ntilde fence\n~~~\n\n',
    '```\nunclosed fence at end\n\nstill inside',
    '\tTabbed code\n\n',
    'Text\n    not code, lazy\n\n',
    '\n\n\n',
    'Final line',
    // Plan 006 additions: HTML constructs and HTML next to markdown blocks.
    '<details open class="x">\n\n<summary>S</summary>\n\nBody\n\n</details>\n\n',
    '<!-- note -->\n- list after a comment\n- two\n\n',
    '<svg width="10">\n<g>\n\n<circle r="1"/>\n\n</g>\n</svg>\n\n',
    '<video controls>\n<source src="a.mp4" type="video/mp4">\n<source src="a.webm">\n</video>\n\n',
    'Para <span>opened\n\nclosed</span> next\n\n',
    '- item one\n<br>\n- item two\n\n',
    '<?php echo 1;\n\n?>\n\n',
    '<![CDATA[ x\n\ny ]]>\n\n',
    '<!DOCTYPE html>\n\n',
    '<textarea>\nline\n\nline\n</textarea>\n\n',
    '<li>html item</li>\n<li>second</li>\n\n',
    '<img src="a.png">\n<img src="b.png">\n\n',
    // Inline tags that marked's inline lexer state carries across blocks.
    'Use <code>open\n\n',
    'close </code> here\n\n',
    'a <a href="x">link\n\n',
    'end </a> ok https://x.example\n\n',
    '- <!-- in list\n\n  still -->\n\n'
]

/**
 * Third-opinion blocks, written by the reviewer after the edge blocks went
 * green: blocks that follow each other WITHOUT a blank line, empty list
 * items, unterminated inline syntax, and lines that only look like a block
 * start.
 */
const ADJACENT_BLOCKS = [
    '~~struck~~ and ~single~ tilde\n\n',
    'Footnote-like [^1] marker.\n\n[^1]: not enabled, so a definition\n\n',
    'Link with (parens) [x](https://e.com/a_(b)) end\n\n',
    '***bold-italic*** and _under_score_\n\n',
    '| a \\| escaped | b |\n|---|---|\n| `c \\| d` | e |\n\n',
    '# Heading\n- list right after heading\n- second\n\n',
    '- item\n\n      indented code in item\n\n- next\n\n',
    '&amp; &lt; &#35; &copy; entities\n\n',
    '<a href="https://e.com/?a=1&b=2" title="x > y">link</a> text\n\n',
    '<a\nhref="/multi"\n>multi-line tag</a>\n\n',
    'Inline <br/> and <b>**md in html**</b>\n\n',
    '  <div>indented div</div>\n\n',
    '    <div>four-space html is code</div>\n\n',
    '> ```js\n> fenced in quote\n>\n> still\n> ```\n\n',
    '> > nested quote\n> back one\n\n',
    '7. seven\n8. eight\n\n',
    '- first para\n\n  second para in item\n\n- next item\n\n',
    '- ---\n- ***\n\n',
    '-\n- after empty item\n\n',
    '1.\n2. after empty ordered\n\n',
    'Paragraph then setext?\n---\n\n',
    'Paragraph\n***\nafter rule\n\n',
    'Trailing spaces   \n\n',
    '-\tTab after marker\n-\tanother\n\n',
    'Ünïcödé — “quotes” 🎉 日本語\n\n',
    '<details>\n<summary>No blank lines</summary>\nBody\n</details>\n\n',
    '<div\n  class="a"\n  id="b">\n\ncontent\n\n</div>\n\n',
    '</div>\n\n',
    '<unknown-tag>custom</unknown-tag>\n\n',
    '<Component prop="x" />\n\n',
    '<b>unclosed bold\n\nnext paragraph\n\n',
    'text <!-- inline comment --> more\n\n',
    'text <!-- inline\n\nopen comment\n\n',
    '```\n<!-- comment inside fence -->\n```\n\n',
    '`<div>` in code span\n\n',
    '[link\nacross lines](https://e.com)\n\n',
    '![alt\ntext](a.png)\n\n',
    '[unterminated link](https://e.com\n\n',
    '**unterminated bold\n\n',
    '`unterminated code\n\n',
    '$$\nmath-like\n$$\n\n',
    'http://bare.example.com/path?x=1.\n\n',
    'www.example.com and user@example.com\n\n',
    '#NotAHeading\n\n',
    '####### seven hashes\n\n',
    '+ plus list\n\n+ loose plus\n\n',
    '* * *\n\n',
    '_ _ _\n\n',
    '1. a\n1. b\n1. c\n\n',
    '100000000000. too long marker\n\n',
    'Line\\\n',
    '\\\n\n',
    '>\n\n',
    '> \n> quote after empty\n\n',
    '|\n\n',
    '| a |\n\n',
    '| a | b |\n| - |\n\n'
]

/**
 * Fourth-opinion blocks, written by the plan 007 executor to break the
 * adjacency rule: almost none ends in a blank line, so blocks follow each
 * other directly. Partial markers of every kind, every block type directly
 * followed by every other, nested containers three deep, definition-shaped
 * lines that are really paragraph text, and unclosed HTML constructs. The
 * case combines them with the three corpora above.
 */
const EXECUTOR_BLOCKS = [
    // Partial markers: a lone hash, dash, double dash, equals sign,
    // greater-than, pipe, backtick, tilde, digit, digit plus dot, less-than,
    // opening bracket and exclamation mark, and a few longer ones.
    '#\n',
    '-\n',
    '--\n',
    '=\n',
    '>\n',
    '|\n',
    '`\n',
    '~\n',
    '7\n',
    '7.\n',
    '<\n',
    '[\n',
    '!\n',
    '``\n',
    '~~\n',
    '[x\n',
    '![\n',
    '<d\n',
    '1)\n',
    '*\n',
    '+\n',
    '0.\n',
    '10.\n',
    '- \n',
    '+ \n',
    '1.  \n',
    '#\t tab heading\n',
    // Plain and look-alike lines.
    'plain line\n',
    'another plain line\n',
    'hard break  \n',
    'trailing spaces  \n',
    'backslash break\\\n',
    '\\# escaped hash\n',
    '#heading-lookalike\n',
    '1.no-space\n',
    '-no-space\n',
    '1234567890. long\n',
    '   indented three\n',
    '    - not a list\n',
    '`inline` start\n',
    '*emph open\n',
    'emph close*\n',
    '***bold\n',
    '__under\n',
    'end__\n',
    '[link open\n',
    '](/close)\n',
    '<http://auto\n',
    '$ tail\n',
    'no newline at end',
    'x\n\n',
    '\n',
    // Every block type, without a blank line after it.
    '# atx\n',
    '## closed ##\n',
    'setext\n===\n',
    '---  \n',
    ' ===\n',
    '***\n',
    '- - -\n',
    '___\n',
    '- bullet\n',
    '1. ordered\n',
    '2) paren ordered\n',
    '-    five spaces\n',
    '1. a\n   continued\n',
    '- a\n    - nested b\n',
    '- a\n  lazy\n',
    '  - two-space item\n',
    '- [ ]\n',
    '- [x] done\n',
    '* [ ] star task\n',
    '1. [ ] ordered task\n',
    'P\n+ \n-\n',
    '> quoted\n',
    '> > twice quoted\n',
    '>    four in quote\n',
    '> \n',
    '>\n>\n',
    '> [!NOTE]\n',
    // Nested containers three deep.
    '> - > three deep\n',
    '- > 1. three deep\n',
    '1. - > three deep\n',
    // Tables and table-like lines.
    '| p | q |\n|---|---|\n| r | s |\n',
    '| lone header |\n',
    '|---|\n',
    ':---|---:\n',
    'a | b\n',
    '-|-\n',
    '| --- |\n',
    'x | y | z\n--- | --- | ---\n',
    // Fences and indented code, closed and open.
    '```\nfenced\n```\n',
    '~~~js\nopen tilde\n',
    '```\n',
    '```js title="x"\n',
    '````\n',
    '~~~~~~\n',
    '> ```\n',
    '> ~~~\n> in quote fence\n',
    '    indented code\n',
    '\tTab code\n',
    '    \n',
    '    \t\n',
    '  \n',
    '\\\n',
    // HTML next to everything, including unclosed constructs.
    '<div>\n',
    '</div>\n',
    '<!-- c -->\n',
    '<!-- one -->\n<!-- two -->\n<!-- three -->\n',
    '<!--\n',
    '-->\n',
    '<pre>\n',
    '</pre>\n',
    '<br>\n',
    '<span>inline html</span>\n',
    '<custom-el>\n',
    '</custom-el>\n',
    '<a href="/x">\n',
    '<table>\n',
    '<!DOCTYPE x>\n',
    '<?pi\n',
    '?>\n',
    '<img\n',
    'src="a.png">\n',
    // Definitions, definition-shaped paragraph lines, titles and uses.
    '[k]: /k\n',
    '[k2]:\n',
    '/k2-url\n',
    '"a title"\n',
    '(paren title\n',
    'uses [k] and [k2]\n',
    '[ref]: </a b> "t"\n',
    '[ref]\n',
    '[^n]: note\n',
    'Intro line\n[k]: /k\n',
    '[k3]:\n7. not a destination\n',
    '[k]: /k junk after\n',
    '> q\n[k]: /k in quote lazily\n',
    '[r1]: /1\n[r2]: /2\n[r3]: /3\n[r4]: /4\n[r5]: /5\n[r6]: /6\n[r7]: /7\n[r8]: /8\n[r9]: /9\n[r10]: /10\n',
    'cites [r1] [r5] [r10]\n',
    // CRLF next to LF blocks.
    'crlf line\r\n',
    '-\r\n'
]

const CHUNK_LIMITS = [1, 2, 3, 5, 9, 17, 40]

/** Generous: every update is checked against a fresh lex of the whole source. */
const FUZZ_TIMEOUT_MS = 60_000

interface FuzzOptions {
    blocks: string[]
    documents: number
    chunkingsPerDocument: number
    /**
     * Use each block at most once per document. Repeating a definition block
     * creates a duplicate definition, which is a gap case, not a core one.
     */
    unique?: boolean
}

/** Returns one message per failing document (the first diverging update). */
const fuzz = ({ blocks, documents, chunkingsPerDocument, unique }: FuzzOptions): string[] => {
    const failures: string[] = []
    for (let documentSeed = 1; documentSeed <= documents; documentSeed++) {
        const pick = mulberry32(documentSeed * 7919)
        const blockCount = 3 + Math.floor(pick() * 8)
        const available = [...blocks]
        let document = ''
        for (let index = 0; index < blockCount && available.length > 0; index++) {
            const at = Math.floor(pick() * available.length)
            document += available[at]
            if (unique) available.splice(at, 1)
        }

        const failure = findFailure(document, documentSeed, chunkingsPerDocument)
        if (failure) failures.push(failure)
    }
    return failures
}

const findFailure = (
    document: string,
    documentSeed: number,
    chunkingsPerDocument: number
): string | undefined => {
    for (let chunkingSeed = 1; chunkingSeed <= chunkingsPerDocument; chunkingSeed++) {
        const next = mulberry32(documentSeed * 104729 + chunkingSeed)
        const limit = CHUNK_LIMITS[chunkingSeed % CHUNK_LIMITS.length]
        const parser = new IncrementalParser({ gfm: true })
        let source = ''
        let offset = 0
        while (offset < document.length) {
            const size = 1 + Math.floor(next() * limit)
            source += document.slice(offset, offset + size)
            offset += size
            const streamed = parser.update(source).tokens
            const fresh = lexAndClean(source, { gfm: true }, false)
            const at = firstDivergence(streamed, fresh)
            if (at !== -1) {
                return (
                    `document ${documentSeed}, chunking ${chunkingSeed}, source ends ` +
                    `${JSON.stringify(source.slice(-40))}\n` +
                    `    streamed: ${describeRoots(streamed.slice(at, at + 3))}\n` +
                    `    fresh:    ${describeRoots(fresh.slice(at, at + 3))}`
                )
            }
        }
    }
    return undefined
}

describe('generative streaming parity', () => {
    it(
        'documents built from core blocks keep parity (guard)',
        () => {
            const failures = fuzz({
                blocks: CORE_BLOCKS,
                documents: 80,
                chunkingsPerDocument: 8,
                unique: true
            })
            expect(failures).toEqual([])
        },
        FUZZ_TIMEOUT_MS
    )

    it(
        'documents with repeated and boundary-gap blocks keep parity',
        () => {
            const blocks = [...CORE_BLOCKS, ...GAP_BLOCKS]
            expect(fuzz({ blocks, documents: 80, chunkingsPerDocument: 8 })).toEqual([])
        },
        FUZZ_TIMEOUT_MS
    )

    it(
        'documents with HTML and edge blocks keep parity',
        () => {
            const failures = fuzz({ blocks: EDGE_BLOCKS, documents: 100, chunkingsPerDocument: 8 })
            expect(failures).toEqual([])
        },
        FUZZ_TIMEOUT_MS
    )

    it(
        'documents with adjacent and look-alike blocks keep parity',
        () => {
            const failures = fuzz({
                blocks: ADJACENT_BLOCKS,
                documents: 120,
                chunkingsPerDocument: 8
            })
            expect(failures).toEqual([])
        },
        FUZZ_TIMEOUT_MS
    )

    it(
        'documents with executor-written adversarial blocks keep parity',
        () => {
            // The executor's blocks twice, so they dominate, combined with
            // every block of the three corpora above.
            const blocks = [
                ...EXECUTOR_BLOCKS,
                ...EXECUTOR_BLOCKS,
                ...CORE_BLOCKS,
                ...GAP_BLOCKS,
                ...EDGE_BLOCKS,
                ...ADJACENT_BLOCKS
            ]
            expect(fuzz({ blocks, documents: 200, chunkingsPerDocument: 8 })).toEqual([])
        },
        FUZZ_TIMEOUT_MS
    )
})
