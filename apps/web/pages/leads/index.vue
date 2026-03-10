<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'العملاء المحتملين' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const leadsStore = useLeadsStore()

const search = ref('')
const showCreateModal = ref(false)
const showConvertModal = ref(false)
const saving = ref(false)
const convertingLead = ref<any>(null)

const form = reactive({
  name: '', phone: '', email: '', companyName: '', jobTitle: '', source: 'website', status: 'new', estimatedValue: 0, city: '', notes: '',
})

const convertForm = reactive({
  createDeal: true, dealTitle: '', dealValue: 0,
})

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

const filtered = computed(() => {
  let result = leadsStore.leads
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter((l) =>
      l.name?.toLowerCase().includes(s) || l.phone?.includes(s) || l.email?.toLowerCase().includes(s) || l.companyName?.toLowerCase().includes(s),
    )
  }
  if (leadsStore.filters.status) result = result.filter((l) => l.status === leadsStore.filters.status)
  return result
})

onMounted(() => leadsStore.fetchLeads())

function openCreate() {
  Object.assign(form, { name: '', phone: '', email: '', companyName: '', jobTitle: '', source: 'website', status: 'new', estimatedValue: 0, city: '', notes: '' })
  showCreateModal.value = true
}

async function handleCreate() {
  saving.value = true
  try {
    await leadsStore.createLead({ ...form, estimatedValue: form.estimatedValue || undefined } as any)
    showCreateModal.value = false
    toast.success('تم إضافة العميل المحتمل')
  } catch (err: any) { toast.error(err?.data?.errors?.[0]?.message || 'خطأ') }
  finally { saving.value = false }
}

function openConvert(lead: any) {
  convertingLead.value = lead
  convertForm.createDeal = true
  convertForm.dealTitle = `صفقة - ${lead.name}`
  convertForm.dealValue = lead.estimatedValue || 0
  showConvertModal.value = true
}

async function handleConvert() {
  if (!convertingLead.value) return
  saving.value = true
  try {
    await leadsStore.convertLead(convertingLead.value.id, {
      createDeal: convertForm.createDeal,
      dealTitle: convertForm.dealTitle,
      dealValue: convertForm.dealValue,
    })
    showConvertModal.value = false
    toast.success('تم تحويل العميل المحتمل بنجاح')
    leadsStore.fetchLeads()
  } catch (err: any) { toast.error(err?.data?.error || 'خطأ في التحويل') }
  finally { saving.value = false }
}

async function deleteLead(id: string) {
  if (!confirm('هل أنت متأكد؟')) return
  try { await leadsStore.deleteLead(id) } catch { toast.error('خطأ') }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">العملاء المحتملين (Leads)</h1>
      <button @click="openCreate" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        إضافة عميل محتمل
      </button>
    </div>

    <!-- Filters -->
    <div class="card mb-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <input v-model="search" type="text" class="input" placeholder="بحث بالاسم، الهاتف، البريد، الشركة..." />
        </div>
        <select v-model="leadsStore.filters.status" @change="leadsStore.fetchLeads()" class="input">
          <option value="">كل الحالات</option>
          <option v-for="(label, key) in statusLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </div>
      <p class="mt-2 text-xs text-gray-400">{{ filtered.length }} عميل محتمل</p>
    </div>

    <div v-if="leadsStore.loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card animate-pulse"><div class="h-14 rounded bg-gray-200" /></div>
    </div>

    <div v-else class="space-y-2">
      <p v-if="!filtered.length" class="card py-8 text-center text-gray-400">لا يوجد عملاء محتملين</p>
      <div
        v-for="lead in filtered"
        :key="lead.id"
        class="card flex items-center justify-between !py-3"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900">{{ lead.name }}</span>
            <span class="badge text-[10px]" :class="statusColors[lead.status]">{{ statusLabels[lead.status] }}</span>
            <span class="badge bg-gray-100 text-gray-600 text-[10px]">{{ sourceLabels[lead.source] || lead.source }}</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
            <span v-if="lead.companyName">{{ lead.companyName }}</span>
            <span v-if="lead.phone" dir="ltr">{{ lead.phone }}</span>
            <span v-if="lead.estimatedValue" class="text-green-600 font-medium">{{ formatCurrency(lead.estimatedValue) }}</span>
            <span v-if="lead.assignedTo" class="text-gray-400">{{ typeof lead.assignedTo === 'object' ? lead.assignedTo.name : '' }}</span>
          </div>
        </div>
        <div class="flex items-center gap-2 mr-4 shrink-0">
          <button v-if="lead.status !== 'converted' && lead.status !== 'lost'" @click="openConvert(lead)" class="text-xs text-primary-600 hover:text-primary-800 font-medium">تحويل</button>
          <button v-if="authStore.isAdmin" @click="deleteLead(lead.id)" class="text-xs text-red-500 hover:text-red-700">حذف</button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="leadsStore.totalDocs > 20" class="flex justify-center gap-2 mt-4">
      <button @click="leadsStore.page--; leadsStore.fetchLeads()" :disabled="leadsStore.page <= 1" class="btn-secondary">السابق</button>
      <span class="text-sm text-gray-500 self-center">صفحة {{ leadsStore.page }}</span>
      <button @click="leadsStore.page++; leadsStore.fetchLeads()" :disabled="leadsStore.leads.length < 20" class="btn-secondary">التالي</button>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateModal = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 class="mb-4 text-lg font-bold">إضافة عميل محتمل</h2>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div><label class="label">الاسم *</label><input v-model="form.name" class="input" required /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">الهاتف</label><input v-model="form.phone" class="input" dir="ltr" /></div>
              <div><label class="label">البريد</label><input v-model="form.email" type="email" class="input" dir="ltr" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">اسم الشركة</label><input v-model="form.companyName" class="input" /></div>
              <div><label class="label">المسمى الوظيفي</label><input v-model="form.jobTitle" class="input" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">المصدر *</label>
                <select v-model="form.source" class="input" required>
                  <option v-for="(label, key) in sourceLabels" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div><label class="label">المدينة</label><input v-model="form.city" class="input" /></div>
            </div>
            <div><label class="label">القيمة المتوقعة (USD)</label><input v-model.number="form.estimatedValue" type="number" class="input" dir="ltr" min="0" /></div>
            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'جاري الحفظ...' : 'حفظ' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- Convert Modal -->
    <Teleport to="body">
      <div v-if="showConvertModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showConvertModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold">تحويل العميل المحتمل</h2>
          <p class="text-sm text-gray-500 mb-4">سيتم إنشاء جهة اتصال وشركة (إن وجد اسم شركة) تلقائياً.</p>
          <form @submit.prevent="handleConvert" class="space-y-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" v-model="convertForm.createDeal" class="rounded" />
              <span class="text-sm">إنشاء صفقة أيضاً</span>
            </label>
            <div v-if="convertForm.createDeal">
              <div><label class="label">عنوان الصفقة</label><input v-model="convertForm.dealTitle" class="input" /></div>
              <div class="mt-3"><label class="label">قيمة الصفقة (USD)</label><input v-model.number="convertForm.dealValue" type="number" class="input" dir="ltr" min="0" /></div>
            </div>
            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showConvertModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'جاري التحويل...' : 'تحويل' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
