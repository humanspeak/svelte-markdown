/** @desc Maps short language identifiers to human-readable display names. */
const LANG_NAMES: Record<string, string> = {
    svelte: 'Svelte',
    ts: 'TypeScript',
    typescript: 'TypeScript',
    js: 'JavaScript',
    javascript: 'JavaScript',
    bash: 'Terminal',
    shell: 'Terminal',
    html: 'HTML',
    css: 'CSS',
    json: 'JSON',
    text: 'Text'
}

/** @desc FontAwesome copy + check icons rendered inside every copy button. */
const COPY_ICON =
    '<i class="fa-solid fa-copy icon-copy" style="font-size:14px"></i>' +
    '<i class="fa-solid fa-check icon-check" style="font-size:14px"></i>'

/**
 * Extracts the copyable source code from a Shiki code block. Prefers the
 * base64-encoded `data-code` attribute (set at build time by mdsvex), falling
 * back to the `<pre>` element's text content for runtime-highlighted blocks.
 */
const getCode = (block: HTMLElement): string => {
    const encoded = block.dataset.code
    if (encoded) return atob(encoded)
    return block.querySelector('pre')?.textContent ?? ''
}

/**
 * Detects the language of a Shiki code block. Checks `data-lang` first, then
 * falls back to the Shiki-generated `<code>` element's `language-*` class.
 */
const getLang = (block: HTMLElement): string => {
    if (block.dataset.lang) return block.dataset.lang
    const codeEl = block.querySelector('code[class*="language-"]')
    const match = codeEl?.className.match(/language-(\w+)/)
    return match?.[1] ?? 'text'
}

/**
 * Scans a container for un-enhanced Shiki code blocks and injects a header bar
 * with a language label and copy-to-clipboard button into each one.
 *
 * @param {HTMLElement} container - The DOM element to scan for
 *     `.shiki-container` children.
 */
const enhance = (container: HTMLElement) => {
    const blocks = container.querySelectorAll<HTMLElement>('.shiki-container:not(.code-enhanced)')

    for (const block of blocks) {
        block.classList.add('code-enhanced')

        const lang = getLang(block)
        const title = block.dataset.title
        const label = title ?? LANG_NAMES[lang] ?? lang

        const header = document.createElement('div')
        header.className = 'code-block-header'

        const langSpan = document.createElement('span')
        langSpan.className = 'code-block-lang'
        langSpan.textContent = label

        const copyBtn = document.createElement('button')
        copyBtn.className = 'code-block-copy'
        copyBtn.setAttribute('aria-label', 'Copy code')
        copyBtn.innerHTML = COPY_ICON

        copyBtn.addEventListener('click', () => {
            const code = getCode(block)
            if (!code) return
            navigator.clipboard.writeText(code).then(() => {
                copyBtn.classList.add('copied')
                setTimeout(() => copyBtn.classList.remove('copied'), 2000)
            })
        })

        header.appendChild(langSpan)
        header.appendChild(copyBtn)
        block.prepend(header)
    }
}

/**
 * Svelte action that enhances every Shiki code block inside a node with a
 * header bar (language label + copy button). A {@link MutationObserver} watches
 * for new code blocks added by SvelteKit client-side navigations.
 *
 * @param {HTMLElement} node - The element to bind the action to (typically the
 *     content `<article>`).
 * @returns {{ destroy: () => void }} Cleanup handle that disconnects the
 *     observer.
 */
export const enhanceCodeBlocks = (node: HTMLElement) => {
    enhance(node)

    const observer = new MutationObserver(() => {
        enhance(node)
    })

    observer.observe(node, { childList: true, subtree: true })

    return {
        destroy: () => {
            observer.disconnect()
        }
    }
}
