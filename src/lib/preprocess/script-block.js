/**
 * Extraction of leading `<script>` blocks from a markdown document.
 *
 * mdsvex lets a `.md` file import Svelte components in a `<script>` block and
 * then use them in the body. We support the same shape, but only for blocks at
 * the very top of the file (after front matter). Scanning the whole document
 * would wrongly capture `<script>` tags inside fenced code blocks, which is a
 * common thing to write about.
 *
 * @param {string} source markdown body, front matter already removed
 * @returns {{ scripts: { attrs: string, code: string }[], content: string }}
 */
export function extractLeadingScripts(source) {
    /** @type {{ attrs: string, code: string }[]} */
    const scripts = []
    let rest = source

    for (;;) {
        const match = /^\s*<script(\s[^>]*)?>([\s\S]*?)<\/script>[ \t]*\r?\n?/.exec(rest)
        if (!match) break
        scripts.push({ attrs: (match[1] ?? '').trim(), code: match[2] })
        rest = rest.slice(match[0].length)
    }

    return { scripts, content: rest }
}

/**
 * Collect the local binding names introduced by `import` statements, keeping
 * only Capitalized ones — the Svelte convention for components. These get
 * registered as HTML tag renderers so the markdown body can use them.
 *
 * @param {string} code JavaScript source of a script block
 * @returns {string[]} local identifiers, deduplicated and in source order
 */
export function collectComponentImports(code) {
    /** @type {Set<string>} */
    const names = new Set()
    const importPattern = /\bimport\s+([^'"]*?)\s+from\s*['"][^'"]+['"]/g

    let match
    while ((match = importPattern.exec(code)) !== null) {
        const clause = match[1]
        if (clause.startsWith('type ')) continue

        const namedMatch = /\{([^}]*)\}/.exec(clause)
        const defaultPart = clause.slice(0, namedMatch ? namedMatch.index : undefined)

        addIfComponent(names, defaultPart.replace(/,\s*$/, '').trim())

        if (namedMatch) {
            for (const entry of namedMatch[1].split(',')) {
                const trimmed = entry.trim()
                if (!trimmed || trimmed.startsWith('type ')) continue
                const aliased = /\bas\s+(\w+)$/.exec(trimmed)
                addIfComponent(names, aliased ? aliased[1] : trimmed)
            }
        }
    }

    return [...names]
}

/**
 * @param {Set<string>} names
 * @param {string} candidate
 */
function addIfComponent(names, candidate) {
    if (/^[A-Z]\w*$/.test(candidate)) names.add(candidate)
}
