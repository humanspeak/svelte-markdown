export type MessageData = {
    type?: 'og' | 'twitter'
    title?: string
    description?: string
    features?: string[]
}

/**
 * Encodes a JSON object into a URL-safe Base64 string, handling UTF-8 characters safely.
 */
export function encodeMessageData(data: MessageData): string {
    const jsonStr = JSON.stringify(data)

    // Convert UTF-8 string to base64 safely
    const base64 = btoa(
        encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) =>
            String.fromCharCode(parseInt(p1, 16))
        )
    )

    // Make it URL-safe: replace '+' with '-', '/' with '_', and remove padding '='
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decodes a URL-safe Base64 string back into the original JSON object.
 */
export function decodeMessageData(urlSafeBase64: string): MessageData {
    // Restore standard base64 characters and padding
    let base64 = urlSafeBase64.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
        base64 += '='
    }

    // Decode base64 to UTF-8 string safely
    const jsonStr = decodeURIComponent(
        Array.prototype.map
            .call(atob(base64), (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
    )

    return JSON.parse(jsonStr)
}
