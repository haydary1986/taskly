import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs'

/** @type {import('next').NextConfig} */
const nextConfig = {}

// Wrap with Payload first, then Sentry
const payloadConfig = withPayload(nextConfig)

export default withSentryConfig(payloadConfig, {
    // Sentry build options
    org: process.env.SENTRY_ORG || '',
    project: process.env.SENTRY_PROJECT || '',
    authToken: process.env.SENTRY_AUTH_TOKEN || '',

    // Silently fail if Sentry is not configured
    silent: !process.env.SENTRY_AUTH_TOKEN,

    // Disable source map upload if no auth token
    disableServerWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,
    disableClientWebpackPlugin: !process.env.SENTRY_AUTH_TOKEN,

    // Hide source maps in production
    hideSourceMaps: true,

    // Automatically tree-shake Sentry logger if not enabled
    disableLogger: true,
})
