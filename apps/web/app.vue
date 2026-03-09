<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  // Aggressively unregister service workers to break any PWA refresh loops
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister()
      }
    })
  }
})
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
</template>
