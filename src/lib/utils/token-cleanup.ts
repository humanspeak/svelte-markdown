import { Parser } from 'htmlparser2'
import type { Token } from 'marked'

/**
 * Regular expression pattern to match HTML tags
 * Matches both opening and closing tags with optional attributes
 * Example matches: <div>, </div>, <img src="...">, <input type="text"/>
 */
const HTML_TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9-]{0,})(?:\s+[^>]*)?>/
const htmlTagRegex = new RegExp(HTML_TAG_PATTERN)

/**
 * Determines if a string contains an HTML opening or closing tag
 * @param raw - The string to check for HTML tags
 * @returns Object containing the tag name and whether it's an opening tag, or null if no tag found
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
 * Extracts HTML attributes from a tag string
 * @param raw - The raw HTML tag string (e.g., '<div class="example" id="test">')
 * @returns An object containing key-value pairs of attributes
 */
function extractAttributes(raw: string): Record<string, string> {
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
 * Parses an HTML string into an array of tokens
 * Uses htmlparser2 to properly handle nested tags and text content
 * @param html - The HTML string to parse
 * @returns Array of tokens representing the HTML structure
 */
function parseHtmlBlock(html: string): Token[] {
    const tokens: Token[] = []
    // Buffer for accumulating text content between tags
    let currentText = ''

    const parser = new Parser({
        // Called when an opening tag is encountered (<div>, <span>, etc.)
        onopentag(name, attributes) {
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
        ontext(text) {
            currentText += text
        },
        // Called when a closing tag is encountered (</div>, </span>, etc.)
        onclosetag(name) {
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
 * Checks if an HTML string contains multiple tags
 * Used to determine if further parsing is needed
 * @param html - The HTML string to check
 * @returns boolean indicating if multiple tags are present
 */
function containsMultipleTags(html: string): boolean {
    // Count the number of opening tags (excluding self-closing)
    const openingTags = html.match(/<[a-zA-Z][^>]*>/g) || []
    const closingTags = html.match(/<\/[a-zA-Z][^>]*>/g) || []
    return openingTags.length > 1 || closingTags.length > 1
}

/**
 * Main function to process and shrink HTML tokens
 * Breaks down complex HTML structures into manageable tokens
 * @param tokens - Array of tokens to process
 * @returns Processed array of tokens with nested structure
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
 * Processes HTML tokens to create a nested structure
 * Handles matching opening and closing tags, maintains proper nesting
 * and preserves attributes
 *
 * @param tokens - Array of tokens to process
 * @returns Processed array of tokens with proper nesting structure
 *
 * @example
 * Input tokens: [
 *   { type: 'html', raw: '<div>' },
 *   { type: 'text', raw: 'Hello' },
 *   { type: 'html', raw: '</div>' }
 * ]
 * Output: [
 *   { type: 'html', tag: 'div', tokens: [
 *     { type: 'text', raw: 'Hello' }
 *   ]}
 * ]
 */
function processHtmlTokens(tokens: Token[]): Token[] {
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
