import { Parser } from 'htmlparser2'
import type { Token } from 'marked'

// Cache the regex pattern
const HTML_TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9-]{0,})(?:\s+[^>]*)?>/
const htmlTagRegex = new RegExp(HTML_TAG_PATTERN)

export const isHtmlOpenTag = (raw: string): { tag: string; isOpening: boolean } | null => {
    // Use test() first as it's faster than match()
    if (!htmlTagRegex.test(raw)) return null
    const match = raw.match(HTML_TAG_PATTERN)
    if (!match) return null
    return { tag: match[1], isOpening: !raw.startsWith('</') }
}

function extractAttributes(raw: string): Record<string, string> {
    const attributes: Record<string, string> = {}
    const attributeRegex = /(\w+)=["']([^"']*?)["']/g
    let match

    while ((match = attributeRegex.exec(raw)) !== null) {
        const [, key, value] = match
        attributes[key] = value.trim()
    }

    return attributes
}

function parseHtmlBlock(html: string): Token[] {
    const tokens: Token[] = []
    let currentText = ''

    const parser = new Parser({
        onopentag(name, attributes) {
            if (currentText.trim()) {
                tokens.push({
                    type: 'text',
                    raw: currentText,
                    text: currentText
                })
                currentText = ''
            }
            tokens.push({
                type: 'html',
                raw: `<${name}${Object.entries(attributes)
                    .map(([key, value]) => ` ${key}="${value}"`)
                    .join('')}>`,
                tag: name,
                attributes
            })
        },
        ontext(text) {
            currentText += text
        },
        onclosetag(name) {
            if (currentText.trim()) {
                tokens.push({
                    type: 'text',
                    raw: currentText,
                    text: currentText
                })
                currentText = ''
            }
            tokens.push({
                type: 'html',
                raw: `</${name}>`,
                tag: name
            })
        }
    })

    parser.write(html)
    parser.end()

    return tokens
}

function containsMultipleTags(html: string): boolean {
    // Count the number of opening tags (excluding self-closing)
    const openingTags = html.match(/<[a-zA-Z][^>]*>/g) || []
    const closingTags = html.match(/<\/[a-zA-Z][^>]*>/g) || []
    return openingTags.length > 1 || closingTags.length > 1
}

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

// Rename the existing shrinkHtmlTokens logic to processHtmlTokens
function processHtmlTokens(tokens: Token[]): Token[] {
    const result: Token[] = []
    const stack: { tag: string; startIndex: number }[] = []

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i]

        // Recursively process any nested tokens first
        if ('tokens' in token && Array.isArray(token.tokens)) {
            token.tokens = processHtmlTokens(token.tokens)
        }

        if (token.type === 'html') {
            const tagInfo = isHtmlOpenTag(token.raw)
            if (!tagInfo) {
                result.push(token)
                continue
            }

            if (tagInfo.isOpening) {
                stack.push({ tag: tagInfo.tag, startIndex: result.length })
                result.push(token)
            } else {
                const lastOpening = stack.pop()
                if (!lastOpening || lastOpening.tag !== tagInfo.tag) {
                    result.push(token)
                    continue
                }

                const startIndex = lastOpening.startIndex
                const innerTokens = result.splice(startIndex + 1, result.length - startIndex - 1)
                const openingToken = result.pop()!

                const attributes = extractAttributes(openingToken.raw)

                result.push({
                    type: 'html',
                    raw: openingToken.raw,
                    tag: tagInfo.tag,
                    tokens: processHtmlTokens(innerTokens),
                    attributes
                })
            }
        } else {
            result.push(token)
        }
    }

    if (stack.length > 0) {
        return tokens
    }

    return result
}
