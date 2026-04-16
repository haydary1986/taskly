<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'الفواتير' })

const api = useApi()
const invoices = ref<any[]>([])
const loading = ref(true)
const statusFilter = ref('')
const search = ref('')

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  sent: 'مرسلة',
  paid: 'مدفوعة',
  overdue: 'متأخرة',
  cancelled: 'ملغاة',
}
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

const filtered = computed(() => {
  let result = invoices.value
  if (statusFilter.value) result = result.filter((i) => i.status === statusFilter.value)
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter((i) => i.invoiceNumber?.toLowerCase().includes(s))
  }
  return result
})

const stats = computed(() => {
  const list = invoices.value
  return {
    total: list.length,
    paid: list.filter((i) => i.status === 'paid').reduce((sum, i) => sum + (i.total || 0), 0),
    outstanding: list.filter((i) => ['sent', 'overdue'].includes(i.status)).reduce((sum, i) => sum + (i.total || 0), 0),
  }
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const res = await api.get('/invoices', { query: { limit: 200, depth: 1, sort: '-createdAt' } })
    invoices.value = res.docs
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

onMounted(load)

function formatCurrency(v: number, c = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(v || 0)
}
function formatDate(d: string): string {
  return d ? new Date(d).toLocaleDateString('ar-IQ', { dateStyle: 'medium' }) : '—'
}
</script>

<template>
  <div>
    <UiPageHeader title="الفواتير" :subtitle="`${stats.total} فاتورة`" />

    <div class="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div class="card !py-3">
        <p class="text-xs text-gray-500">إجمالي المحصّل</p>
        <p class="text-xl font-bold text-green-600">{{ formatCurrency(stats.paid) }}</p>
      </div>
      <div class="card !py-3">
        <p class="text-xs text-gray-500">مستحقات</p>
        <p class="text-xl font-bold text-orange-600">{{ formatCurrency(stats.outstanding) }}</p>
      </div>
      <div class="card !py-3">
        <p class="text-xs text-gray-500">عدد الفواتير</p>
        <p class="text-xl font-bold text-gray-900">{{ stats.total }}</p>
      </div>
    </div>

    <div class="card mb-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="md:col-span-2">
          <input v-model="search" class="input" placeholder="بحث برقم الفاتورة..." />
        </div>
        <select v-model="statusFilter" class="input">
          <option value="">كل الحالات</option>
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="card animate-pulse"><div class="h-12 rounded bg-gray-200" /></div>
    </div>
    <div v-else class="space-y-2">
      <p v-if="!filtered.length" class="card py-8 text-center text-gray-400">لا توجد فواتير</p>
      <NuxtLink
        v-for="inv in filtered"
        :key="inv.id"
        :to="`/invoices/${inv.id}`"
        class="card flex items-center justify-between !py-3 hover:border-primary-300 hover:shadow-md transition-all"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="font-mono font-medium text-gray-900">{{ inv.invoiceNumber }}</span>
            <span class="badge text-[10px]" :class="statusColors[inv.status]">{{ statusLabels[inv.status] }}</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
            <span v-if="typeof inv.client === 'object' && inv.client">{{ inv.client.name }}</span>
            <span v-if="inv.issuedAt">صدرت: {{ formatDate(inv.issuedAt) }}</span>
            <span v-if="inv.dueDate">الاستحقاق: {{ formatDate(inv.dueDate) }}</span>
          </div>
        </div>
        <span class="text-sm font-bold text-green-600 ms-4">{{ formatCurrency(inv.total, inv.currency) }}</span>
      </NuxtLink>
    </div>
  </div>
</template>
