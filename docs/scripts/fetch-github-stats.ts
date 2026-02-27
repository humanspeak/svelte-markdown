import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUTPUT = path.resolve(__dirname, '..', 'src', 'lib', 'github-stats.json')

const REPO = 'humanspeak/svelte-markdown'
const FALLBACK_STARS = 400

async function fetchGitHubStats() {
    try {
        const res = await fetch(`https://api.github.com/repos/${REPO}`, {
            headers: { Accept: 'application/vnd.github.v3+json' }
        })

        if (!res.ok) {
            console.warn(`GitHub API returned ${res.status}, using fallback star count`)
            return { stars: FALLBACK_STARS, updatedAt: new Date().toISOString() }
        }

        const data = await res.json()
        return { stars: data.stargazers_count, updatedAt: new Date().toISOString() }
    } catch (err) {
        console.warn('Failed to fetch GitHub stats, using fallback:', err)
        return { stars: FALLBACK_STARS, updatedAt: new Date().toISOString() }
    }
}

const stats = await fetchGitHubStats()
await fs.writeFile(OUTPUT, JSON.stringify(stats, null, 2) + '\n')
console.log(`Wrote github-stats.json: ${stats.stars} stars`)
