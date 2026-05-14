/**
 * Deploy wrapper for the docs Worker.
 *
 * Pulls the workspace package version from the root `package.json`, asks
 * the npm registry for the tarball + unpacked sizes, and forwards them
 * to `wrangler deploy` as runtime `--var` flags so the Worker has
 * fresh stats without committing a JSON file or baking values into the
 * bundle. The homepage reads them via `$env/dynamic/public`.
 *
 * Stats fetch is best-effort: if the registry is unreachable (e.g. a
 * fresh release that hasn't propagated yet) we deploy without the
 * tarball/unpacked vars and the page falls back to a `—` placeholder.
 */

import { spawnSync } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_PKG = path.resolve(__dirname, '..', '..', 'package.json')
const FETCH_TIMEOUT_MS = 8000

interface RegistryDist {
    fileCount?: number
    unpackedSize?: number
    tarball?: string
}
interface RegistryVersionRecord {
    name?: string
    version?: string
    dist?: RegistryDist
}
interface PackageStats {
    tarballBytes: number | null
    unpackedBytes: number | null
}

const fetchWithTimeout = async (url: string): Promise<Response> => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    try {
        return await fetch(url, { signal: ctrl.signal })
    } finally {
        clearTimeout(t)
    }
}

const fetchPackageStats = async (name: string, version: string): Promise<PackageStats> => {
    try {
        const url = `https://registry.npmjs.org/${encodeURIComponent(name)}/${encodeURIComponent(version)}`
        const res = await fetchWithTimeout(url)
        if (!res.ok) throw new Error(`registry ${res.status} ${res.statusText}`)
        const record = (await res.json()) as RegistryVersionRecord
        const dist = record.dist
        let tarballBytes: number | null = null
        if (dist?.tarball) {
            try {
                const head = await fetchWithTimeout(dist.tarball)
                const len = head.headers.get('content-length')
                if (head.ok && len) tarballBytes = Number(len)
            } catch {
                /* tarball HEAD optional */
            }
        }
        return { tarballBytes, unpackedBytes: dist?.unpackedSize ?? null }
    } catch (err) {
        const reason = err instanceof Error ? err.message : String(err)
        console.warn(`[deploy] stats fetch failed (${reason}); deploying without size vars`)
        return { tarballBytes: null, unpackedBytes: null }
    }
}

const main = async (): Promise<void> => {
    const rootPkg = JSON.parse(await fs.readFile(ROOT_PKG, 'utf8')) as {
        name: string
        version: string
    }
    const { tarballBytes, unpackedBytes } = await fetchPackageStats(rootPkg.name, rootPkg.version)

    const extraArgs = process.argv.slice(2)
    const args = ['deploy', ...extraArgs, '--var', `PUBLIC_SVM_VERSION:${rootPkg.version}`]
    args.push('--var', `PUBLIC_SVM_STATS_AT:${new Date().toISOString()}`)
    if (tarballBytes !== null) args.push('--var', `PUBLIC_SVM_TARBALL_BYTES:${tarballBytes}`)
    if (unpackedBytes !== null) args.push('--var', `PUBLIC_SVM_UNPACKED_BYTES:${unpackedBytes}`)

    const kb = (n: number | null) => (n === null ? '—' : `${Math.round(n / 102.4) / 10} kB`)
    console.log(
        `[deploy] ${rootPkg.name}@${rootPkg.version} · tarball ${kb(tarballBytes)} · unpacked ${kb(unpackedBytes)}`
    )
    console.log(`[deploy] wrangler ${args.map((a) => (a.includes(':') ? `'${a}'` : a)).join(' ')}`)

    const result = spawnSync('wrangler', args, { stdio: 'inherit' })
    process.exit(result.status ?? 1)
}

await main()
