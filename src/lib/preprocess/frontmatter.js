/**
 * Minimal YAML front matter parser for the markdown preprocessor prototype.
 *
 * Deliberately tiny: supports `key: value` pairs with string/number/boolean
 * scalars and inline `[a, b]` arrays. Anything more (nested maps, block
 * sequences, multi-line strings) is out of scope for the prototype — a real
 * implementation would delegate to a YAML library.
 *
 * @param {string} source raw file contents
 * @returns {{ data: Record<string, unknown>, content: string }}
 */
export function extractFrontmatter(source) {
    const match = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(source)
    if (!match) return { data: {}, content: source }

    /** @type {Record<string, unknown>} */
    const data = {}
    for (const rawLine of match[1].split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue
        const separator = line.indexOf(':')
        if (separator === -1) continue
        const key = line.slice(0, separator).trim()
        if (!key) continue
        data[key] = parseScalar(line.slice(separator + 1).trim())
    }

    return { data, content: source.slice(match[0].length) }
}

/**
 * @param {string} raw
 * @returns {unknown}
 */
function parseScalar(raw) {
    if (raw === '') return ''
    if (raw === 'true') return true
    if (raw === 'false') return false
    if (raw === 'null' || raw === '~') return null
    if (raw.startsWith('[') && raw.endsWith(']')) {
        const inner = raw.slice(1, -1).trim()
        if (!inner) return []
        return inner.split(',').map((item) => parseScalar(item.trim()))
    }
    if (['"', "'"].includes(raw[0]) && raw.endsWith(raw[0]) && raw.length > 1) {
        return raw.slice(1, -1)
    }
    if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw)
    return raw
}
