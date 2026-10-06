import { extractFrontmatter } from './frontmatter.js'
import { generateHybridDocument } from './hybrid.js'
import { collectComponentImports, extractLeadingScripts } from './script-block.js'

/**
 * @typedef {object} SvelteMarkdownPreprocessOptions
 * @property {string[]} [extensions] File extensions to treat as markdown documents. Default `['.md']`.
 * @property {string} [document] Import specifier for the component that renders the markdown.
 *   Defaults to the package's `MarkdownDocument` wrapper.
 * @property {string} [layout] Optional import specifier for a layout component that wraps the
 *   rendered markdown and receives front matter as props (mdsvex-style).
 * @property {boolean} [preparse] Enable the experimental build-time token/Svelte island proof.
 * @property {import('marked').MarkedExtension} [options] Build-time Marked options for the proof.
 */

const DEFAULT_DOCUMENT = '@humanspeak/svelte-markdown/document'

/**
 * Svelte preprocessor that turns a plain markdown file into a Svelte component
 * which renders that markdown through `<SvelteMarkdown>`.
 *
 * Pair it with `extensions: ['.svelte', '.md']` in `svelte.config.js` so both
 * the Svelte compiler and SvelteKit's router recognise `.md` files.
 *
 * @param {SvelteMarkdownPreprocessOptions} [options]
 * @returns {{ name: string, markup: (input: { content: string, filename?: string }) => { code: string } | undefined }}
 */
export function markdown(options = {}) {
    const extensions = options.extensions ?? ['.md']
    const documentSpecifier = options.document ?? DEFAULT_DOCUMENT
    const layoutSpecifier = options.layout

    return {
        name: 'svelte-markdown',
        markup({ content, filename }) {
            if (!filename || !extensions.some((extension) => filename.endsWith(extension))) {
                return undefined
            }

            const { data, content: withScripts } = extractFrontmatter(content)
            const { scripts, content: body } = extractLeadingScripts(withScripts)

            if (options.preparse) {
                return generateHybridDocument({
                    body,
                    data,
                    scripts,
                    document: documentSpecifier,
                    layout: layoutSpecifier,
                    options: options.options
                })
            }

            // A leading `<script>` block may import Svelte components; those
            // become HTML tag renderers so the markdown body can use them.
            const componentNames = scripts.flatMap((script) =>
                script.attrs.includes('module') ? [] : collectComponentImports(script.code)
            )

            const imports = [`import Document__ from ${JSON.stringify(documentSpecifier)}`]
            if (layoutSpecifier) {
                imports.push(`import Layout__ from ${JSON.stringify(layoutSpecifier)}`)
            }

            const rendered = componentNames.length
                ? `<Document__ source={source__} components={components__} />`
                : `<Document__ source={source__} />`
            const template = layoutSpecifier
                ? `<Layout__ {...metadata}>\n${rendered}\n</Layout__>`
                : rendered

            const moduleScripts = scripts.filter((script) => script.attrs.includes('module'))
            const instanceScripts = scripts.filter((script) => !script.attrs.includes('module'))

            const code = [
                '<script module>',
                `\texport const metadata = ${JSON.stringify(data)}`,
                ...moduleScripts.map((script) => script.code),
                '</script>',
                '',
                '<script>',
                ...imports.map((line) => `\t${line}`),
                ...instanceScripts.map((script) => script.code),
                `\tconst source__ = ${toScriptSafeLiteral(body)}`,
                ...(componentNames.length
                    ? [`\tconst components__ = { ${componentNames.join(', ')} }`]
                    : []),
                '</script>',
                '',
                template,
                ''
            ].join('\n')

            return { code }
        }
    }
}

/**
 * JSON-encode a string for embedding inside a Svelte `<script>` block.
 *
 * `JSON.stringify` alone is not enough: a literal `</script>` anywhere in the
 * markdown (very common inside fenced code blocks) closes the script tag early
 * and the Svelte parser dies on an unterminated string. Escaping every `</`
 * as `<\/` is inert in JS but invisible to the HTML tokenizer.
 *
 * @param {string} value
 * @returns {string}
 */
function toScriptSafeLiteral(value) {
    return JSON.stringify(value).replace(/<\//g, '<\\/')
}

export default markdown
