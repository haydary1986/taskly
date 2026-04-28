/**
 * Force the service-worker bootstrap files to never cache, otherwise
 * a deploy can take hours to reach existing users (Cloudflare/Coolify
 * default static-asset cache wins over Nuxt routeRules for files in
 * the build output).
 */
export default defineEventHandler((event) => {
  const url = event.node.req.url || ''
  if (
    url === '/sw.js' ||
    url === '/manifest.webmanifest' ||
    url.startsWith('/workbox-')
  ) {
    setHeader(event, 'Cache-Control', 'no-cache, no-store, must-revalidate')
  }
})
