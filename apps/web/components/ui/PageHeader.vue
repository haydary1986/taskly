<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
  backTo?: string
  backLabel?: string
}

withDefaults(defineProps<Props>(), {
  subtitle: '',
  backTo: '',
  backLabel: '← رجوع',
})
</script>

<template>
  <div class="mb-6">
    <NuxtLink v-if="backTo" :to="backTo" class="text-sm text-primary-600 hover:underline mb-1 block">
      {{ backLabel }}
    </NuxtLink>
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div class="min-w-0">
        <h1 class="text-xl sm:text-2xl font-bold text-gray-900 truncate">{{ title }}</h1>
        <p v-if="subtitle" class="text-sm text-gray-500 mt-0.5">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="flex items-center gap-2 flex-wrap">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>
