import { env } from '$env/dynamic/public'
import type { HandleClientError } from '@sveltejs/kit'
import posthog from 'posthog-js'

export async function init() {
    if (!env.PUBLIC_POSTHOG_PROJECT_TOKEN || !env.PUBLIC_POSTHOG_HOST) {
        return
    }

    posthog.init(env.PUBLIC_POSTHOG_PROJECT_TOKEN, {
        ['api_host']: env.PUBLIC_POSTHOG_HOST,
        ['ui_host']: 'https://us.posthog.com',
        defaults: '2026-01-30',
        ['capture_exceptions']: true
    })
}

export const handleError: HandleClientError = async ({ error, status, message }) => {
    posthog.captureException(error)

    return {
        message,
        status
    }
}
