import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.SENTRY_DSN || '',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Environment
    environment: process.env.NODE_ENV || 'development',

    // Only send errors in production (or when DSN is set)
    enabled: !!process.env.SENTRY_DSN,

    // Filter out non-error events
    beforeSend(event) {
        // Don't send 4xx errors (user mistakes, not system errors)
        if (event.contexts?.response) {
            const status = (event.contexts.response as any).status_code
            if (status && status >= 400 && status < 500) return null
        }
        return event
    },

    // Tag with app info
    initialScope: {
        tags: {
            app: 'taskly-api',
        },
    },
})
