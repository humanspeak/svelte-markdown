// Reexport your entry components here
import SvelteMarkdown from './SvelteMarkdown.svelte'
import type { TokensList, Token, SvelteMarkdownOptions } from '$lib/utils/markdown-parser.js'

export default SvelteMarkdown
export type { TokensList, Token, SvelteMarkdownOptions }
