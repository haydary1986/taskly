export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.siteUrl || 'https://taskly.algo-nest.com'

  const urls = [
    { loc: '/services', priority: '1.0', changefreq: 'weekly' },
  ]

  // Fetch active products/services for dynamic URLs
  try {
    const res = await $fetch<{ docs: any[] }>(`${config.public.apiBase}/api/v1/public/services`)
    if (res?.docs) {
      for (const product of res.docs) {
        urls.push({
          loc: `/services#${product.id}`,
          priority: '0.8',
          changefreq: 'weekly',
        })
      }
    }
  } catch {
    // Continue with static URLs only
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${baseUrl}${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>`

  setResponseHeader(event, 'content-type', 'application/xml')
  return xml
})
