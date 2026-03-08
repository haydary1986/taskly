<script setup lang="ts">
const { toasts, remove } = useToast()

const typeStyles: Record<string, string> = {
  success: 'bg-green-500 border-green-600',
  error: 'bg-red-500 border-red-600',
  info: 'bg-blue-500 border-blue-600',
  warning: 'bg-amber-500 border-amber-600',
}

const typeIcons: Record<string, string> = {
  success: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  error: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  warning: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z',
}
</script>

<template>
  <Teleport to="body">
    <div class="fixed top-4 left-4 z-[100] flex flex-col gap-3 max-w-sm" dir="rtl">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="flex items-center gap-3 rounded-xl border px-4 py-3 text-white shadow-xl backdrop-blur-sm"
          :class="typeStyles[toast.type]"
        >
          <svg class="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" :d="typeIcons[toast.type]" />
          </svg>
          <p class="flex-1 text-sm font-medium">{{ toast.message }}</p>
          <button @click="remove(toast.id)" class="shrink-0 rounded-lg p-1 hover:bg-white/20 transition-colors">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.35s ease-out;
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(-30px) scale(0.95);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
