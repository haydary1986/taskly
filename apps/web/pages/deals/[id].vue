<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تفاصيل الصفقة' })

const route = useRoute()
const api = useApi()
const toast = useToast()

const deal = ref<any>(null)
const activities = ref<any[]>([])
const quotes = ref<any[]>([])
const loading = ref(true)
const editing = ref(false)
const editForm = reactive<any>({})
const showActivityModal = ref(false)
const savingActivity = ref(false)

const activityForm = reactive({
  type: 'call', subject: '', description: '', scheduledAt: '', duration: 0, callDirection: 'outgoing', meetingLocation: '',
})

const stageLabels: Record<string, string> = { qualification: 'تأهيل', proposal: 'عرض سعر', negotiation: 'مفاوضة', won: 'مكسوبة', lost: 'خاسرة' }
const stageColors: Record<string, string> = { qualification: 'bg-blue-100 text-blue-700', proposal: 'bg-yellow-100 text-yellow-700', negotiation: 'bg-orange-100 text-orange-700', won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700' }
const activityTypeLabels: Record<string, string> = { call: 'مكالمة', meeting: 'اجتماع', email: 'بريد إلكتروني', task: 'مهمة', note: 'ملاحظة', visit: 'زيارة', presentation: 'عرض تقديمي' }
const lostReasonLabels: Record<string, string> = { price: 'السعر مرتفع', competitor: 'اختار منافس', delayed: 'تأخر الرد', 'no-interest': 'لم يعد مهتماً', budget: 'تغير الميزانية', other: 'أخرى' }

onMounted(async () => {
  loading.value = true
  try {
    const [d, acts, q] = await Promise.all([
      api.get(`/deals/${route.params.id}`, { query: { depth: 1 } }),
      api.get('/crm-activities', { query: { where: { deal: { equals: route.params.id } }, sort: '-createdAt', limit: 50, depth: 1 } }),
      api.get('/quotes', { query: { where: { deal: { equals: route.params.id } }, sort: '-createdAt', limit: 20, depth: 1 } }),
    ])
    deal.value = d
    activities.value = acts.docs
    quotes.value = q.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

function startEdit() {
  Object.assign(editForm, {
    title: deal.value.title, stage: deal.value.stage, value: deal.value.value,
    probability: deal.value.probability, expectedCloseDate: deal.value.expectedCloseDate?.split('T')[0] || '',
    lostReason: deal.value.lostReason || '',
  })
  editing.value = true
}

async function saveEdit() {
  try {
    const res = await api.patch(`/deals/${route.params.id}`, {
      ...editForm,
      expectedCloseDate: editForm.expectedCloseDate || undefined,
      lostReason: editForm.stage === 'lost' ? editForm.lostReason : undefined,
    })
    deal.value = res.doc
    editing.value = false
    toast.success('تم التحديث')
  } catch { toast.error('خطأ') }
}

async function changeStage(stage: string) {
  try {
    const res = await api.patch(`/deals/${route.params.id}`, { stage })
    deal.value = res.doc
    toast.success('تم تحديث المرحلة')
  } catch { toast.error('خطأ') }
}

async function handleCreateActivity() {
  savingActivity.value = true
  try {
    const data: any = {
      ...activityForm,
      deal: route.params.id,
      company: typeof deal.value.company === 'object' ? deal.value.company?.id : deal.value.company,
      contact: typeof deal.value.contact === 'object' ? deal.value.contact?.id : deal.value.contact,
      scheduledAt: activityForm.scheduledAt || undefined,
      duration: activityForm.duration || undefined,
    }
    if (activityForm.type !== 'call') { delete data.callDirection }
    if (activityForm.type !== 'meeting') { delete data.meetingLocation }

    const res = await api.post('/crm-activities', data)
    activities.value.unshift(res.doc)
    showActivityModal.value = false
    toast.success('تم إضافة النشاط')
  } catch (err: any) { toast.error(err?.data?.errors?.[0]?.message || 'خطأ') }
  finally { savingActivity.value = false }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div v-if="loading" class="space-y-4">
    <div v-for="i in 3" :key="i" class="card animate-pulse"><div class="h-20 rounded bg-gray-200" /></div>
  </div>

  <div v-else-if="deal">
    <div class="mb-4">
      <NuxtLink to="/deals" class="text-sm text-primary-600 hover:underline mb-1 block">← الصفقات</NuxtLink>
      <div class="flex items-center justify-between flex-wrap gap-3">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">{{ deal.title }}</h1>
          <span class="badge text-sm" :class="stageColors[deal.stage]">{{ stageLabels[deal.stage] }}</span>
        </div>
        <div class="flex gap-2">
          <button @click="showActivityModal = true" class="btn-secondary text-sm">+ نشاط</button>
          <button v-if="!editing" @click="startEdit" class="btn-secondary text-sm">تعديل</button>
        </div>
      </div>
    </div>

    <!-- Stage Progress -->
    <div class="card mb-6">
      <div class="flex items-center gap-1">
        <button
          v-for="stage in ['qualification', 'proposal', 'negotiation', 'won', 'lost']"
          :key="stage"
          @click="changeStage(stage)"
          class="flex-1 py-2 text-xs font-medium text-center rounded-lg transition-all"
          :class="deal.stage === stage
            ? stageColors[stage] + ' ring-2 ring-offset-1'
            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
        >
          {{ stageLabels[stage] }}
        </button>
      </div>
    </div>

    <!-- Edit Form -->
    <div v-if="editing" class="card mb-6">
      <form @submit.prevent="saveEdit" class="space-y-4">
        <div><label class="label">العنوان</label><input v-model="editForm.title" class="input" required /></div>
        <div class="grid grid-cols-3 gap-3">
          <div><label class="label">القيمة</label><input v-model.number="editForm.value" type="number" class="input" dir="ltr" min="0" /></div>
          <div><label class="label">الاحتمال (%)</label><input v-model.number="editForm.probability" type="number" class="input" dir="ltr" min="0" max="100" /></div>
          <div><label class="label">تاريخ الإغلاق</label><input v-model="editForm.expectedCloseDate" type="date" class="input" /></div>
        </div>
        <div v-if="editForm.stage === 'lost'">
          <label class="label">سبب الخسارة</label>
          <select v-model="editForm.lostReason" class="input">
            <option value="">غير محدد</option>
            <option v-for="(l,k) in lostReasonLabels" :key="k" :value="k">{{ l }}</option>
          </select>
        </div>
        <div class="flex justify-end gap-3">
          <button type="button" @click="editing = false" class="btn-secondary">إلغاء</button>
          <button type="submit" class="btn-primary">حفظ</button>
        </div>
      </form>
    </div>

    <!-- Deal Info -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
      <div class="card">
        <h3 class="font-bold mb-3">معلومات الصفقة</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between"><span class="text-gray-400">القيمة</span><span class="font-bold text-green-600">{{ formatCurrency(deal.value || 0) }}</span></div>
          <div class="flex justify-between"><span class="text-gray-400">الاحتمال</span><span>{{ deal.probability }}%</span></div>
          <div class="flex justify-between"><span class="text-gray-400">القيمة المرجحة</span><span class="font-medium">{{ formatCurrency((deal.value || 0) * (deal.probability || 0) / 100) }}</span></div>
          <div v-if="deal.expectedCloseDate" class="flex justify-between"><span class="text-gray-400">الإغلاق المتوقع</span><span>{{ formatDate(deal.expectedCloseDate) }}</span></div>
          <div v-if="deal.closedAt" class="flex justify-between"><span class="text-gray-400">تاريخ الإغلاق</span><span>{{ formatDate(deal.closedAt) }}</span></div>
          <div v-if="deal.lostReason" class="flex justify-between"><span class="text-gray-400">سبب الخسارة</span><span class="text-red-600">{{ lostReasonLabels[deal.lostReason] || deal.lostReason }}</span></div>
        </div>
      </div>
      <div class="card">
        <h3 class="font-bold mb-3">الأطراف</h3>
        <div class="space-y-2 text-sm">
          <div v-if="deal.company && typeof deal.company === 'object'" class="flex justify-between">
            <span class="text-gray-400">الشركة</span>
            <NuxtLink :to="`/companies/${deal.company.id}`" class="text-primary-600 hover:underline">{{ deal.company.name }}</NuxtLink>
          </div>
          <div v-if="deal.contact && typeof deal.contact === 'object'" class="flex justify-between">
            <span class="text-gray-400">جهة الاتصال</span>
            <NuxtLink :to="`/clients/${deal.contact.id}`" class="text-primary-600 hover:underline">{{ deal.contact.name }}</NuxtLink>
          </div>
          <div v-if="deal.assignedTo && typeof deal.assignedTo === 'object'" class="flex justify-between">
            <span class="text-gray-400">المسؤول</span><span>{{ deal.assignedTo.name }}</span>
          </div>
          <div><span class="text-gray-400">تاريخ الإنشاء</span> {{ formatDate(deal.createdAt) }}</div>
        </div>
      </div>
    </div>

    <!-- Products in Deal -->
    <div v-if="deal.products?.length" class="card mb-6">
      <h3 class="font-bold mb-3">المنتجات/الخدمات</h3>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead><tr class="border-b text-gray-400 text-xs"><th class="py-2 text-right">المنتج</th><th class="py-2 text-center">الكمية</th><th class="py-2 text-center">السعر</th><th class="py-2 text-center">خصم</th><th class="py-2 text-left">الإجمالي</th></tr></thead>
          <tbody>
            <tr v-for="(item, i) in deal.products" :key="i" class="border-b last:border-0">
              <td class="py-2">{{ typeof item.product === 'object' ? item.product?.name : 'منتج' }}</td>
              <td class="py-2 text-center">{{ item.quantity }}</td>
              <td class="py-2 text-center" dir="ltr">{{ formatCurrency(item.unitPrice || 0) }}</td>
              <td class="py-2 text-center">{{ item.discount || 0 }}%</td>
              <td class="py-2 text-left font-medium" dir="ltr">{{ formatCurrency((item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Quotes -->
    <div v-if="quotes.length" class="card mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold">عروض الأسعار ({{ quotes.length }})</h3>
        <NuxtLink :to="`/quotes?deal=${deal.id}`" class="text-xs text-primary-600 hover:underline">عرض الكل</NuxtLink>
      </div>
      <div class="space-y-2">
        <NuxtLink v-for="q in quotes" :key="q.id" :to="`/quotes/${q.id}`"
          class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
          <div>
            <span class="font-medium text-sm">{{ q.quoteNumber }}</span>
            <span class="badge text-[10px] mr-2" :class="q.status === 'accepted' ? 'bg-green-100 text-green-700' : q.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'">
              {{ q.status === 'draft' ? 'مسودة' : q.status === 'sent' ? 'مرسل' : q.status === 'accepted' ? 'مقبول' : q.status === 'rejected' ? 'مرفوض' : 'منتهي' }}
            </span>
          </div>
          <span class="text-sm font-bold">{{ formatCurrency(q.total || 0) }}</span>
        </NuxtLink>
      </div>
    </div>

    <!-- Activities -->
    <div class="card">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold">الأنشطة ({{ activities.length }})</h3>
        <button @click="showActivityModal = true" class="text-xs text-primary-600 hover:underline">+ إضافة نشاط</button>
      </div>
      <div v-if="activities.length" class="space-y-2">
        <div v-for="act in activities" :key="act.id" class="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
          <div class="h-8 w-8 rounded-full flex items-center justify-center text-sm shrink-0"
            :class="{
              'bg-green-100 text-green-600': act.type === 'call',
              'bg-blue-100 text-blue-600': act.type === 'meeting',
              'bg-purple-100 text-purple-600': act.type === 'email',
              'bg-gray-100 text-gray-600': !['call','meeting','email'].includes(act.type),
            }">
            {{ act.type === 'call' ? '📞' : act.type === 'meeting' ? '🤝' : act.type === 'email' ? '📧' : '📝' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium">{{ act.subject }}</p>
            <p class="text-[10px] text-gray-400">{{ activityTypeLabels[act.type] }} — {{ formatDate(act.createdAt) }}</p>
          </div>
          <span class="badge text-[10px]" :class="act.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
            {{ act.completed ? 'مكتمل' : 'قيد الانتظار' }}
          </span>
        </div>
      </div>
      <p v-else class="text-sm text-gray-400 text-center py-4">لا توجد أنشطة بعد</p>
    </div>

    <!-- Activity Modal -->
    <Teleport to="body">
      <div v-if="showActivityModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showActivityModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold">إضافة نشاط</h2>
          <form @submit.prevent="handleCreateActivity" class="space-y-4">
            <div>
              <label class="label">النوع</label>
              <select v-model="activityForm.type" class="input">
                <option v-for="(label, key) in activityTypeLabels" :key="key" :value="key">{{ label }}</option>
              </select>
            </div>
            <div><label class="label">الموضوع *</label><input v-model="activityForm.subject" class="input" required /></div>
            <div v-if="activityForm.type === 'call'">
              <label class="label">اتجاه المكالمة</label>
              <select v-model="activityForm.callDirection" class="input">
                <option value="outgoing">صادرة</option>
                <option value="incoming">واردة</option>
              </select>
            </div>
            <div v-if="activityForm.type === 'meeting'">
              <label class="label">مكان الاجتماع</label>
              <input v-model="activityForm.meetingLocation" class="input" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">الموعد</label><input v-model="activityForm.scheduledAt" type="datetime-local" class="input" /></div>
              <div><label class="label">المدة (دقيقة)</label><input v-model.number="activityForm.duration" type="number" class="input" min="0" /></div>
            </div>
            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showActivityModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="savingActivity" class="btn-primary">{{ savingActivity ? 'جاري الحفظ...' : 'حفظ' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
