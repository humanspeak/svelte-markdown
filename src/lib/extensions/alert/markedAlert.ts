import type { MarkedExtension } from 'marked'

/**
 * Valid GitHub-style alert types.
 *
 * @see https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#alerts
 */
export type AlertType = 'note' | 'tip' | 'important' | 'warning' | 'caution'

const ALERT_TYPES: ReadonlySet<string> = new Set(['note', 'tip', 'important', 'warning', 'caution'])

/**
 * Creates a marked extension that tokenizes GitHub-style alert blockquotes
 * into custom `alert` tokens.
 *
 * The extension produces block-level tokens with
 * `{ type: 'alert', raw, text, alertType }` where `alertType` is one of
 * `note`, `tip`, `important`, `warning`, or `caution`, and `text` is the
 * alert body with leading `> ` stripped.
 *
 * Pair it with `AlertRenderer` (or your own component) to render the alerts.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import SvelteMarkdown from '@humanspeak/svelte-markdown'
 *   import { markedAlert, AlertRenderer } from '@humanspeak/svelte-markdown/extensions'
 *
 *   const renderers = { alert: AlertRenderer }
 * </script>
 *
 * <SvelteMarkdown
 *   source={markdown}
 *   extensions={[markedAlert()]}
 *   {renderers}
 * />
 * ```
 *
 * @returns A `MarkedExtension` with a single block-level `alert` tokenizer
 */
export function markedAlert(): MarkedExtension {
    return {
        extensions: [
            {
                name: 'alert',
                level: 'block',
                start(src: string) {
                    return src.match(/>\s*\[!/)?.index
                },
                tokenizer(src: string) {
                    const match = src.match(
                        /^(?:>\s*\[!(\w+)\]\n)((?:[^\n]*(?:\n(?:>\s?)[^\n]*)*)?)(?:\n|$)/
                    )
                    if (match) {
                        const alertType = match[1].toLowerCase()
                        if (!ALERT_TYPES.has(alertType)) return
                        const text = match[2]
                            .split('\n')
                            .map((line: string) => line.replace(/^>\s?/, ''))
                            .join('\n')
                            .trim()
                        return {
                            type: 'alert',
                            raw: match[0],
                            text,
                            alertType: alertType as AlertType
                        }
                    }
                }
            }
        ]
    }
}
