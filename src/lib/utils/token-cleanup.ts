import { Parser } from 'htmlparser2'
import type { Token } from 'marked'

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
const extractAttributes = (raw: string): Record<string, string> => {
    const attributes: Record<string, string> = {}
    // Match pattern: attribute="value" or attribute='value'
    const attributeRegex = /(\w+)=["']([^"']*?)["']/g
    let match

    // Continue finding matches until we've processed all attributes
    while ((match = attributeRegex.exec(raw)) !== null) {
        const [, key, value] = match
        attributes[key] = value.trim()
    }

    return attributes
}

/**
 * Converts an HTML string into a sequence of tokens using htmlparser2.
 * Handles complex nested structures while maintaining proper order and relationships.
 *
 * @param {string} html - HTML string to be parsed
 * @returns {Token[]} Array of tokens representing the HTML structure
 *
 * @example
 * parseHtmlBlock('<div>Hello <span>world</span></div>')
 * // Returns structured token array with proper nesting
 *
 * @internal
 */
const parseHtmlBlock = (html: string): Token[] => {
    const tokens: Token[] = []
    // Buffer for accumulating text content between tags
    let currentText = ''

    const parser = new Parser({
        // Called when an opening tag is encountered (<div>, <span>, etc.)
        onopentag: (name, attributes) => {
            // If we have accumulated any text, create a text token first
            if (currentText.trim()) {
                tokens.push({
                    type: 'text',
                    raw: currentText,
                    text: currentText
                })
                currentText = ''
            }
            // Create a token for the opening tag with its attributes
            tokens.push({
                type: 'html',
                raw: `<${name}${Object.entries(attributes)
                    .map(([key, value]) => ` ${key}="${value}"`)
                    .join('')}>`,
                tag: name,
                attributes
            })
        },
        // Called for text content between tags
        ontext: (text) => {
            currentText += text
        },
        // Called when a closing tag is encountered (</div>, </span>, etc.)
        onclosetag: (name) => {
            // Push any accumulated text before the closing tag
            if (currentText.trim()) {
                tokens.push({
                    type: 'text',
                    raw: currentText,
                    text: currentText
                })
                currentText = ''
            }
            // Create a token for the closing tag
            tokens.push({
                type: 'html',
                raw: `</${name}>`,
                tag: name
            })
        }
    })

    // Process the HTML string
    parser.write(html)
    parser.end()

    return tokens
}

/**
 * Determines if an HTML string contains multiple distinct tags.
 * Used as a preprocessing step to optimize token processing.
 *
 * @param {string} html - HTML string to analyze
 * @returns {boolean} True if multiple tags are present
 *
 * @internal
 */
const containsMultipleTags = (html: string): boolean => {
    // Count the number of opening tags (excluding self-closing)
    const openingTags = html.match(/<[a-zA-Z][^>]*>/g) || []
    const closingTags = html.match(/<\/[a-zA-Z][^>]*>/g) || []
    return openingTags.length > 1 || closingTags.length > 1
}

/**
 * Primary entry point for HTML token processing. Transforms flat token arrays
 * into properly nested structures while preserving HTML semantics.
 *
 * Key features:
 * - Breaks down complex HTML structures into atomic tokens
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
        if (token.type === 'html' && containsMultipleTags(token.raw)) {
            // Parse HTML with multiple tags into separate tokens
            result.push(...parseHtmlBlock(token.raw))
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
const processHtmlTokens = (tokens: Token[]): Token[] => {
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
