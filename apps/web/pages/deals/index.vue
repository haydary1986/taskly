<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إدارة الصفقات' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

const loading = ref(true)
const viewMode = ref<'pipeline' | 'list'>('pipeline')
const pipeline = ref<Record<string, { deals: any[]; count: number; totalValue: number }>>({})
const deals = ref<any[]>([])
const showCreateModal = ref(false)
const saving = ref(false)
const companies = ref<any[]>([])
const contacts = ref<any[]>([])
const users = ref<any[]>([])
const dragDeal = ref<any>(null)

const form = reactive({
  title: '', company: '', contact: '', stage: 'qualification', value: 0, currency: 'USD',
  probability: 50, assignedTo: '', expectedCloseDate: '', source: '', notes: '',
})

const stageLabels: Record<string, string> = {
  qualification: 'تأهيل', proposal: 'عرض سعر', negotiation: 'مفاوضة', won: 'مكسوبة', lost: 'خاسرة',
}
const stageColors: Record<string, string> = {
  qualification: 'border-blue-400 bg-blue-50', proposal: 'border-yellow-400 bg-yellow-50',
  negotiation: 'border-orange-400 bg-orange-50', won: 'border-green-400 bg-green-50', lost: 'border-red-400 bg-red-50',
}
const stageHeaderColors: Record<string, string> = {
  qualification: 'bg-blue-500', proposal: 'bg-yellow-500', negotiation: 'bg-orange-500', won: 'bg-green-500', lost: 'bg-red-500',
}

const sourceLabels: Record<string, string> = {
  website: 'موقع إلكتروني', referral: 'إحالة', 'social-media': 'سوشيال ميديا', advertisement: 'إعلان',
  exhibition: 'معرض/مؤتمر', 'cold-call': 'اتصال بارد', 'converted-lead': 'عميل محتمل محوّل', other: 'أخرى',
}

onMounted(async () => {
  await Promise.all([loadPipeline(), loadLookups()])
})

async function loadPipeline() {
  loading.value = true
  try {
    const res = await api.get('/v1/crm/pipeline')
    pipeline.value = res.pipeline
    // Flatten for list view
    deals.value = Object.values(res.pipeline).flatMap((s: any) => s.deals)
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

async function loadLookups() {
  try {
    const [c, cl, u] = await Promise.all([
      api.get('/companies', { query: { limit: 500, depth: 0 } }),
      api.get('/clients', { query: { limit: 500, depth: 0 } }),
      api.get('/users', { query: { limit: 100, depth: 0 } }),
    ])
    companies.value = c.docs
    contacts.value = cl.docs
    users.value = u.docs
  } catch {}
}

function openCreate() {
  Object.assign(form, { title: '', company: '', contact: '', stage: 'qualification', value: 0, currency: 'USD', probability: 50, assignedTo: '', expectedCloseDate: '', source: '' })
  showCreateModal.value = true
}

async function handleCreate() {
  saving.value = true
  try {
    await api.post('/deals', {
      ...form,
      company: form.company || undefined,
      contact: form.contact || undefined,
      assignedTo: form.assignedTo || undefined,
      expectedCloseDate: form.expectedCloseDate || undefined,
      source: form.source || undefined,
    })
    showCreateModal.value = false
    toast.success('تم إنشاء الصفقة')
    loadPipeline()
  } catch (err: any) { toast.error(err?.data?.errors?.[0]?.message || 'خطأ') }
  finally { saving.value = false }
}

async function moveDealToStage(dealId: string, stage: string): Promise<void> {
  try {
    await api.patch(`/deals/${dealId}`, { stage })
    toast.success('تم تحديث المرحلة')
    loadPipeline()
  } catch { toast.error('خطأ في التحديث') }
}

// Legacy HTML5 drag (kept for desktop fallback)
function onDragStart(deal: any) {
  dragDeal.value = deal
}
async function onDrop(stage: string) {
  if (!dragDeal.value || dragDeal.value.stage === stage) { dragDeal.value = null; return }
  await moveDealToStage(dragDeal.value.id, stage)
  dragDeal.value = null
}

// Touch-compatible Sortable.js for mobile/tablet
const stageRefs = ref<Record<string, HTMLElement | null>>({})
let sortables: any[] = []

async function initSortable(): Promise<void> {
  if (!import.meta.client) return
  const { default: Sortable } = await import('sortablejs')
  sortables.forEach((s) => s.destroy())
  sortables = []
  for (const stage of ['qualification', 'proposal', 'negotiation', 'won', 'lost']) {
    const el = stageRefs.value[stage]
    if (!el) continue
    sortables.push(
      Sortable.create(el, {
        group: 'deals-pipeline',
        animation: 150,
        ghostClass: 'opacity-50',
        delay: 150,
        delayOnTouchOnly: true,
        touchStartThreshold: 5,
        onAdd: async (evt: any) => {
          const dealId = evt.item?.getAttribute('data-deal-id')
          if (dealId) await moveDealToStage(dealId, stage)
        },
      }),
    )
  }
}

watch(
  () => Object.keys(pipeline.value).length,
  async (n) => {
    if (n > 0 && viewMode.value === 'pipeline') {
      await nextTick()
      await initSortable()
    }
  },
)
watch(viewMode, async (mode) => {
  if (mode === 'pipeline') {
    await nextTick()
    await initSortable()
  }
})
onBeforeUnmount(() => {
  sortables.forEach((s) => s.destroy())
})

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}

const totalPipelineValue = computed(() =>
  Object.entries(pipeline.value)
    .filter(([k]) => !['won', 'lost'].includes(k))
    .reduce((sum, [, v]) => sum + v.totalValue, 0),
)
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between flex-wrap gap-3">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">أنبوب المبيعات (Pipeline)</h1>
        <p class="text-sm text-gray-500">قيمة الأنبوب: <span class="font-bold text-primary-600">{{ formatCurrency(totalPipelineValue) }}</span></p>
      </div>
      <div class="flex items-center gap-2">
        <div class="flex rounded-lg border overflow-hidden">
          <button @click="viewMode = 'pipeline'" class="px-3 py-1.5 text-sm" :class="viewMode === 'pipeline' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600'">أنبوب</button>
          <button @click="viewMode = 'list'" class="px-3 py-1.5 text-sm" :class="viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-white text-gray-600'">قائمة</button>
        </div>
        <button @click="openCreate" class="btn-primary">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          صفقة جديدة
        </button>
      </div>
    </div>

    <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex gap-3 lg:gap-4 lg:overflow-x-auto pb-4">
      <div v-for="i in 5" :key="i" class="w-full lg:min-w-[260px] card animate-pulse"><div class="h-40 rounded bg-gray-200" /></div>
    </div>

    <!-- Pipeline View (Kanban) -->
    <div
      v-else-if="viewMode === 'pipeline'"
      class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:flex gap-3 lg:gap-4 lg:overflow-x-auto pb-4"
      style="min-height: 60vh;"
    >
      <div
        v-for="stage in ['qualification', 'proposal', 'negotiation', 'won', 'lost']"
        :key="stage"
        class="w-full lg:min-w-[260px] lg:max-w-[300px] lg:flex-1 flex flex-col rounded-xl border-2" :class="stageColors[stage]"
        @dragover.prevent
        @drop="onDrop(stage)"
      >
        <!-- Stage Header -->
        <div class="p-3 border-b" :class="stageColors[stage]">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="h-3 w-3 rounded-full" :class="stageHeaderColors[stage]" />
              <span class="font-bold text-sm">{{ stageLabels[stage] }}</span>
            </div>
            <span class="badge bg-white/70 text-xs">{{ pipeline[stage]?.count || 0 }}</span>
          </div>
          <p class="text-xs text-gray-600 mt-1 font-medium">{{ formatCurrency(pipeline[stage]?.totalValue || 0) }}</p>
        </div>

        <!-- Deals -->
        <div :ref="el => (stageRefs[stage] = el as HTMLElement | null)" class="flex-1 p-2 space-y-2 overflow-y-auto min-h-[80px]">
          <NuxtLink
            v-for="deal in (pipeline[stage]?.deals || [])"
            :key="deal.id"
            :to="`/deals/${deal.id}`"
            :data-deal-id="deal.id"
            class="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-all cursor-grab border border-gray-100 touch-manipulation"
            draggable="true"
            @dragstart="onDragStart(deal)"
          >
            <p class="font-medium text-sm text-gray-900 mb-1">{{ deal.title }}</p>
            <div class="flex items-center justify-between">
              <span class="text-sm font-bold text-green-600">{{ formatCurrency(deal.value || 0) }}</span>
              <span v-if="deal.probability" class="text-[10px] text-gray-400">{{ deal.probability }}%</span>
            </div>
            <div class="mt-1 flex items-center gap-2 text-[10px] text-gray-400">
              <span v-if="typeof deal.company === 'object' && deal.company">{{ deal.company.name }}</span>
              <span v-if="typeof deal.assignedTo === 'object' && deal.assignedTo">{{ deal.assignedTo.name }}</span>
            </div>
          </NuxtLink>
          <p v-if="!(pipeline[stage]?.deals?.length)" class="text-xs text-gray-400 text-center py-4">لا توجد صفقات</p>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-else class="space-y-2">
      <p v-if="!deals.length" class="card py-8 text-center text-gray-400">لا توجد صفقات</p>
      <NuxtLink
        v-for="deal in deals"
        :key="deal.id"
        :to="`/deals/${deal.id}`"
        class="card flex items-center justify-between !py-3 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900">{{ deal.title }}</span>
            <span class="badge text-[10px]" :class="stageColors[deal.stage]?.replace('border-', 'bg-').split(' ')[1] || 'bg-gray-100'">{{ stageLabels[deal.stage] }}</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
            <span v-if="typeof deal.company === 'object' && deal.company">{{ deal.company.name }}</span>
            <span v-if="typeof deal.assignedTo === 'object' && deal.assignedTo">{{ deal.assignedTo.name }}</span>
            <span>{{ deal.probability }}% احتمال</span>
          </div>
        </div>
        <span class="text-sm font-bold text-green-600 mr-4">{{ formatCurrency(deal.value || 0) }}</span>
      </NuxtLink>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateModal = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 class="mb-4 text-lg font-bold">صفقة جديدة</h2>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div><label class="label">عنوان الصفقة *</label><input v-model="form.title" class="input" required /></div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">الشركة</label>
                <select v-model="form.company" class="input">
                  <option value="">بدون شركة</option>
                  <option v-for="c in companies" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
              <div>
                <label class="label">جهة الاتصال</label>
                <select v-model="form.contact" class="input">
                  <option value="">بدون</option>
                  <option v-for="c in contacts" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div><label class="label">القيمة (USD) *</label><input v-model.number="form.value" type="number" class="input" dir="ltr" min="0" required /></div>
              <div>
                <label class="label">المرحلة</label>
                <select v-model="form.stage" class="input">
                  <option value="qualification">تأهيل</option>
                  <option value="proposal">عرض سعر</option>
                  <option value="negotiation">مفاوضة</option>
                </select>
              </div>
              <div><label class="label">الاحتمال (%)</label><input v-model.number="form.probability" type="number" class="input" dir="ltr" min="0" max="100" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">المسؤول</label>
                <select v-model="form.assignedTo" class="input">
                  <option value="">بدون</option>
                  <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }}</option>
                </select>
              </div>
              <div><label class="label">تاريخ الإغلاق المتوقع</label><input v-model="form.expectedCloseDate" type="date" class="input" /></div>
            </div>
            <div>
              <label class="label">المصدر</label>
              <select v-model="form.source" class="input">
                <option value="">غير محدد</option>
                <option v-for="(label, key) in sourceLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'جاري الحفظ...' : 'إنشاء' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
