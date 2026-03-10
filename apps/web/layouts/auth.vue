<script setup lang="ts">
const brandingStore = useBrandingStore()
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 p-4 relative"
  >
    <!-- Optional background image -->
    <div
      v-if="brandingStore.loginBgUrl"
      class="absolute inset-0 bg-cover bg-center"
      :style="{ backgroundImage: `url(${brandingStore.loginBgUrl})` }"
    >
      <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    </div>

    <div class="relative w-full max-w-md">
      <div class="mb-8 text-center">
        <img v-if="brandingStore.logoUrl" :src="brandingStore.logoUrl" :alt="brandingStore.appName" class="mx-auto h-14 w-auto mb-3" />
        <h1 class="text-3xl font-bold text-white">{{ brandingStore.appName }}</h1>
        <p class="mt-2 text-primary-200">نظام إدارة القوى العاملة - {{ brandingStore.companyName }}</p>
      </div>
      <slot />
    </div>
  </div>
</template>
