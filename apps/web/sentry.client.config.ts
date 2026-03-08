import * as Sentry from '@sentry/nuxt'

const config = useRuntimeConfig()

Sentry.init({
    dsn: config.public.sentryDsn as string || '',
    tracesSampleRate: 0.2,
    environment: import.meta.dev ? 'development' : 'production',
    enabled: !!(config.public.sentryDsn),
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    initialScope: {
        tags: { app: 'taskly-web' },
    },
})
