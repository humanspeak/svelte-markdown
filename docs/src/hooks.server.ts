import { env } from '$env/dynamic/public'
import * as Sentry from '@sentry/cloudflare'
import type { Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'

const securityHeaders = {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy':
        'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin'
}

export const sentryHandle: Handle = async ({ event, resolve }) => {
    Sentry.sentryPagesPlugin(() => ({
        environment: env.PUBLIC_ENVIRONMENT ?? 'local',
        dsn: env.PUBLIC_SENTRY_DSN
    }))
    const response = await resolve(event)
    Object.entries(securityHeaders).forEach(([header, value]) => {
        response.headers.set(header, value)
    })
    return response
}

// If you have custom handlers, make sure to place them after `sentryHandle()` in the `sequence` function.
export const handle = sequence(sentryHandle)
