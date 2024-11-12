import type { Token, TokensList } from 'marked'

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

export const shrinkHtmlTokens = (tokens: Token[] | TokensList): Token[] => {
    const result: Token[] = []
    const len = tokens.length

    for (let i = 0; i < len; i++) {
        const currentToken = { ...tokens[i] }

        // Handle nested tokens first
        if ('tokens' in currentToken && currentToken.tokens) {
            currentToken.tokens = shrinkHtmlTokens(currentToken.tokens)
            result.push(currentToken)
            continue
        }

        // Check for HTML pattern
        if (currentToken.type === 'html') {
            const openTag = isHtmlOpenTag(currentToken.raw)

            if (openTag?.isOpening) {
                // Search forward for the next matching closing tag
                let closingIndex = -1
                let depth = 0

                for (let j = i + 1; j < len; j++) {
                    const potentialTag = isHtmlOpenTag(tokens[j].raw)

                    if (potentialTag?.tag === openTag.tag) {
                        if (potentialTag.isOpening) {
                            depth++
                        } else if (depth === 0) {
                            closingIndex = j
                            break
                        } else {
                            depth--
                        }
                    }
                }

                if (closingIndex !== -1) {
                    // Collect all content between tags
                    const contentTokens = tokens.slice(i + 1, closingIndex)
                    result.push({
                        type: 'html',
                        raw: currentToken.raw,
                        text: currentToken.raw.replace(/<|>/g, ''),
                        tokens: shrinkHtmlTokens(contentTokens),
                        tag: openTag.tag,
                        attributes: Object.fromEntries(
                            (currentToken.raw.match(/\s+([^>]*)/)?.[1] || '')
                                .split(/\s+/)
                                .filter(Boolean)
                                .map((attr) => {
                                    const [key, value] = attr.split('=')
                                    return [key, value ? value.replace(/['"]/g, '') : true]
                                })
                        )
                    })

                    // Skip ahead past the closing tag
                    i = closingIndex
                    continue
                }
            }
        }

        result.push(currentToken)
    }

    return result
}
