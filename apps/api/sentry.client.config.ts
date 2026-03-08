import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',
    tracesSampleRate: 0.2,
    environment: process.env.NODE_ENV || 'development',
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 0,
    initialScope: {
        tags: { app: 'taskly-api-client' },
    },
})
