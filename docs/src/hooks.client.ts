import { PUBLIC_POSTHOG_HOST, PUBLIC_POSTHOG_PROJECT_TOKEN } from '$app/env/public'
import type { HandleClientError } from '@sveltejs/kit/hooks'
import posthog from 'posthog-js'

export async function init() {
    if (!PUBLIC_POSTHOG_PROJECT_TOKEN || !PUBLIC_POSTHOG_HOST) {
        return
    }

    posthog.init(PUBLIC_POSTHOG_PROJECT_TOKEN, {
        ['api_host']: PUBLIC_POSTHOG_HOST,
        ['ui_host']: 'https://us.posthog.com',
        defaults: '2026-01-30',
        ['capture_exceptions']: true
    })
}

// Kit 3 routes expected errors (404s, `error()` calls) through this hook too;
// only report genuinely unexpected ones, as Kit 2 did. Returning nothing keeps
// SvelteKit's default status and message.
export const handleError: HandleClientError = ({ kind, error }) => {
    if (kind === 'unknown') posthog.captureException(error)
}
