import { checkFavicon, generateFavicon } from '@humanspeak/docs-kit/scripts/favicon'
import { preview } from 'vite'

const logo = 'src/lib/assets/logo.svg'

if (process.argv.includes('--generate')) {
    await generateFavicon(logo)
} else {
    const server = await preview({ preview: { host: '127.0.0.1', port: 0, open: false } })
    try {
        await checkFavicon({
            origin: server.resolvedUrls.local[0],
            logo,
            paths: ['/', '/docs/migration']
        })
    } finally {
        await server.close()
    }
}

// Cloudflare preview emulators can keep handles alive after Vite closes.
// Reaching here means all assertions and preview cleanup succeeded.
process.exit(0)
