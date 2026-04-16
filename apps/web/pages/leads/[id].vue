<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تفاصيل العميل المحتمل' })

const route = useRoute()
const api = useApi()
const toast = useToast()

const lead = ref<any>(null)
const loading = ref(true)
const editing = ref(false)
const editForm = reactive<any>({})

const sourceLabels: Record<string, string> = {
  website: 'موقع إلكتروني', referral: 'إحالة', 'social-media': 'سوشيال ميديا', advertisement: 'إعلان',
  exhibition: 'معرض/مؤتمر', 'cold-call': 'اتصال بارد', 'email-campaign': 'بريد إلكتروني', partner: 'شريك', other: 'أخرى',
}
const statusLabels: Record<string, string> = {
  new: 'جديد', contacted: 'تم التواصل', qualified: 'مؤهل', unqualified: 'غير مؤهل', converted: 'تم التحويل', lost: 'مفقود',
}
const statusColors: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700', contacted: 'bg-yellow-100 text-yellow-700', qualified: 'bg-green-100 text-green-700',
  unqualified: 'bg-gray-100 text-gray-600', converted: 'bg-purple-100 text-purple-700', lost: 'bg-red-100 text-red-700',
}

const visits = ref<any[]>([])
const converting = ref(false)

async function loadAll(): Promise<void> {
  loading.value = true
  try {
    const [leadRes, visitsRes] = await Promise.all([
      api.get(`/leads/${route.params.id}`, { query: { depth: 1 } }),
      api.get('/visits', {
        query: {
          limit: 50,
          depth: 1,
          sort: '-checkInTime',
          'where[lead][equals]': route.params.id,
        },
      }),
    ])
    lead.value = leadRes
    visits.value = visitsRes.docs
  } catch (err: unknown) {
    if (err instanceof Error) toast.error(err.message)
  } finally {
    loading.value = false
  }
}

onMounted(loadAll)

async function convertAndCreateDeal(): Promise<void> {
  if (!lead.value) return
  converting.value = true
  try {
    const res = await api.post('/v1/crm/leads/convert', {
      leadId: lead.value.id,
      createDeal: true,
      dealTitle: `صفقة - ${lead.value.name}`,
      dealValue: lead.value.estimatedValue || 0,
    })
    toast.success('تم تحويل العميل وإنشاء الصفقة')
    if (res.deal?.id) {
      await navigateTo(`/deals/${res.deal.id}`)
    } else {
      await loadAll()
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل التحويل'
    toast.error(msg)
  } finally {
    converting.value = false
  }
}

async function createQuoteFromLead(): Promise<void> {
  if (!lead.value) return
  await navigateTo(`/quotes?lead=${lead.value.id}`)
}

const outcomeLabels: Record<string, string> = {
  agreed: 'موافقة',
  interested: 'مهتم',
  pending: 'انتظار',
  callback: 'إعادة اتصال',
  'no-answer': 'لا يوجد رد',
  rejected: 'رفض',
}
const outcomeColors: Record<string, string> = {
  agreed: 'bg-green-100 text-green-700',
  interested: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  callback: 'bg-purple-100 text-purple-700',
  'no-answer': 'bg-gray-100 text-gray-600',
  rejected: 'bg-red-100 text-red-700',
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleString('ar-IQ', { dateStyle: 'medium', timeStyle: 'short' })
}

const authStore = useAuthStore()
const editingVisit = ref<any>(null)
const visitEditForm = reactive({ outcome: '', notes: '' })
const savingVisitEdit = ref(false)

function canEditVisit(v: any): boolean {
  const repId = typeof v.representative === 'object' ? v.representative?.id : v.representative
  const role = authStore.user?.role
  return String(repId) === String(authStore.user?.id) || ['super-admin', 'supervisor'].includes(role || '')
}

function startEditVisit(v: any): void {
  editingVisit.value = v
  visitEditForm.outcome = v.outcome || ''
  visitEditForm.notes = v.notes || ''
}

async function saveVisitEdit(): Promise<void> {
  if (!editingVisit.value) return
  savingVisitEdit.value = true
  try {
    await api.patch(`/visits/${editingVisit.value.id}`, {
      outcome: visitEditForm.outcome || undefined,
      notes: visitEditForm.notes || undefined,
    })
    toast.success('تم تحديث الزيارة')
    editingVisit.value = null
    await loadAll()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ'
    toast.error(msg)
  } finally {
    savingVisitEdit.value = false
  }
}

async function deleteVisit(v: any): Promise<void> {
  if (!confirm(`حذف هذه الزيارة نهائياً؟\n${v.notes || ''}`)) return
  try {
    await api.delete(`/visits/${v.id}`)
    toast.success('تم حذف الزيارة')
    await loadAll()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل الحذف (تحتاج صلاحيات إدارية)'
    toast.error(msg)
  }
}

function startEdit() {
  Object.assign(editForm, {
    name: lead.value.name, phone: lead.value.phone || '', email: lead.value.email || '',
    companyName: lead.value.companyName || '', jobTitle: lead.value.jobTitle || '',
    source: lead.value.source, status: lead.value.status, estimatedValue: lead.value.estimatedValue || 0,
    city: lead.value.city || '',
  })
  editing.value = true
}

async function saveEdit() {
  try {
    const res = await api.patch(`/leads/${route.params.id}`, editForm)
    lead.value = res.doc
    editing.value = false
    toast.success('تم التحديث')
  } catch { toast.error('خطأ') }
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
    <div v-for="i in 2" :key="i" class="card animate-pulse"><div class="h-20 rounded bg-gray-200" /></div>
  </div>

  <div v-else-if="lead">
    <div class="mb-6">
      <NuxtLink to="/leads" class="text-sm text-primary-600 hover:underline mb-1 block">← العملاء المحتملين</NuxtLink>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900">{{ lead.name }}</h1>
          <span class="badge" :class="statusColors[lead.status]">{{ statusLabels[lead.status] }}</span>
        </div>
        <button v-if="!editing" @click="startEdit" class="btn-secondary">تعديل</button>
      </div>
    </div>

    <!-- Quick actions -->
    <div v-if="!editing && lead.status !== 'converted'" class="card mb-4 bg-primary-50 border-primary-200">
      <div class="flex flex-wrap items-center gap-2">
        <span class="text-sm text-gray-700 me-auto">إجراءات سريعة:</span>
        <button
          type="button"
          :disabled="converting"
          class="btn-primary text-sm"
          @click="convertAndCreateDeal"
        >
          {{ converting ? 'جاري...' : '💼 تحويل إلى صفقة' }}
        </button>
        <button type="button" class="btn-secondary text-sm" @click="createQuoteFromLead">
          📄 إنشاء عرض سعر
        </button>
      </div>
    </div>

    <div v-if="editing" class="card mb-6">
      <form @submit.prevent="saveEdit" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">الاسم</label><input v-model="editForm.name" class="input" required /></div>
          <div><label class="label">الحالة</label>
            <select v-model="editForm.status" class="input">
              <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
            </select>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">الهاتف</label><input v-model="editForm.phone" class="input" dir="ltr" /></div>
          <div><label class="label">البريد</label><input v-model="editForm.email" class="input" dir="ltr" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">الشركة</label><input v-model="editForm.companyName" class="input" /></div>
          <div><label class="label">المسمى الوظيفي</label><input v-model="editForm.jobTitle" class="input" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">المصدر</label><select v-model="editForm.source" class="input"><option v-for="(l,k) in sourceLabels" :key="k" :value="k">{{l}}</option></select></div>
          <div><label class="label">القيمة المتوقعة</label><input v-model.number="editForm.estimatedValue" type="number" class="input" dir="ltr" min="0" /></div>
        </div>
        <div class="flex justify-end gap-3">
          <button type="button" @click="editing = false" class="btn-secondary">إلغاء</button>
          <button type="submit" class="btn-primary">حفظ</button>
        </div>
      </form>
    </div>

    <div v-else class="card mb-6">
      <h3 class="font-bold mb-3">المعلومات</h3>
      <div class="grid grid-cols-2 gap-y-3 text-sm">
        <div v-if="lead.companyName"><span class="text-gray-400">الشركة:</span> {{ lead.companyName }}</div>
        <div v-if="lead.jobTitle"><span class="text-gray-400">المسمى:</span> {{ lead.jobTitle }}</div>
        <div v-if="lead.phone"><span class="text-gray-400">الهاتف:</span> <span dir="ltr">{{ lead.phone }}</span></div>
        <div v-if="lead.email"><span class="text-gray-400">البريد:</span> {{ lead.email }}</div>
        <div><span class="text-gray-400">المصدر:</span> {{ sourceLabels[lead.source] }}</div>
        <div v-if="lead.estimatedValue"><span class="text-gray-400">القيمة المتوقعة:</span> {{ formatCurrency(lead.estimatedValue) }}</div>
        <div v-if="lead.city"><span class="text-gray-400">المدينة:</span> {{ lead.city }}</div>
        <div><span class="text-gray-400">تاريخ الإنشاء:</span> {{ formatDate(lead.createdAt) }}</div>
        <div v-if="lead.assignedTo"><span class="text-gray-400">المسؤول:</span> {{ typeof lead.assignedTo === 'object' ? lead.assignedTo.name : '' }}</div>
      </div>
    </div>

    <!-- Visits history -->
    <div class="card mb-6">
      <h3 class="font-bold mb-3">سجل الزيارات ({{ visits.length }})</h3>
      <div v-if="!visits.length" class="text-sm text-gray-400 py-4 text-center">لا توجد زيارات مسجلة</div>
      <ul v-else class="space-y-3">
        <li
          v-for="v in visits"
          :key="v.id"
          class="border-s-4 ps-3 py-1"
          :class="v.outcome === 'agreed' ? 'border-green-400' : v.outcome === 'rejected' ? 'border-red-400' : v.outcome === 'interested' ? 'border-blue-400' : 'border-gray-200'"
        >
          <div class="flex items-center justify-between flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <span class="text-sm font-medium">{{ typeof v.representative === 'object' ? v.representative.name : 'مندوب' }}</span>
              <span v-if="v.outcome" class="badge text-[10px]" :class="outcomeColors[v.outcome]">{{ outcomeLabels[v.outcome] }}</span>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-[11px] text-gray-400">{{ formatDateTime(v.checkInTime) }}</span>
              <button
                v-if="canEditVisit(v)"
                type="button"
                class="text-[10px] text-primary-600 hover:underline"
                @click="startEditVisit(v)"
              >تعديل</button>
              <button
                v-if="canEditVisit(v)"
                type="button"
                class="text-[10px] text-red-500 hover:underline"
                @click="deleteVisit(v)"
              >حذف</button>
            </div>
          </div>
          <p v-if="v.notes" class="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{{ v.notes }}</p>
        </li>
      </ul>
    </div>

    <!-- Converted info -->
    <div v-if="lead.status === 'converted' && lead.convertedTo" class="card bg-purple-50 border-purple-200">
      <h3 class="font-bold mb-2 text-purple-800">تم التحويل</h3>
      <div class="text-sm space-y-1">
        <p v-if="lead.convertedAt">بتاريخ: {{ formatDate(lead.convertedAt) }}</p>
        <NuxtLink v-if="lead.convertedTo.client" :to="`/clients/${typeof lead.convertedTo.client === 'object' ? lead.convertedTo.client.id : lead.convertedTo.client}`" class="text-primary-600 hover:underline block">→ جهة الاتصال</NuxtLink>
        <NuxtLink v-if="lead.convertedTo.deal" :to="`/deals/${typeof lead.convertedTo.deal === 'object' ? lead.convertedTo.deal.id : lead.convertedTo.deal}`" class="text-primary-600 hover:underline block">→ الصفقة</NuxtLink>
        <NuxtLink v-if="lead.convertedTo.company" :to="`/companies/${typeof lead.convertedTo.company === 'object' ? lead.convertedTo.company.id : lead.convertedTo.company}`" class="text-primary-600 hover:underline block">→ الشركة</NuxtLink>
      </div>
    </div>
  </div>

  <!-- Edit Visit Modal -->
  <UiModal :open="!!editingVisit" title="تعديل الزيارة" size="md" @close="editingVisit = null">
    <form @submit.prevent="saveVisitEdit" class="space-y-4">
      <div>
        <label class="label">نتيجة الزيارة</label>
        <select v-model="visitEditForm.outcome" class="input">
          <option value="">بدون</option>
          <option v-for="(label, key) in outcomeLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <div>
        <label class="label">الملاحظات</label>
        <textarea v-model="visitEditForm.notes" rows="4" class="input" />
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="btn-secondary flex-1" @click="editingVisit = null">إلغاء</button>
        <button type="submit" class="btn-primary flex-1" :disabled="savingVisitEdit">
          {{ savingVisitEdit ? 'جاري...' : 'حفظ' }}
        </button>
      </div>
    </form>
  </UiModal>
</template>
