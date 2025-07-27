import * as htmlparser2 from 'htmlparser2'
import type { Token, Tokens } from 'marked'

/**
 * Matches HTML tags with comprehensive coverage of edge cases.
 * Pattern breakdown:
 * - <\/?         : Matches opening < and optional /
 * - [a-zA-Z]     : Tag must start with letter
 * - [a-zA-Z0-9-] : Subsequent chars can be letters, numbers, or hyphens
 * - (?:\s+[^>]*)?: Optional attributes
 * - >            : Closing bracket
 *
 * @const {RegExp}
 */
const HTML_TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9-]{0,})(?:\s+[^>]*)?>/
const htmlTagRegex = new RegExp(HTML_TAG_PATTERN)

/**
 * Regex pattern for self-closing HTML tags.
 * @const {RegExp}
 */
const SELF_CLOSING_TAGS =
    /^(br|hr|img|input|link|meta|area|base|col|embed|keygen|param|source|track|wbr)$/i

/**
 * Analyzes a string to determine if it contains an HTML tag and its characteristics.
 *
 * @param {string} raw - Raw string potentially containing an HTML tag
 * @returns {Object|null} Returns null if no tag found, otherwise returns:
 *    {
 *      tag: string      - The name of the HTML tag
 *      isOpening: bool  - True if opening tag, false if closing
 *    }
 *
 * @example
 * isHtmlOpenTag('<div class="test">') // Returns { tag: 'div', isOpening: true }
 * isHtmlOpenTag('</span>') // Returns { tag: 'span', isOpening: false }
 * isHtmlOpenTag('plain text') // Returns null
 */
export const isHtmlOpenTag = (raw: string): { tag: string; isOpening: boolean } | null => {
    // First check if the string contains any HTML tags at all (faster than full regex match)
    if (!htmlTagRegex.test(raw)) return null

    // If we found a tag, extract its name and check if it's an opening tag
    const match = raw.match(HTML_TAG_PATTERN)
    if (!match) return null
    return { tag: match[1], isOpening: !raw.startsWith('</') }
}

/**
 * Formats individual HTML tokens to ensure self-closing tags are properly formatted.
 * This handles cases like <br> -> <br/> without affecting the token structure.
 *
 * @param {Token} token - HTML token to format
 * @returns {Token} Formatted token with proper self-closing syntax
 */
const formatSelfClosingHtmlToken = (token: Token): Token => {
    // Extract tag name from raw HTML
    const tagMatch = token.raw.match(/<\/?([a-zA-Z][a-zA-Z0-9-]*)/i)
    if (!tagMatch) return token

    const tagName = tagMatch[1]
    if (!SELF_CLOSING_TAGS.test(tagName)) return token

    // If it's a self-closing tag and doesn't already end with />, format it properly
    if (!token.raw.endsWith('/>')) {
        const formattedRaw = token.raw.replace(/\s*>$/, '/>')
        return {
            ...token,
            raw: formattedRaw,
            tag: tagName,
            attributes: extractAttributes(token.raw)
        }
    }

    return token
}

/**
 * Parses HTML attributes from a tag string into a structured object.
 * Handles both single and double quoted attributes.
 *
 * @param {string} raw - Raw HTML tag string containing attributes
 * @returns {Record<string, string>} Map of attribute names to their values
 *
 * @example
 * extractAttributes('<div class="foo" id="bar">')
 * // Returns { class: 'foo', id: 'bar' }
 *
 * @internal
 */
export const extractAttributes = (raw: string): Record<string, string> => {
    const attributes: Record<string, string> = {}

    // First pass: handle regular and unclosed quoted attributes
    const quotedRegex = /([a-zA-Z][\w-]*?)=["']([^"']*?)(?:["']|$)/g
    let match
    while ((match = quotedRegex.exec(raw)) !== null) {
        const [, key, value] = match
        attributes[key] = value.trim()
    }

    // Second pass: handle boolean attributes
    const booleanRegex = /(?:^|\s)([a-zA-Z][\w-]*?)(?=[\s>]|$)/g
    while ((match = booleanRegex.exec(raw)) !== null) {
        const [, key] = match
        if (key && !attributes[key]) {
            attributes[key] = ''
        }
    }

    return attributes
}

/**
 * Converts an HTML string into a sequence of tokens using htmlparser2.
 * Handles complex nested structures while maintaining proper order and relationships.
 *
 * Key features:
 * - Preserves original HTML structure without automatic tag closing
 * - Handles self-closing tags with proper XML syntax (e.g., <br/> instead of <br>)
 * - Gracefully handles malformed HTML by preserving the original structure
 * - Maintains attribute information in opening tags
 * - Processes text content between tags
 *
 * @param {string} html - HTML string to be parsed
 * @returns {Token[]} Array of tokens representing the HTML structure
 *
 * @example
 * // Well-formed HTML
 * parseHtmlBlock('<div>Hello <span>world</span></div>')
 * // Returns [
 * //   { type: 'html', raw: '<div>', ... },
 * //   { type: 'text', raw: 'Hello ', ... },
 * //   { type: 'html', raw: '<span>', ... },
 * //   { type: 'text', raw: 'world', ... },
 * //   { type: 'html', raw: '</span>', ... },
 * //   { type: 'html', raw: '</div>', ... }
 * // ]
 *
 * // Self-closing tags
 * parseHtmlBlock('<div>Before<br/>After</div>')
 * // Returns [
 * //   { type: 'html', raw: '<div>', ... },
 * //   { type: 'text', raw: 'Before', ... },
 * //   { type: 'html', raw: '<br/>', ... },
 * //   { type: 'text', raw: 'After', ... },
 * //   { type: 'html', raw: '</div>', ... }
 * // ]
 *
 * // Malformed HTML
 * parseHtmlBlock('<div>Unclosed')
 * // Returns [
 * //   { type: 'html', raw: '<div>', ... },
 * //   { type: 'text', raw: 'Unclosed', ... }
 * // ]
 *
 * @internal
 */
export const parseHtmlBlock = (html: string): Token[] => {
    const tokens: Token[] = []
    let currentText = ''
    const openTags: string[] = []

    const parser = new htmlparser2.Parser(
        {
            onopentag: (name, attributes) => {
                if (currentText.trim()) {
                    tokens.push({
                        type: 'text',
                        raw: currentText,
                        text: currentText
                    })
                    currentText = ''
                }

                if (SELF_CLOSING_TAGS.test(name)) {
                    tokens.push({
                        type: 'html',
                        raw: `<${name}${Object.entries(attributes)
                            .map(([key, value]) => ` ${key}="${value}"`)
                            .join('')}/>`,
                        tag: name,
                        attributes
                    })
                } else {
                    openTags.push(name)
                    tokens.push({
                        type: 'html',
                        raw: `<${name}${Object.entries(attributes)
                            .map(([key, value]) => ` ${key}="${value}"`)
                            .join('')}>`,
                        tag: name,
                        attributes
                    })
                }
            },
            ontext: (text) => {
                currentText += text
            },
            onclosetag: (name) => {
                if (currentText.trim()) {
                    tokens.push({
                        type: 'text',
                        raw: currentText,
                        text: currentText
                    })
                    currentText = ''
                }

                // Only add closing tag if we found its opening tag
                // and it's not a self-closing tag
                if (openTags.includes(name) && !SELF_CLOSING_TAGS.test(name)) {
                    if (html.includes(`</${name}>`)) {
                        tokens.push({
                            type: 'html',
                            raw: `</${name}>`,
                            tag: name
                        })
                    }
                    openTags.splice(openTags.indexOf(name), 1)
                }
            }
        },
        {
            xmlMode: true,
            // Add this to prevent automatic tag closing
            recognizeSelfClosing: true
        }
    )

    parser.write(html)
    parser.end()

    if (currentText.trim()) {
        tokens.push({
            type: 'text',
            raw: currentText,
            text: currentText
        })
    }

    return tokens
}

/**
 * Determines if an HTML string contains multiple distinct tags.
 * Used as a preprocessing step to optimize token processing.
 *
 * @param {string} html - HTML string to analyze
 * @returns {boolean} True if multiple tags are present or if it's a single pair of matching tags
 *
 * @internal
 */
export const containsMultipleTags = (html: string): boolean => {
    // Count the number of opening and closing tags
    const openingTags = html.match(/<[a-zA-Z][^>]*>/g) || []
    const closingTags = html.match(/<\/[a-zA-Z][^>]*>/g) || []
    // Return true if:
    // 1. There are multiple opening tags OR
    // 2. There are multiple closing tags OR
    // 3. There is exactly one opening and one closing tag (matching pair)
    return (
        openingTags.length > 1 ||
        closingTags.length > 1 ||
        (openingTags.length === 1 && closingTags.length === 1)
    )
}

/**
 * Primary entry point for HTML token processing. Transforms flat token arrays
 * into properly nested structures while preserving HTML semantics.
 *
 * Key features:
 * - Breaks down complex HTML structures into atomic tokens
 * - Formats self-closing tags with proper syntax (e.g., <br> -> <br/>)
 * - Maintains attribute information
 * - Preserves proper nesting relationships
 * - Handles malformed HTML gracefully
 *
 * @param {Token[]} tokens - Array of tokens to process
 * @returns {Token[]} Processed and properly nested token array
 *
 * @example
 * const tokens = [
 *   { type: 'html', raw: '<div class="wrapper">' },
 *   { type: 'text', raw: 'content' },
 *   { type: 'html', raw: '</div>' }
 * ];
 * shrinkHtmlTokens(tokens);
 * // Returns nested structure with proper token relationships
 *
 * @public
 */
export const shrinkHtmlTokens = (tokens: Token[]): Token[] => {
    const result: Token[] = []
    for (const token of tokens) {
        if (token.type === 'list') {
            token.items = token.items.map((item: Tokens.ListItem, index: number) => ({
                ...item,
                listItemIndex: index,
                tokens: item.tokens ? shrinkHtmlTokens(item.tokens) : []
            }))
            result.push(token)
        } else if (token.type === 'table') {
            // Process header cells
            if (token.header) {
                // @ts-expect-error: expected any
                token.header = token.header.map((cell) => ({
                    ...cell,
                    tokens: cell.tokens ? shrinkHtmlTokens(cell.tokens) : []
                }))
            }

            // Process row cells
            if (token.rows) {
                // @ts-expect-error: expected any
                token.rows = token.rows.map((row) =>
                    // @ts-expect-error: expected any
                    row.map((cell) => ({
                        ...cell,
                        tokens: cell.tokens ? shrinkHtmlTokens(cell.tokens) : []
                    }))
                )
            }
            result.push(token)
        } else if (token.type === 'html' && containsMultipleTags(token.raw)) {
            // Parse HTML with multiple tags into separate tokens
            result.push(...parseHtmlBlock(token.raw))
        } else if (token.type === 'html') {
            // Format self-closing tags properly (e.g., <br> -> <br/>)
            const formattedToken = formatSelfClosingHtmlToken(token)
            result.push(formattedToken)
        } else {
            result.push(token)
        }
    }

    // Then process the tokens as before
    return processHtmlTokens(result)
}

/**
 * Core token processing logic that handles the complexities of HTML nesting.
 * Uses a stack-based approach to match opening and closing tags while
 * maintaining proper hierarchical relationships.
 *
 * Implementation details:
 * - Maintains a stack of opening tags
 * - Processes nested tokens recursively
 * - Preserves HTML attributes
 * - Handles malformed HTML gracefully
 *
 * @param {Token[]} tokens - Tokens to be processed
 * @returns {Token[]} Processed tokens with proper nesting structure
 *
 * @internal
 */
export const processHtmlTokens = (tokens: Token[]): Token[] => {
    const result: Token[] = []
    // Stack to keep track of opening tags and their positions
    const stack: { tag: string; startIndex: number }[] = []

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        // If token contains nested tokens, process them recursively
        if ('tokens' in token && Array.isArray(token.tokens)) {
            token.tokens = processHtmlTokens(token.tokens)
        }

        if (token.type === 'html') {
            const tagInfo = isHtmlOpenTag(token.raw)
            if (!tagInfo) {
                // If we can't parse the tag, just add it as-is
                result.push(token)
                continue
            }

            if (tagInfo.isOpening) {
                // For opening tags, push to stack and add to result
                stack.push({ tag: tagInfo.tag, startIndex: result.length })
                result.push(token)
            } else {
                // For closing tags, try to match with last opening tag
                const lastOpening = stack.pop()
                if (!lastOpening || lastOpening.tag !== tagInfo.tag) {
                    // If no matching opening tag, add closing tag as-is
                    result.push(token)
                    continue
                }

                // Found matching tags - create nested structure
                const startIndex = lastOpening.startIndex
                // Remove all tokens between opening and closing tags
                const innerTokens = result.splice(startIndex + 1, result.length - startIndex - 1)
                // Remove the opening tag
                const openingToken = result.pop()!

                // Extract attributes from opening tag
                const attributes = extractAttributes(openingToken.raw)

                // Create new nested token structure
                result.push({
                    type: 'html',
                    raw: openingToken.raw,
                    tag: tagInfo.tag,
                    tokens: processHtmlTokens(innerTokens),
                    attributes
                })
            }
        } else {
            // Non-HTML tokens are added as-is
            result.push(token)
        }
    }

    // If we have unclosed tags, return original tokens
    if (stack.length > 0) {
        return tokens
    }

    return result
}
