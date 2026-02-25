<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'التقارير والتصدير' })

const config = useRuntimeConfig()
const authStore = useAuthStore()

const reportType = ref('tasks')
const format = ref('json')
const startDate = ref('')
const endDate = ref('')
const loading = ref(false)
const previewData = ref<any>(null)

const reportTypes: Record<string, string> = {
  tasks: 'تقرير المهام',
  visits: 'تقرير الزيارات',
  performance: 'تقرير الأداء',
}

const formats: Record<string, string> = {
  json: 'JSON',
  csv: 'CSV',
}

async function generateReport() {
  loading.value = true; previewData.value = null
  try {
    if (format.value === 'csv') {
      // Direct download
      const params = new URLSearchParams({
        type: reportType.value,
        format: 'csv',
        ...(startDate.value ? { startDate: startDate.value } : {}),
        ...(endDate.value ? { endDate: endDate.value } : {}),
      })
      const url = `${config.public.apiBase}/api/reports/export?${params}`
      const link = document.createElement('a')
      link.href = url
      link.download = `${reportType.value}-report.csv`
      // Add auth header via fetch
      const res = await fetch(url, { headers: { Authorization: `JWT ${authStore.token}` } })
      const blob = await res.blob()
      link.href = URL.createObjectURL(blob)
      link.click()
    } else {
      const api = useApi()
      const params: Record<string, string> = { type: reportType.value, format: 'json' }
      if (startDate.value) params.startDate = startDate.value
      if (endDate.value) params.endDate = endDate.value
      previewData.value = await api.get('/reports/export', { query: params })
    }
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}
</script>

<template>
  <div class="mx-auto max-w-4xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-900">التقارير والتصدير</h1>

    <div class="card mb-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label class="label">نوع التقرير</label>
          <select v-model="reportType" class="input">
            <option v-for="(label, value) in reportTypes" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div>
          <label class="label">الصيغة</label>
          <select v-model="format" class="input">
            <option v-for="(label, value) in formats" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div>
          <label class="label">من تاريخ</label>
          <input v-model="startDate" type="date" class="input" dir="ltr" />
        </div>
        <div>
          <label class="label">إلى تاريخ</label>
          <input v-model="endDate" type="date" class="input" dir="ltr" />
        </div>
      </div>
      <button @click="generateReport" :disabled="loading" class="btn-primary mt-4">
        {{ loading ? 'جاري التحميل...' : format === 'csv' ? 'تحميل CSV' : 'عرض التقرير' }}
      </button>
    </div>

    <!-- Preview -->
    <div v-if="previewData" class="card">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="font-semibold">{{ reportTypes[reportType] }} ({{ previewData.total }} سجل)</h3>
        <button @click="format = 'csv'; generateReport()" class="btn-secondary text-sm">تحميل CSV</button>
      </div>
      <div class="overflow-x-auto">
        <table v-if="previewData.data?.length" class="w-full text-right text-sm">
          <thead class="border-b bg-gray-50">
            <tr><th v-for="key in Object.keys(previewData.data[0])" :key="key" class="px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{{ key }}</th></tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-for="(row, idx) in previewData.data.slice(0, 50)" :key="idx" class="hover:bg-gray-50">
              <td v-for="key in Object.keys(row)" :key="key" class="px-3 py-2 text-gray-700 whitespace-nowrap">{{ row[key] }}</td>
            </tr>
          </tbody>
        </table>
        <p v-else class="py-8 text-center text-gray-400">لا توجد بيانات</p>
      </div>
      <p v-if="previewData.total > 50" class="mt-2 text-center text-xs text-gray-400">يتم عرض أول 50 سجل من أصل {{ previewData.total }}</p>
    </div>
  </div>
</template>
