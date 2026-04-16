<script setup lang="ts">
interface Option {
  id: string
  name?: string
  title?: string
  [key: string]: unknown
}

interface Props {
  modelValue: string
  options: Option[]
  placeholder?: string
  labelKey?: 'name' | 'title'
  allowCreate?: boolean
  createLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: 'اختر...',
  labelKey: 'name',
  allowCreate: false,
  createLabel: '+ إضافة جديد',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  create: [name: string]
}>()

const search = ref('')
const open = ref(false)
const container = ref<HTMLElement | null>(null)

const labelOf = (opt: Option): string => String(opt[props.labelKey] ?? opt.name ?? opt.title ?? '')

const selected = computed(() => props.options.find((o) => o.id === props.modelValue) || null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.options.slice(0, 50)
  return props.options.filter((o) => labelOf(o).toLowerCase().includes(q)).slice(0, 50)
})

const showCreateButton = computed(() => {
  if (!props.allowCreate) return false
  const q = search.value.trim()
  if (!q) return false
  return !props.options.some((o) => labelOf(o).toLowerCase() === q.toLowerCase())
})

function selectOption(opt: Option): void {
  emit('update:modelValue', opt.id)
  search.value = ''
  open.value = false
}

function clearSelection(): void {
  emit('update:modelValue', '')
  search.value = ''
}

function handleCreate(): void {
  const name = search.value.trim()
  if (!name) return
  emit('create', name)
  search.value = ''
  open.value = false
}

function onClickOutside(e: MouseEvent): void {
  if (container.value && !container.value.contains(e.target as Node)) {
    open.value = false
  }
}

onMounted(() => document.addEventListener('click', onClickOutside))
onUnmounted(() => document.removeEventListener('click', onClickOutside))
</script>

<template>
  <div ref="container" class="relative">
    <!-- Selected display or search input -->
    <div v-if="selected && !open" class="input flex items-center justify-between cursor-pointer" @click="open = true">
      <span class="truncate">{{ labelOf(selected) }}</span>
      <button
        type="button"
        class="text-gray-400 hover:text-red-500 text-sm shrink-0"
        @click.stop="clearSelection"
      >✕</button>
    </div>
    <input
      v-else
      v-model="search"
      type="text"
      class="input"
      :placeholder="placeholder"
      @focus="open = true"
    />

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute z-40 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:bg-gray-800 dark:border-gray-700"
    >
      <button
        v-for="opt in filtered"
        :key="opt.id"
        type="button"
        class="block w-full text-right px-3 py-2 text-sm hover:bg-primary-50 dark:hover:bg-white/5"
        @click="selectOption(opt)"
      >
        {{ labelOf(opt) }}
      </button>
      <p v-if="!filtered.length && !showCreateButton" class="px-3 py-2 text-xs text-gray-400 text-center">
        لا توجد نتائج
      </p>
      <button
        v-if="showCreateButton"
        type="button"
        class="block w-full text-right px-3 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 border-t border-gray-100 dark:border-gray-700"
        @click="handleCreate"
      >
        {{ createLabel }} «{{ search }}»
      </button>
    </div>
  </div>
</template>
