import { dev } from '$app/environment'
import { env as publicEnv } from '$env/dynamic/public'
import rootPkg from '../../../package.json'
import type { PageServerLoad } from './$types'

/**
 * Surfaces package stats to the homepage from worker env vars that
 * `docs/scripts/deploy.ts` populates at deploy time (via
 * `wrangler deploy --var ...`). Dev/preview always falls back to the
 * workspace `package.json` for the version; tarball and unpacked
 * sizes show `null` (rendered as `—`) until a deploy has set them.
 *
 * In `dev` we substitute a representative tarball/unpacked size so
 * the stats row previews correctly without needing a deploy round-trip.
 * Production reads the live worker vars and ignores these placeholders.
 *
 * Keeping the source of truth on the worker means the homepage shows
 * the freshest published numbers without committing a JSON snapshot.
 */

// Representative numbers for dev mode only. Last refreshed by hand from
// `npm view @humanspeak/svelte-markdown dist` — they're a sighting tool,
// not a source of truth.
const DEV_TARBALL_BYTES = 81458
const DEV_UNPACKED_BYTES = 324332

export const load: PageServerLoad = () => {
    const tarballRaw = publicEnv.PUBLIC_SVM_TARBALL_BYTES
    const unpackedRaw = publicEnv.PUBLIC_SVM_UNPACKED_BYTES
    const tarballEnv = tarballRaw ? Number(tarballRaw) : null
    const unpackedEnv = unpackedRaw ? Number(unpackedRaw) : null
    const tarballBytes = Number.isFinite(tarballEnv) ? tarballEnv : dev ? DEV_TARBALL_BYTES : null
    const unpackedBytes = Number.isFinite(unpackedEnv)
        ? unpackedEnv
        : dev
          ? DEV_UNPACKED_BYTES
          : null

    return {
        packageStats: {
            name: rootPkg.name,
            version: publicEnv.PUBLIC_SVM_VERSION ?? rootPkg.version,
            tarballBytes,
            unpackedBytes,
            updatedAt: publicEnv.PUBLIC_SVM_STATS_AT ?? null
        }
    }
}
