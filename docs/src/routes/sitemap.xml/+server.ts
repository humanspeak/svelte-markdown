import { docsConfig } from '#lib/docs-config.js'
import manifest from '#lib/sitemap-manifest.json'
import { createSitemapResponse } from '@humanspeak/docs-kit/server'
import type { RequestHandler } from '@sveltejs/kit'

export const GET: RequestHandler = () =>
    createSitemapResponse({
        manifest,
        siteUrl: docsConfig.url
    })
