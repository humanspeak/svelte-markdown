import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

import { normalizeDimensionsForSatori } from '@humanspeak/svelte-satori-fix'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { html as toReactNode } from 'satori-html'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

const CONCURRENCY = 8

// ---------- types ----------

type CardType = 'og' | 'twitter'

interface PageSeoData {
    ogTitle: string
    ogTagline: string
    ogFeatures: string[]
    ogSlug: string
}

interface CardTask {
    type: CardType
    title: string
    description: string
    features: string[]
    filename: string
}

// ---------- HTML template (mirrors OG.svelte output) ----------

function buildOgHtml(opts: {
    type: CardType
    title: string
    description: string
    features: string[]
    humanspeakSvgDataUri: string
    svelteSvgDataUri: string
}): string {
    const { type, title, description, features, humanspeakSvgDataUri, svelteSvgDataUri } = opts
    const dims = type === 'og' ? { width: 1200, height: 630 } : { width: 1200, height: 600 }
    const titleFontSize = type === 'og' ? '6rem' : '4.5rem'
    const descFontSize = type === 'og' ? '2.25rem' : '1.875rem'
    const displayFeatures = features.slice(0, 4)

    return `<div style="display: flex; flex-direction: column; position: relative; overflow: hidden; background-color: #0a0a0a; padding: 4rem; color: #ffffff; width: ${dims.width}px; height: ${dims.height}px; font-family: 'lato';">
    <div style="display: flex; position: absolute; top: -10rem; right: -10rem; height: 40rem; width: 40rem; border-radius: 9999px; background-image: radial-gradient(circle, rgba(255, 62, 0, 1) 0%, rgba(255, 62, 0, 0) 70%); opacity: 0.3;"></div>
    <div style="display: flex; position: absolute; bottom: -10rem; left: -10rem; height: 700px; width: 700px; border-radius: 9999px; background-image: radial-gradient(circle, rgba(0, 216, 255, 1) 0%, rgba(0, 216, 255, 0) 70%); opacity: 0.15;"></div>
    <div style="display: flex; position: absolute; top: 0; right: 0; bottom: 0; left: 0; background-image: linear-gradient(to right, #80808012 1px, transparent 1px), linear-gradient(to bottom, #80808012 1px, transparent 1px); background-size: 24px 24px;"></div>
    <div style="display: flex; position: relative; height: 100%; flex-direction: column; justify-content: space-between;">
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; align-items: center; align-self: flex-start; gap: 0.5rem; border-radius: 9999px; border: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(255, 255, 255, 0.05); padding: 0.5rem 1rem; font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; letter-spacing: 0.025em; color: rgba(255, 255, 255, 0.8); text-transform: uppercase; font-family: 'lato';">
                <img src="${humanspeakSvgDataUri}" width="16" height="16" style="height: 1rem; width: 1rem; opacity: 0.8;" />
                <span>@humanspeak/svelte-markdown</span>
            </div>
            <h1 style="margin: 0; font-size: ${titleFontSize}; line-height: 1.1; font-weight: 800; letter-spacing: -0.05em; font-family: 'lato-extrabold';">${title}</h1>
            <p style="margin: 0; font-size: ${descFontSize}; line-height: 1.375; max-width: 64rem; font-weight: 500; color: rgba(255, 255, 255, 0.7); font-family: 'lato';">${description}</p>
        </div>
        <div style="display: flex; flex-wrap: wrap; gap: 1rem;">
            ${displayFeatures
                .map(
                    (f) =>
                        `<div style="display: flex; align-items: center; gap: 0.75rem; border-radius: 0.75rem; border: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(255, 255, 255, 0.05); padding: 1rem 1.5rem; font-size: 1.25rem; line-height: 1.75rem; font-weight: 500; color: rgba(255, 255, 255, 0.9); box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); font-family: 'lato';"><div style="display: flex; height: 0.625rem; width: 0.625rem; border-radius: 9999px; background-color: #ff3e00; box-shadow: 0 0 8px #ff3e00;"></div><span>${f}</span></div>`
                )
                .join('')}
        </div>
        <div style="display: flex; width: 100%; align-items: center; justify-content: space-between;">
            <div style="display: flex; align-items: center; gap: 1.5rem;">
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <img src="${humanspeakSvgDataUri}" width="48" height="48" style="height: 3rem; width: 3rem; opacity: 0.9;" />
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 0.875rem; line-height: 1.25rem; font-weight: 600; letter-spacing: 0.05em; color: rgba(255, 255, 255, 0.5); text-transform: uppercase; font-family: 'lato';">Created by</span>
                        <span style="font-size: 1.5rem; line-height: 2rem; font-weight: 700; letter-spacing: -0.025em; font-family: 'lato-extrabold';">Humanspeak</span>
                    </div>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 1rem; border-radius: 1rem; border: 1px solid rgba(255, 255, 255, 0.1); background-color: rgba(255, 255, 255, 0.05); padding: 1rem; padding-right: 1.5rem; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);">
                <img src="${svelteSvgDataUri}" width="48" height="48" style="height: 3rem; width: 3rem;" />
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 0.75rem; line-height: 1rem; font-weight: 600; letter-spacing: 0.05em; color: #ff3e00; text-transform: uppercase; font-family: 'lato';">Built for</span>
                    <span style="font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; letter-spacing: -0.025em; font-family: 'lato-extrabold';">Svelte 5</span>
                </div>
            </div>
        </div>
    </div>
</div>`
}

// ---------- discover pages ----------

async function discoverPages(): Promise<PageSeoData[]> {
    const routesDir = path.join(ROOT, 'src/routes')
    const pages: PageSeoData[] = []

    async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true })
        for (const entry of entries) {
            const full = path.join(dir, entry.name)
            if (entry.isDirectory()) {
                await walk(full)
            } else if (entry.name.match(/^\+page\.(svelte|svx)$/)) {
                const content = await fs.readFile(full, 'utf-8')
                const slugMatch = content.match(/seo\.ogSlug\s*=\s*['"`]([^'"`]+)['"`]/)
                if (!slugMatch) continue

                const titleMatch = content.match(/seo\.ogTitle\s*=\s*['"`]([^'"`]+)['"`]/)
                const taglineMatch = content.match(/seo\.ogTagline\s*=\s*['"`]([^'"`]+)['"`]/)
                const featuresMatch = content.match(/seo\.ogFeatures\s*=\s*\[([^\]]+)\]/)

                const ogSlug = slugMatch[1]
                const ogTitle = titleMatch?.[1] ?? ogSlug
                const ogTagline = taglineMatch?.[1] ?? ''
                const ogFeatures = featuresMatch
                    ? featuresMatch[1]
                          .split(',')
                          .map((s) => s.trim().replace(/^['"`]|['"`]$/g, ''))
                          .filter(Boolean)
                    : []

                pages.push({ ogSlug, ogTitle, ogTagline, ogFeatures })
            }
        }
    }

    await walk(routesDir)
    return pages
}

// ---------- generate a single card ----------

async function generateCard(
    task: CardTask,
    fonts: satori.Font[],
    humanspeakSvgDataUri: string,
    svelteSvgDataUri: string
): Promise<void> {
    const dims = task.type === 'og' ? { width: 1200, height: 630 } : { width: 1200, height: 600 }

    const html = buildOgHtml({
        type: task.type,
        title: task.title,
        description: task.description,
        features: task.features,
        humanspeakSvgDataUri,
        svelteSvgDataUri
    })

    const element = normalizeDimensionsForSatori(toReactNode(html))
    const svg = await satori(element, {
        width: dims.width,
        height: dims.height,
        fonts
    })

    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: dims.width } })
    const image = resvg.render()
    const png = image.asPng()

    const outDir = path.join(ROOT, 'static/social-cards')
    await fs.mkdir(outDir, { recursive: true })
    await fs.writeFile(path.join(outDir, task.filename), png)
}

// ---------- main ----------

async function main() {
    const startTime = Date.now()

    // Load fonts
    const [latoRegular, latoExtraBold, latoExtraBoldItalic] = await Promise.all([
        fs.readFile(path.join(ROOT, 'src/lib/fonts/lato/Lato-Regular.ttf')),
        fs.readFile(path.join(ROOT, 'src/lib/fonts/lato/Lato-ExtraBold.ttf')),
        fs.readFile(path.join(ROOT, 'src/lib/fonts/lato/Lato-ExtraBoldItalic.ttf'))
    ])

    const fonts: satori.Font[] = [
        { name: 'lato', data: latoRegular, style: 'normal' },
        { name: 'lato-extrabold', data: latoExtraBold, style: 'normal' },
        { name: 'lato-extrabolditalic', data: latoExtraBoldItalic, style: 'italic' }
    ]

    // Load SVGs as data URIs for satori image embedding
    const [humanspeakSvg, svelteSvg] = await Promise.all([
        fs.readFile(path.join(ROOT, 'static/humanspeak-dark.svg')),
        fs.readFile(path.join(ROOT, 'static/svelte-logo.svg'))
    ])
    const humanspeakSvgDataUri = `data:image/svg+xml;base64,${humanspeakSvg.toString('base64')}`
    const svelteSvgDataUri = `data:image/svg+xml;base64,${svelteSvg.toString('base64')}`

    // Discover pages with SEO data
    const pages = await discoverPages()
    console.log(`Found ${pages.length} pages with social card data`)

    // Build task list: per-page og + twitter variants, plus defaults
    const defaultTitle = 'Svelte Markdown'
    const defaultDescription =
        'Fast, secure markdown rendering with built-in caching and snippet overrides.'
    const defaultFeatures = [
        'Svelte 5 Runes',
        'TypeScript First',
        '50-200x Caching',
        'Marked Extensions'
    ]

    const tasks: CardTask[] = []

    // Default images (written to static/ root, not social-cards/)
    for (const type of ['og', 'twitter'] as CardType[]) {
        tasks.push({
            type,
            title: defaultTitle,
            description: defaultDescription,
            features: defaultFeatures,
            filename: `../${type}-default.png`
        })
    }

    // Per-page images
    for (const page of pages) {
        for (const type of ['og', 'twitter'] as CardType[]) {
            tasks.push({
                type,
                title: page.ogTitle,
                description: page.ogTagline,
                features: page.ogFeatures,
                filename: `${type}-${page.ogSlug}.png`
            })
        }
    }

    console.log(`Generating ${tasks.length} social card images...`)

    // Process in batches
    let completed = 0
    for (let i = 0; i < tasks.length; i += CONCURRENCY) {
        const batch = tasks.slice(i, i + CONCURRENCY)
        await Promise.all(
            batch.map(async (task) => {
                await generateCard(task, fonts, humanspeakSvgDataUri, svelteSvgDataUri)
                completed++
                console.log(`  [${completed}/${tasks.length}] ${task.type}: ${task.title}`)
            })
        )
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(`\nDone! Generated ${tasks.length} images in ${elapsed}s`)
}

main().catch((err) => {
    console.error('Error generating social cards:', err)
    process.exit(1)
})
