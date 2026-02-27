import { env } from '$env/dynamic/public'
import manifestData from '$lib/sitemap-manifest.json'
import type { RequestHandler } from '@sveltejs/kit'

// Type the manifest with an index signature for path lookups
const manifest: Record<string, string> = manifestData

// Eager=false keeps build light; we only need the keys for paths
const pageFiles = Object.keys(
    import.meta.glob('/src/routes/**/+page.{svelte,svx,md}', { eager: false })
)

/**
 * Converts a file path to a route path.
 * Strips /src/routes and "+page.*" suffix; default root to '/'.
 *
 * @param file - The file path to convert
 * @returns The route path
 */
function toPath(file: string): string {
    const p = file.replace('/src/routes', '').replace(/\/\+page\.(svelte|svx|md)$/i, '')
    return p === '' ? '/' : p
}

/**
 * Returns a priority value for a given route path.
 * Homepage gets highest priority, key docs pages next, examples after, rest lower.
 */
function getPriority(path: string): string {
    if (path === '/') return '1.0'
    if (path === '/docs/getting-started' || path.startsWith('/docs/api/')) return '0.9'
    if (path.startsWith('/docs/renderers/') || path.startsWith('/docs/advanced/')) return '0.8'
    if (path.startsWith('/examples') || path.startsWith('/docs/examples')) return '0.7'
    return '0.5'
}

/**
 * Returns a changefreq value for a given route path.
 */
function getChangefreq(path: string): string {
    if (path === '/') return 'weekly'
    return 'monthly'
}

export const GET: RequestHandler = async ({ url }) => {
    const base = (env.PUBLIC_SITE_URL || `${url.origin}`).replace(/\/$/, '')

    // Unique, sorted, and exclude private/underscore folders
    const routes = [...new Set(pageFiles.map(toPath))]
        .filter((p) => !/\/_(?:.*)|\/(?:\+|__)/.test(p))
        .sort()

    const today = new Date().toISOString().slice(0, 10)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes
        .map(
            (p) =>
                `  <url>\n    <loc>${base}${p}</loc>\n    <lastmod>${manifest[p] || today}</lastmod>\n    <changefreq>${getChangefreq(p)}</changefreq>\n    <priority>${getPriority(p)}</priority>\n  </url>`
        )
        .join('\n')}\n</urlset>`

    return new Response(xml, {
        headers: {
            'Content-Type': 'application/xml',
            // CDN caches for 1 hour; browsers get latest on next request
            'Cache-Control': 'max-age=0, s-maxage=3600'
        }
    })
}
