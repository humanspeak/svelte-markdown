import { dev } from '$app/environment'
import { createPackageStatsLoad } from '@humanspeak/docs-kit/server'
import rootPkg from '../../../package.json'

/**
 * Homepage surfaces live package stats fetched from the npm registry at
 * request time. The fetch + cache pattern lives in
 * `@humanspeak/docs-kit/server` so every Humanspeak docs site can wire
 * it in two lines.
 *
 * Dev fallback uses representative sizes so the design previews
 * correctly without a network round-trip; production never substitutes
 * fake values — missing data renders as `—`.
 *
 * IMPORTANT: do not set `export const prerender = true` here.
 * Prerendering would freeze the stats at build time and reintroduce the
 * staleness problem this loader exists to solve.
 */
export const prerender = false

export const load = createPackageStatsLoad({
    pkg: rootPkg,
    dev,
    devFallback: { tarballBytes: 81458, unpackedBytes: 324332 }
})
