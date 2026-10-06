import { Marked } from 'marked'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { parse } from 'svelte/compiler'

/**
 * Literal Markdown ranges (code, definitions, images, link destinations and
 * autolinks) as UTF-16 offsets, sorted by start.
 *
 * @param {string} text
 */
function markdownLiteralRanges(text) {
    /** @type {{ start: number, end: number }[]} */
    const ranges = []
    /** @param {import('mdast').Root | import('mdast').RootContent} node */
    function visit(node) {
        const start = node.position?.start.offset
        const end = node.position?.end.offset
        if (start === undefined || end === undefined) return
        if (['code', 'inlineCode', 'definition', 'image'].includes(node.type)) {
            ranges.push({ start, end })
            return
        }
        if (node.type === 'link') {
            if (text[start] === '<') {
                ranges.push({ start, end })
                return
            }
            const labelEnd = node.children.at(-1)?.position?.end.offset
            if (labelEnd !== undefined) ranges.push({ start: labelEnd, end })
        }
        if ('children' in node) node.children.forEach(visit)
    }
    visit(fromMarkdown(text))
    return ranges.sort((a, b) => a.start - b.start)
}

const regexKeywords = new Set([
    'return',
    'typeof',
    'instanceof',
    'in',
    'of',
    'new',
    'delete',
    'void',
    'throw',
    'case',
    'do',
    'else',
    'yield',
    'await'
])

/**
 * End offset of a quoted JavaScript string or regular expression starting at
 * `start`, or -1 when it is unterminated on its line.
 *
 * @param {string} text
 * @param {number} start
 */
function skipQuoted(text, start) {
    const quote = text[start]
    let inClass = false
    for (let index = start + 1; index < text.length; index++) {
        const character = text[index]
        if (character === '\\') index++
        else if (character === '\n') return -1
        else if (quote === '/' && character === '[') inClass = true
        else if (quote === '/' && character === ']') inClass = false
        else if (character === quote && !inClass) return index + 1
    }
    return -1
}

/** @typedef {{ index: number, closers: string[], regexAllowed: boolean }} ScanState */

/**
 * End offset of a JavaScript comment at `index`, -1 when unterminated, or
 * undefined when no comment starts there.
 *
 * @param {string} text
 * @param {number} index
 */
function skipComment(text, index) {
    if (text[index] !== '/') return undefined
    if (text[index + 1] === '/') return text.indexOf('\n', index)
    if (text[index + 1] !== '*') return undefined
    const close = text.indexOf('*/', index + 2)
    return close === -1 ? -1 : close + 2
}

/**
 * Advance through template literal text, entering `${` interpolations.
 *
 * @param {string} text
 * @param {ScanState} state
 */
function stepTemplate(text, state) {
    const character = text[state.index]
    if (character === '`') {
        state.closers.pop()
        state.regexAllowed = false
    } else if (character === '$' && text[state.index + 1] === '{') {
        state.closers.push('}')
        state.regexAllowed = true
        state.index++
    } else if (character === '\\') state.index++
    state.index++
}

/**
 * Advance one JavaScript token: comment, string, regular expression, word or
 * punctuator. Regular expressions follow the usual previous-token heuristic.
 *
 * @param {string} text
 * @param {ScanState} state
 */
function stepCode(text, state) {
    const character = text[state.index]
    const comment = skipComment(text, state.index)
    if (comment !== undefined) {
        state.index = comment
        return
    }
    if (character === '"' || character === "'" || (character === '/' && state.regexAllowed)) {
        state.index = skipQuoted(text, state.index)
        state.regexAllowed = false
        return
    }
    const word = /^[\p{ID_Continue}$]+/u.exec(text.slice(state.index, state.index + 64))?.[0]
    if (word) {
        state.regexAllowed = regexKeywords.has(word)
        state.index += word.length
        return
    }
    state.index++
    if (/\s/.test(character)) return
    // Postfix and prefix updates leave the operand/operator state unchanged.
    if ('+-'.includes(character) && text[state.index] === character) {
        state.index++
        return
    }
    state.regexAllowed = !')]}'.includes(character)
    if (character === '`') state.closers.push('`')
    else if (character === '{') state.closers.push('}')
    else if (character === '}') state.closers.pop()
}

/**
 * End offset of the Svelte expression or block tag opened by `{` at `open`.
 * JavaScript strings, comments, template literals with nested interpolation,
 * regular expressions and braces are skipped lexically. Returns -1 when the
 * expression is unterminated so the Svelte parser can report it. Block markers
 * (`{#`, `{:`, `{@`, `{/`) only exist in markup, not attribute values.
 *
 * @param {string} text
 * @param {number} open
 * @param {boolean} [markup]
 */
function scanExpression(text, open, markup = true) {
    let index = open + 1
    if (markup && text[index] === '/') {
        const close = text.indexOf('}', index)
        return close === -1 ? -1 : close + 1
    }
    if (markup && '#:@'.includes(text[index])) index++
    /** @type {ScanState} */
    const state = { index, closers: ['}'], regexAllowed: true }
    while (state.index !== -1 && state.index < text.length) {
        if (state.closers.at(-1) === '`') stepTemplate(text, state)
        else stepCode(text, state)
        if (state.closers.length === 0) return state.index
    }
    return -1
}

/**
 * End offset of a Svelte start tag (including attribute expressions and
 * quoted values containing expressions) or comment opened at `open`, or -1.
 *
 * @param {string} text
 * @param {number} open
 */
function scanTag(text, open) {
    if (text.startsWith('<!--', open)) {
        const close = text.indexOf('-->', open + 4)
        return close === -1 ? -1 : close + 3
    }
    let index = open + 1
    let quote = ''
    while (index < text.length) {
        const character = text[index]
        if (character === '{') {
            index = scanExpression(text, index, false)
            if (index === -1) return -1
        } else if (quote) {
            if (character === quote) quote = ''
            index++
        } else if (character === '"' || character === "'") {
            quote = character
            index++
        } else if (character === '>') return index + 1
        else index++
    }
    return -1
}

/**
 * Mask an escaped `{`, `}`, `<` or `>` after the backslash run at `index`.
 * Odd parity escapes the next character; even parity is literal backslashes.
 * Returns the offset of the last character handled.
 *
 * @param {string} body
 * @param {number} index
 * @param {number} limit
 * @param {string[]} characters
 */
function maskEscape(body, index, limit, characters) {
    let run = index
    while (body[run] === '\\') run++
    if ((run - index) % 2 === 0 || run >= limit || !'{}<>'.includes(body[run])) return run - 1
    characters[run] = ' '
    return run
}

/**
 * First complete Svelte expression, start tag or comment in [cursor, limit),
 * masking Markdown escapes passed along the way.
 *
 * @param {string} body
 * @param {number} cursor
 * @param {number} limit
 * @param {string[]} characters
 */
function findSvelteRegion(body, cursor, limit, characters) {
    for (let index = cursor; index < limit; index++) {
        if (body[index] === '\\') {
            index = maskEscape(body, index, limit, characters)
            continue
        }
        let end = -1
        if (body[index] === '{') end = scanExpression(body, index)
        else if (/^<(?:[A-Za-z]|!--)/.test(body.slice(index, index + 4))) end = scanTag(body, index)
        if (end !== -1) return { start: index, end }
    }
    return undefined
}

/**
 * Identify literal Markdown regions before asking Svelte's parser to recognize
 * template nodes. Source offsets stay unchanged, including UTF-16 characters.
 *
 * Scanning runs left to right; whichever begins first wins: a Markdown literal
 * (ties go to Markdown) or an unescaped Svelte `{` expression or `<` tag. A
 * Svelte region ends by JavaScript lexical rules, so backticks, quotes and
 * comments inside it never pair with Markdown code spans. When a region
 * overlaps CommonMark's pairing, the remaining literals are recomputed with
 * that region neutralized. Escapes follow backslash parity outside regions.
 *
 * @param {string} body
 */
function maskMarkdownLiterals(body) {
    const characters = body.split('')
    let neutralized = body
    let ranges = markdownLiteralRanges(body)
    let cursor = 0
    while (cursor < body.length) {
        const literal = ranges.find((range) => range.start >= cursor)
        const region = findSvelteRegion(body, cursor, literal?.start ?? body.length, characters)
        if (region) {
            const { start, end } = region
            if (ranges.some((range) => range.start < end && range.end > start)) {
                neutralized =
                    neutralized.slice(0, start) +
                    body.slice(start, end).replace(/[^\r\n]/g, 'x') +
                    neutralized.slice(end)
                ranges = markdownLiteralRanges(neutralized)
            }
            cursor = end
        } else if (literal) {
            for (let index = literal.start; index < literal.end; index++) {
                if (characters[index] !== '\n' && characters[index] !== '\r')
                    characters[index] = ' '
            }
            cursor = literal.end
        } else break
    }
    return characters.join('')
}

/**
 * Parse ordinary Svelte markup and expressions without authoring delimiters.
 * Markdown outside those nodes remains a single build-time token tree.
 *
 * @param {string} body
 * @returns {{ source: string, islands: string[] }}
 */
export function extractSvelteIslands(body) {
    const tree = parse(maskMarkdownLiterals(body), { modern: true })
    if (tree.instance || tree.module) throw new Error('Hybrid proof scripts must precede markdown')
    if (tree.css) throw new Error('Styles are not supported yet in the hybrid proof')
    const islands = []
    const output = []
    let cursor = 0
    for (const node of tree.fragment.nodes) {
        if (node.type === 'Text') continue
        const tag = `sm-proof-island-${islands.length}`
        islands.push(body.slice(node.start, node.end))
        output.push(body.slice(cursor, node.start), `<${tag} />`)
        cursor = node.end
    }
    output.push(body.slice(cursor))
    return { source: output.join(''), islands }
}

/**
 * Tokenize the entire document once so reference links and heading identity
 * keep document-wide scope. Compiled snippets use the existing HTML snippet
 * override API; no changes to Parser or SvelteMarkdown are needed.
 *
 * Literal HTML elements compile as Svelte alongside components and expressions.
 * Any remaining unstructured HTML indicates an unsupported extraction case.
 *
 * @param {string} source
 * @param {import('marked').MarkedExtension} [options]
 * @returns {import('marked').Token[]}
 */
export function preparseTokens(source, options = {}) {
    const parser = new Marked(options)
    /** @type {('block' | 'inline')[]} */
    const levels = ['block', 'inline']
    parser.use({
        extensions: levels.map((level) => ({
            name: `proofIsland${level}`,
            level,
            start(value) {
                return level === 'block'
                    ? (value.match(/^<sm-proof-island-\d+ \/>[ \t]*(?:\r?\n|$)/m)?.index ?? -1)
                    : value.indexOf('<sm-proof-island-')
            },
            tokenizer(value) {
                const match = (
                    level === 'block'
                        ? /^<(sm-proof-island-\d+) \/>[ \t]*(?:\r?\n|$)/
                        : /^<(sm-proof-island-\d+) \/>/
                ).exec(value)
                if (!match) return undefined
                return {
                    type: 'html',
                    raw: match[0],
                    text: '',
                    tag: match[1],
                    attributes: {},
                    tokens: []
                }
            }
        }))
    })
    const tokens = parser.lexer(source)
    parser.walkTokens(tokens, (token) => {
        if (token.type !== 'html') return
        const match = /^<(sm-proof-island-\d+) \/>\s*$/.exec(token.raw)
        if (!match) throw new Error('Unsupported HTML token in the hybrid proof')
        Object.assign(token, { tag: match[1], attributes: {}, tokens: [] })
    })
    return tokens
}

/** JSON data, never executable source, embedded safely in a script element.
 * @param {unknown} value
 */
export function scriptData(value) {
    return JSON.stringify(value, (_key, item) => {
        if (['function', 'symbol', 'bigint'].includes(typeof item)) {
            throw new Error('Hybrid proof tokens must contain JSON data, not executable values')
        }
        return item
    }).replace(/</g, '\\u003c')
}

/**
 * @param {{ body: string, data: Record<string, unknown>, scripts: { attrs: string, code: string }[], document: string, layout?: string, options?: import('marked').MarkedExtension }} input
 */
export function generateHybridDocument(input) {
    const { source, islands } = extractSvelteIslands(input.body)
    const tokens = preparseTokens(source, input.options)
    const moduleScripts = input.scripts.filter((script) => /\bmodule\b/.test(script.attrs))
    const instanceScripts = input.scripts.filter((script) => !/\bmodule\b/.test(script.attrs))
    const typescript = input.scripts.some((script) => /lang\s*=\s*["']ts["']/.test(script.attrs))
    const language = typescript ? ' lang="ts"' : ''
    const snippets = islands.map(
        (island, index) => `{#snippet smProofIsland${index}()}${island}{/snippet}`
    )
    const props = islands
        .map((_, index) => `html_sm-proof-island-${index}={smProofIsland${index}}`)
        .join(' ')
    const document = `<SmProofDocument source={smProofTokens} ${props} />`
    const template = input.layout
        ? `<SmProofLayout {...metadata}>${document}</SmProofLayout>`
        : document
    return {
        code: [
            `<script module${language}>`,
            `export const metadata = ${scriptData(input.data)}`,
            `const smProofTokens = ${scriptData(tokens)}`,
            ...moduleScripts.map((script) => script.code),
            '</script>',
            `<script${language}>`,
            `import SmProofDocument from ${JSON.stringify(input.document)}`,
            ...(input.layout ? [`import SmProofLayout from ${JSON.stringify(input.layout)}`] : []),
            ...instanceScripts.map((script) => script.code),
            '</script>',
            ...snippets,
            template
        ].join('\n')
    }
}
