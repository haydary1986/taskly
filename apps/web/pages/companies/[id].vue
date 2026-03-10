<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تفاصيل الشركة' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

const company = ref<any>(null)
const contacts = ref<any[]>([])
const deals = ref<any[]>([])
const activities = ref<any[]>([])
const loading = ref(true)
const editing = ref(false)
const editForm = reactive<any>({})

const industryLabels: Record<string, string> = {
  it: 'تكنولوجيا المعلومات', trade: 'التجارة', manufacturing: 'التصنيع', services: 'الخدمات',
  'real-estate': 'العقارات', healthcare: 'الصحة', education: 'التعليم', finance: 'المالية والبنوك',
  media: 'الإعلام', energy: 'النفط والطاقة', other: 'أخرى',
}

const stageLabels: Record<string, string> = { qualification: 'تأهيل', proposal: 'عرض سعر', negotiation: 'مفاوضة', won: 'مكسوبة', lost: 'خاسرة' }
const stageColors: Record<string, string> = { qualification: 'bg-blue-100 text-blue-700', proposal: 'bg-yellow-100 text-yellow-700', negotiation: 'bg-orange-100 text-orange-700', won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700' }

onMounted(async () => {
  await loadCompany()
})

async function loadCompany() {
  loading.value = true
  try {
    const [compRes, contactsRes, dealsRes, activitiesRes] = await Promise.all([
      api.get(`/companies/${route.params.id}`, { query: { depth: 1 } }),
      api.get('/clients', { query: { where: { company: { equals: route.params.id } }, limit: 100, depth: 0 } }),
      api.get('/deals', { query: { where: { company: { equals: route.params.id } }, sort: '-createdAt', limit: 100, depth: 1 } }),
      api.get('/crm-activities', { query: { where: { company: { equals: route.params.id } }, sort: '-createdAt', limit: 50, depth: 1 } }),
    ])
    company.value = compRes
    contacts.value = contactsRes.docs
    deals.value = dealsRes.docs
    activities.value = activitiesRes.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

function startEdit() {
  Object.assign(editForm, {
    name: company.value.name, industry: company.value.industry || '', phone: company.value.phone || '',
    email: company.value.email || '', website: company.value.website || '', address: company.value.address || '',
    city: company.value.city || '', status: company.value.status, employeeCount: company.value.employeeCount || '',
    annualRevenue: company.value.annualRevenue || '',
  })
  editing.value = true
}

async function saveEdit() {
  try {
    const res = await api.patch(`/companies/${route.params.id}`, editForm)
    company.value = res.doc
    editing.value = false
    toast.success('تم التحديث')
  } catch (err: any) { toast.error('خطأ في التحديث') }
}

const totalDealsValue = computed(() => deals.value.reduce((sum, d) => sum + (d.value || 0), 0))
const wonDeals = computed(() => deals.value.filter((d) => d.stage === 'won'))
const openDeals = computed(() => deals.value.filter((d) => !['won', 'lost'].includes(d.stage)))

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

  <div v-else-if="company">
    <div class="mb-6 flex items-center justify-between">
      <div>
        <NuxtLink to="/companies" class="text-sm text-primary-600 hover:underline mb-1 block">← الشركات</NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900">{{ company.name }}</h1>
      </div>
      <button v-if="!editing" @click="startEdit" class="btn-secondary">تعديل</button>
    </div>

    <!-- Edit Form -->
    <div v-if="editing" class="card mb-6">
      <form @submit.prevent="saveEdit" class="space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">اسم الشركة</label><input v-model="editForm.name" class="input" required /></div>
          <div><label class="label">القطاع</label><select v-model="editForm.industry" class="input"><option value="">—</option><option v-for="(l,k) in industryLabels" :key="k" :value="k">{{l}}</option></select></div>
        </div>
        <div class="grid grid-cols-3 gap-3">
          <div><label class="label">الهاتف</label><input v-model="editForm.phone" class="input" dir="ltr" /></div>
          <div><label class="label">البريد</label><input v-model="editForm.email" class="input" dir="ltr" /></div>
          <div><label class="label">الموقع</label><input v-model="editForm.website" class="input" dir="ltr" /></div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="label">المدينة</label><input v-model="editForm.city" class="input" /></div>
          <div><label class="label">العنوان</label><input v-model="editForm.address" class="input" /></div>
        </div>
        <div class="flex justify-end gap-3">
          <button type="button" @click="editing = false" class="btn-secondary">إلغاء</button>
          <button type="submit" class="btn-primary">حفظ</button>
        </div>
      </form>
    </div>

    <!-- Stats -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
      <div class="card text-center">
        <p class="text-2xl font-bold text-primary-600">{{ contacts.length }}</p>
        <p class="text-xs text-gray-500">جهات الاتصال</p>
      </div>
      <div class="card text-center">
        <p class="text-2xl font-bold text-blue-600">{{ deals.length }}</p>
        <p class="text-xs text-gray-500">الصفقات</p>
      </div>
      <div class="card text-center">
        <p class="text-2xl font-bold text-green-600">{{ formatCurrency(totalDealsValue) }}</p>
        <p class="text-xs text-gray-500">إجمالي القيمة</p>
      </div>
      <div class="card text-center">
        <p class="text-2xl font-bold text-orange-600">{{ activities.length }}</p>
        <p class="text-xs text-gray-500">الأنشطة</p>
      </div>
    </div>

    <!-- Info Card -->
    <div v-if="!editing" class="card mb-6">
      <h3 class="font-bold mb-3">معلومات الشركة</h3>
      <div class="grid grid-cols-2 gap-3 text-sm">
        <div v-if="company.industry"><span class="text-gray-400">القطاع:</span> {{ industryLabels[company.industry] || company.industry }}</div>
        <div v-if="company.phone"><span class="text-gray-400">الهاتف:</span> <span dir="ltr">{{ company.phone }}</span></div>
        <div v-if="company.email"><span class="text-gray-400">البريد:</span> {{ company.email }}</div>
        <div v-if="company.website"><span class="text-gray-400">الموقع:</span> {{ company.website }}</div>
        <div v-if="company.city"><span class="text-gray-400">المدينة:</span> {{ company.city }}</div>
        <div v-if="company.employeeCount"><span class="text-gray-400">الموظفين:</span> {{ company.employeeCount }}</div>
      </div>
    </div>

    <!-- Deals -->
    <div class="card mb-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold">الصفقات ({{ deals.length }})</h3>
        <NuxtLink to="/deals" class="text-xs text-primary-600 hover:underline">عرض الكل</NuxtLink>
      </div>
      <div v-if="deals.length" class="space-y-2">
        <NuxtLink v-for="deal in deals.slice(0, 10)" :key="deal.id" :to="`/deals/${deal.id}`"
          class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div>
            <span class="font-medium text-sm">{{ deal.title }}</span>
            <span class="badge text-[10px] mr-2" :class="stageColors[deal.stage]">{{ stageLabels[deal.stage] }}</span>
          </div>
          <span class="text-sm font-bold text-gray-700">{{ formatCurrency(deal.value || 0) }}</span>
        </NuxtLink>
      </div>
      <p v-else class="text-sm text-gray-400 text-center py-4">لا توجد صفقات</p>
    </div>

    <!-- Contacts -->
    <div class="card mb-6">
      <h3 class="font-bold mb-3">جهات الاتصال ({{ contacts.length }})</h3>
      <div v-if="contacts.length" class="space-y-2">
        <NuxtLink v-for="contact in contacts" :key="contact.id" :to="`/clients/${contact.id}`"
          class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
          <div>
            <span class="font-medium text-sm">{{ contact.name }}</span>
            <span v-if="contact.jobTitle" class="text-xs text-gray-400 mr-2">{{ contact.jobTitle }}</span>
          </div>
          <span v-if="contact.phone" class="text-xs text-gray-500" dir="ltr">{{ contact.phone }}</span>
        </NuxtLink>
      </div>
      <p v-else class="text-sm text-gray-400 text-center py-4">لا توجد جهات اتصال</p>
    </div>

    <!-- Recent Activities -->
    <div class="card">
      <h3 class="font-bold mb-3">آخر الأنشطة</h3>
      <div v-if="activities.length" class="space-y-2">
        <div v-for="act in activities.slice(0, 10)" :key="act.id" class="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
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
            <p class="text-sm font-medium truncate">{{ act.subject }}</p>
            <p class="text-[10px] text-gray-400">{{ formatDate(act.createdAt) }}</p>
          </div>
          <span class="badge text-[10px]" :class="act.completed ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'">
            {{ act.completed ? 'مكتمل' : 'قيد الانتظار' }}
          </span>
        </div>
      </div>
      <p v-else class="text-sm text-gray-400 text-center py-4">لا توجد أنشطة</p>
    </div>
  </div>
</template>
