import { env } from '$env/dynamic/public'
import * as Sentry from '@sentry/sveltekit'
import { handleErrorWithSentry, sentryHandle } from '@sentry/sveltekit'
import { sequence } from '@sveltejs/kit/hooks'

Sentry.init({
    dsn: env.PUBLIC_SENTRY_DSN,
    environment: env.PUBLIC_ENVIRONMENT ?? 'local',

    tracesSampleRate: 1.0

    // uncomment the line below to enable Spotlight (https://spotlightjs.com)
    // spotlight: import.meta.env.DEV,
})

// If you have custom handlers, make sure to place them after `sentryHandle()` in the `sequence` function.
export const handle = sequence(sentryHandle())

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry()
