export default defineNuxtPlugin(async () => {
  const brandingStore = useBrandingStore()
  await brandingStore.fetch()
})
