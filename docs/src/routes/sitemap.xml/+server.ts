import { docsConfig } from '$lib/docs-config'
import manifest from '$lib/sitemap-manifest.json'
import { createSitemapResponse } from '@humanspeak/docs-kit/server'
import type { RequestHandler } from '@sveltejs/kit'

/**
 * Returns a priority value for a given route path.
 * Homepage gets highest priority, key docs pages next, examples and
 * comparison pages after, the rest lower.
 */
function getPriority(path: string): string {
    if (path === '/') return '1.0'
    if (path === '/docs/getting-started' || path.startsWith('/docs/api/')) return '0.9'
    if (path.startsWith('/docs/renderers/') || path.startsWith('/docs/advanced/')) return '0.8'
    if (path.startsWith('/examples') || path.startsWith('/docs/examples')) return '0.7'
    if (path === '/compare') return '0.8'
    if (path.startsWith('/compare/')) return '0.7'
    return '0.5'
}

export const GET: RequestHandler = () =>
    createSitemapResponse({
        manifest,
        siteUrl: docsConfig.url,
        getPriority
    })
