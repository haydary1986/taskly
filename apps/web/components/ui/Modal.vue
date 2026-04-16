<script setup lang="ts">
type Size = 'sm' | 'md' | 'lg' | 'xl'

interface Props {
  open: boolean
  title?: string
  subtitle?: string
  size?: Size
  /** Use bottom-sheet style on mobile (useful for action modals on phones) */
  sheetOnMobile?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  size: 'md',
  sheetOnMobile: true,
})

const emit = defineEmits<{ close: [] }>()

const sizeClass = computed(() => {
  const map: Record<Size, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  }
  return map[props.size]
})

const wrapperClass = computed(() =>
  props.sheetOnMobile
    ? 'fixed inset-0 z-[1000] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4'
    : 'fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4',
)

const containerClass = computed(() =>
  props.sheetOnMobile
    ? `w-full ${sizeClass.value} rounded-t-2xl sm:rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto`
    : `w-full ${sizeClass.value} rounded-xl bg-white p-5 shadow-xl max-h-[90vh] overflow-y-auto`,
)

function handleBackdropClick(e: MouseEvent): void {
  if (e.target === e.currentTarget) emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div v-if="open" :class="wrapperClass" @click="handleBackdropClick">
        <div :class="containerClass">
          <div v-if="title || $slots.header" class="mb-4 flex items-start justify-between gap-3">
            <div class="min-w-0">
              <slot name="header">
                <h2 class="text-base font-bold text-gray-900">{{ title }}</h2>
                <p v-if="subtitle" class="text-xs text-gray-500 mt-0.5">{{ subtitle }}</p>
              </slot>
            </div>
            <button
              type="button"
              class="text-gray-400 hover:text-gray-600 text-lg leading-none shrink-0"
              aria-label="إغلاق"
              @click="emit('close')"
            >✕</button>
          </div>

          <slot />

          <div v-if="$slots.footer" class="mt-4 flex items-center gap-2">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
