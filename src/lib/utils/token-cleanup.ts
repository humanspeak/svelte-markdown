import type { Token, TokensList } from 'marked'

// Cache the regex pattern
const HTML_TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9]*).*?>/

export const isHtmlOpenTag = (raw: string): { tag: string; isOpening: boolean } | null => {
    const match = raw.match(HTML_TAG_PATTERN)
    if (!match) return null
    return { tag: match[1], isOpening: !raw.startsWith('</') }
}

export const shrinkHtmlTokens = (tokens: Token[] | TokensList): Token[] => {
    const result: Token[] = []
    const len = tokens.length
    for (let i = 0; i < len; i++) {
        const currentToken = tokens[i]

        // Handle nested tokens first
        if ('tokens' in currentToken && currentToken.tokens) {
            currentToken.tokens = shrinkHtmlTokens(currentToken.tokens)
            result.push(currentToken)
            continue
        }

        // Check for HTML pattern
        if (currentToken.type === 'html' && i + 2 < len) {
            const openTag = isHtmlOpenTag(currentToken.raw)

            if (openTag?.isOpening) {
                const contentToken = tokens[i + 1]
                const closingToken = tokens[i + 2]
                const closeTag = isHtmlOpenTag(closingToken.raw)

                if (
                    contentToken.type === 'text' &&
                    closeTag &&
                    !closeTag.isOpening &&
                    openTag.tag === closeTag.tag
                ) {
                    result.push({
                        type: 'html',
                        raw: currentToken.raw + contentToken.raw + closingToken.raw,
                        text: currentToken.raw + contentToken.raw + closingToken.raw,
                        tag: openTag.tag
                    })

                    i += 2
                    continue
                }
            }
        }

        result.push(currentToken)
    }

    return result
}
