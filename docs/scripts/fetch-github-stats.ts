import { fetchGitHubStats } from '@humanspeak/docs-kit/scripts/fetch-github-stats'
import path from 'path'
import { fileURLToPath } from 'url'
import { docsConfig } from '../src/lib/docs-config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

await fetchGitHubStats({
    repo: docsConfig.repo,
    fallbackStars: docsConfig.fallbackStars,
    outputPath: path.resolve(__dirname, '..', 'src', 'lib', 'github-stats.json')
})
