import { generateSocialCards } from '@humanspeak/docs-kit/scripts/generate-social-cards'
import path from 'path'
import { fileURLToPath } from 'url'
import { docsConfig } from '../src/lib/docs-config'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

await generateSocialCards({
    npmPackage: docsConfig.npmPackage,
    defaultTitle: docsConfig.name,
    defaultDescription:
        'Fast, secure markdown rendering with built-in caching and snippet overrides.',
    defaultFeatures: docsConfig.defaultFeatures,
    rootDir: ROOT,
    fontsDir: path.join(ROOT, 'node_modules/@humanspeak/docs-kit/dist/fonts')
})
