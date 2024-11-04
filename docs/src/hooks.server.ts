import { env } from '$env/dynamic/public'
import * as Sentry from '@sentry/cloudflare'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

export const sentryHandle: Handle = async ({ event, resolve }) => {
    Sentry.sentryPagesPlugin(() => ({
        environment: env.PUBLIC_ENVIRONMENT ?? 'local',
        dsn: env.PUBLIC_SENTRY_DSN
    }))
    return await resolve(event)
}

// If you have custom handlers, make sure to place them after `sentryHandle()` in the `sequence` function.
export const handle = sequence(sentryHandle)
