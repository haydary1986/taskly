<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'لوحة CRM' })

const api = useApi()

const stats = ref<any>(null)
const funnel = ref<any>(null)
const forecast = ref<any[]>([])
const recentDeals = ref<any[]>([])
const recentLeads = ref<any[]>([])
const loading = ref(true)

const stageLabels: Record<string, string> = { qualification: 'تأهيل', proposal: 'عرض سعر', negotiation: 'مفاوضة', won: 'مكسوبة', lost: 'خاسرة' }
const stageColors: Record<string, string> = { qualification: 'bg-blue-500', proposal: 'bg-yellow-500', negotiation: 'bg-orange-500', won: 'bg-green-500', lost: 'bg-red-500' }
const leadStatusLabels: Record<string, string> = { new: 'جديد', contacted: 'تم التواصل', qualified: 'مؤهل', converted: 'تم التحويل', unqualified: 'غير مؤهل', lost: 'مفقود' }

onMounted(async () => {
  loading.value = true
  try {
    const [s, f, fc, rd, rl] = await Promise.all([
      api.get('/v1/crm/stats'),
      api.get('/v1/crm/funnel'),
      api.get('/v1/crm/forecast'),
      api.get('/deals', { query: { sort: '-createdAt', limit: 5, depth: 1 } }),
      api.get('/leads', { query: { sort: '-createdAt', limit: 5, depth: 1 } }),
    ])
    stats.value = s
    funnel.value = f
    forecast.value = fc.forecast
    recentDeals.value = rd.docs
    recentLeads.value = rl.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMonth(m: string) {
  const [y, month] = m.split('-')
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']
  return `${months[parseInt(month) - 1]} ${y}`
}

const maxFunnelCount = computed(() => {
  if (!funnel.value?.dealFunnel) return 1
  return Math.max(...funnel.value.dealFunnel.map((s: any) => s.count), 1)
})
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between flex-wrap gap-3">
      <h1 class="text-2xl font-bold text-gray-900">لوحة CRM</h1>
      <div class="flex gap-2">
        <NuxtLink to="/leads" class="btn-secondary text-sm">العملاء المحتملين</NuxtLink>
        <NuxtLink to="/deals" class="btn-primary text-sm">أنبوب المبيعات</NuxtLink>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div v-for="i in 4" :key="i" class="card animate-pulse"><div class="h-16 rounded bg-gray-200" /></div>
      </div>
    </div>

    <div v-else-if="stats">
      <!-- KPI Cards -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="card text-center">
          <p class="text-3xl font-bold text-primary-600">{{ stats.deals.open }}</p>
          <p class="text-xs text-gray-500">صفقات مفتوحة</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-green-600">{{ formatCurrency(stats.revenue.monthly) }}</p>
          <p class="text-xs text-gray-500">إيرادات الشهر</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-blue-600">{{ stats.deals.winRate }}%</p>
          <p class="text-xs text-gray-500">معدل الفوز</p>
        </div>
        <div class="card text-center">
          <p class="text-3xl font-bold text-orange-600">{{ stats.leads.total }}</p>
          <p class="text-xs text-gray-500">عملاء محتملين</p>
        </div>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div class="card text-center">
          <p class="text-2xl font-bold text-green-600">{{ stats.deals.won }}</p>
          <p class="text-xs text-gray-500">صفقات مكسوبة</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-red-600">{{ stats.deals.lost }}</p>
          <p class="text-xs text-gray-500">صفقات خاسرة</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-purple-600">{{ stats.leads.conversionRate }}%</p>
          <p class="text-xs text-gray-500">معدل التحويل</p>
        </div>
        <div class="card text-center">
          <p class="text-2xl font-bold text-teal-600">{{ stats.companies }}</p>
          <p class="text-xs text-gray-500">شركات</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Deal Funnel -->
        <div class="card">
          <h3 class="font-bold mb-4">قمع الصفقات</h3>
          <div v-if="funnel?.dealFunnel" class="space-y-3">
            <div v-for="stage in funnel.dealFunnel" :key="stage.stage" class="flex items-center gap-3">
              <span class="text-xs text-gray-500 w-20 text-left shrink-0">{{ stageLabels[stage.stage] }}</span>
              <div class="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                <div
                  class="h-full rounded-full flex items-center justify-end px-2 text-white text-xs font-medium transition-all"
                  :class="stageColors[stage.stage]"
                  :style="{ width: Math.max((stage.count / maxFunnelCount) * 100, 8) + '%' }"
                >
                  {{ stage.count }}
                </div>
              </div>
              <span class="text-xs text-gray-400 w-24 text-left shrink-0">{{ formatCurrency(stage.value) }}</span>
            </div>
          </div>
        </div>

        <!-- Revenue Forecast -->
        <div class="card">
          <h3 class="font-bold mb-4">توقعات الإيرادات (6 أشهر)</h3>
          <div v-if="forecast.length" class="space-y-3">
            <div v-for="month in forecast" :key="month.month" class="flex items-center justify-between p-2 rounded-lg bg-gray-50">
              <div>
                <p class="text-sm font-medium">{{ formatMonth(month.month) }}</p>
                <p class="text-[10px] text-gray-400">{{ month.count }} صفقة</p>
              </div>
              <div class="text-left">
                <p class="text-sm font-bold text-green-600">{{ formatCurrency(month.expected) }}</p>
                <p class="text-[10px] text-gray-400">مرجح: {{ formatCurrency(month.weighted) }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-sm text-gray-400 text-center py-4">لا توجد بيانات</p>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Pipeline Summary -->
        <div class="card">
          <h3 class="font-bold mb-3">ملخص الأنبوب</h3>
          <div class="space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-gray-400">إجمالي الصفقات</span><span class="font-bold">{{ stats.deals.total }}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">إيرادات سنوية</span><span class="font-bold text-green-600">{{ formatCurrency(stats.revenue.yearly) }}</span></div>
            <div class="flex justify-between"><span class="text-gray-400">قيمة الأنبوب المرجحة</span><span class="font-bold text-blue-600">{{ formatCurrency(stats.revenue.weightedPipeline) }}</span></div>
          </div>
        </div>

        <!-- Lead Funnel -->
        <div class="card">
          <h3 class="font-bold mb-3">قمع العملاء المحتملين</h3>
          <div v-if="funnel?.leadFunnel" class="space-y-2">
            <div v-for="status in funnel.leadFunnel" :key="status.status" class="flex items-center justify-between text-sm">
              <span class="text-gray-500">{{ leadStatusLabels[status.status] || status.status }}</span>
              <span class="font-bold">{{ status.count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold">آخر الصفقات</h3>
            <NuxtLink to="/deals" class="text-xs text-primary-600 hover:underline">عرض الكل</NuxtLink>
          </div>
          <div class="space-y-2">
            <NuxtLink v-for="deal in recentDeals" :key="deal.id" :to="`/deals/${deal.id}`"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <span class="text-sm font-medium">{{ deal.title }}</span>
                <span class="badge text-[10px] mr-1" :class="{ 'bg-blue-100 text-blue-700': deal.stage === 'qualification', 'bg-yellow-100 text-yellow-700': deal.stage === 'proposal', 'bg-orange-100 text-orange-700': deal.stage === 'negotiation', 'bg-green-100 text-green-700': deal.stage === 'won', 'bg-red-100 text-red-700': deal.stage === 'lost' }">{{ stageLabels[deal.stage] }}</span>
              </div>
              <span class="text-sm font-bold text-green-600">{{ formatCurrency(deal.value || 0) }}</span>
            </NuxtLink>
          </div>
        </div>

        <div class="card">
          <div class="flex items-center justify-between mb-3">
            <h3 class="font-bold">آخر العملاء المحتملين</h3>
            <NuxtLink to="/leads" class="text-xs text-primary-600 hover:underline">عرض الكل</NuxtLink>
          </div>
          <div class="space-y-2">
            <NuxtLink v-for="lead in recentLeads" :key="lead.id" :to="`/leads/${lead.id}`"
              class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
              <div>
                <span class="text-sm font-medium">{{ lead.name }}</span>
                <span v-if="lead.companyName" class="text-xs text-gray-400 mr-1">{{ lead.companyName }}</span>
              </div>
              <span v-if="lead.estimatedValue" class="text-xs text-gray-500">{{ formatCurrency(lead.estimatedValue) }}</span>
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
