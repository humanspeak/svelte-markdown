import { Marked } from 'marked'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { parse } from 'svelte/compiler'

/**
 * Identify literal Markdown regions before asking Svelte's parser to recognize
 * template nodes. Source offsets stay unchanged, including UTF-16 characters.
 *
 * @param {string} body
 */
function maskMarkdownLiterals(body) {
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
            if (body[start] === '<') {
                ranges.push({ start, end })
                return
            }
            const labelEnd = node.children.at(-1)?.position?.end.offset
            if (labelEnd !== undefined) ranges.push({ start: labelEnd, end })
        }
        if ('children' in node) node.children.forEach(visit)
    }
    visit(fromMarkdown(body))
    const characters = body.split('')
    for (const { start, end } of ranges) {
        for (let index = start; index < end; index++) {
            if (characters[index] !== '\n' && characters[index] !== '\r') characters[index] = ' '
        }
    }
    // Markdown escapes must stay literal rather than becoming Svelte syntax.
    for (const match of body.matchAll(/\\[{}<>]/g)) {
        characters[match.index + 1] = ' '
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
