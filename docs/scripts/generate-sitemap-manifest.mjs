import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join, resolve as resolvePath } from 'node:path'

const ROOT = resolvePath(process.cwd(), 'src', 'routes')

/** Convert a +page file path to a route path */
function toRoutePath(file) {
    let p = file.replace(ROOT, '')
    p = p.replace(/\/\+page\.(svelte|svx|md)$/i, '')
    return p === '' ? '/' : p
}

/** Recursively find +page files */
async function findPageFiles(dir, out = []) {
    const entries = await readdir(dir, { withFileTypes: true })
    for (const e of entries) {
        const full = join(dir, e.name)
        if (e.isDirectory()) {
            await findPageFiles(full, out)
        } else if (/\+page\.(svelte|svx|md)$/i.test(e.name)) {
            out.push(full)
        }
    }
    return out
}

/**
 * Load example metadata from individual +page.ts files
 * @param {string} examplePath - Path to the example directory
 * @returns {Promise<Object|null>} Example metadata or null if not found
 */
async function loadExampleMetadata(examplePath) {
    try {
        const pageTs = join(examplePath, '+page.ts')
        const content = await readFile(pageTs, 'utf8')

        // Extract title from the load function return
        const titleMatch = content.match(/title:\s*['"`]([^'"`]+)['"`]/)
        const sourceUrlMatch = content.match(/sourceUrl:\s*['"`]([^'"`]+)['"`]/)

        if (titleMatch) {
            return {
                title: titleMatch[1],
                sourceUrl: sourceUrlMatch?.[1] || null
            }
        }
    } catch {
        // File doesn't exist or can't be read, that's okay
    }
    return null
}

/**
 * Generate example metadata for the examples landing page
 * @param {Object} manifest - The sitemap manifest
 * @returns {Promise<Object>} Examples metadata object
 */
async function generateExamplesMetadata(manifest) {
    const exampleRoutes = Object.keys(manifest)
        .filter((route) => route.startsWith('/examples/') && route !== '/examples')
        .sort()

    const examples = {}

    for (const route of exampleRoutes) {
        const slug = route.replace('/examples/', '')
        const examplePath = join(ROOT, 'examples', slug)

        // Try to load metadata from the example's +page.ts file
        const metadata = await loadExampleMetadata(examplePath)

        if (metadata) {
            const title = metadata.title
            examples[slug] = {
                title,
                description: `Interactive ${title.toLowerCase()} animation example using Svelte Motion.`,
                sourceUrl: metadata.sourceUrl
            }
        } else {
            // Fallback: generate from slug
            const title = slug
                .split('-')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')

            examples[slug] = {
                title,
                description: `Interactive ${title.toLowerCase()} animation example using Svelte Motion.`,
                sourceUrl: null
            }
        }
    }

    return examples
}

/**
 * Update the examples +page.ts file with the latest example metadata
 * @param {Object} examples - Examples metadata object
 */
async function updateExamplesPageTs(examples) {
    const examplesPageTs = resolvePath(process.cwd(), 'src', 'routes', 'examples', '+page.ts')

    try {
        let content = await readFile(examplesPageTs, 'utf8')

        // Find the examples object in the file and replace it
        // More robust regex that matches the entire examples object declaration
        const examplesObjectRegex = /const examples\s*=\s*\{[\s\S]*?\n\s*\}(?=\s*\n\s*return)/
        const newExamplesObject = `const examples = ${JSON.stringify(examples, null, 4).replace(/^/gm, '    ').trim()}`

        if (examplesObjectRegex.test(content)) {
            content = content.replace(examplesObjectRegex, newExamplesObject)
            await writeFile(examplesPageTs, content, 'utf8')
            console.log(`Updated examples metadata in ${examplesPageTs}`)
        } else {
            console.warn(`Could not find examples object pattern in ${examplesPageTs}`)
        }
    } catch (error) {
        console.warn(`Could not update examples page: ${error.message}`)
    }
}

async function main() {
    const files = await findPageFiles(ROOT)
    const manifest = {}
    for (const file of files) {
        const s = await stat(file)
        const route = toRoutePath(file)
        // Non-recursive lastmod: use the +page file's mtime only
        manifest[route] = new Date(s.mtimeMs).toISOString().slice(0, 10)
    }

    const dest = resolvePath(process.cwd(), 'src', 'lib', 'sitemap-manifest.json')
    await writeFile(dest, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    console.log(`Sitemap manifest written to ${dest}`)

    // Generate and update examples metadata
    const examples = await generateExamplesMetadata(manifest)
    await updateExamplesPageTs(examples)
}

main().catch((err) => {
    console.error(err)
    process.exit(1)
})
