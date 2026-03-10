<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إدارة الشركات' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const companiesStore = useCompaniesStore()

const search = ref('')
const industryFilter = ref('')
const showCreateModal = ref(false)
const saving = ref(false)

const form = reactive({
  name: '', industry: '', phone: '', email: '', website: '', address: '', city: '', status: 'active', employeeCount: '', notes: '',
})

const industryLabels: Record<string, string> = {
  it: 'تكنولوجيا المعلومات', trade: 'التجارة', manufacturing: 'التصنيع', services: 'الخدمات',
  'real-estate': 'العقارات', healthcare: 'الصحة', education: 'التعليم', finance: 'المالية والبنوك',
  media: 'الإعلام', energy: 'النفط والطاقة', other: 'أخرى',
}

const statusLabels: Record<string, string> = { active: 'نشطة', inactive: 'غير نشطة', prospect: 'محتمل' }
const statusColors: Record<string, string> = { active: 'bg-green-100 text-green-700', inactive: 'bg-gray-100 text-gray-600', prospect: 'bg-blue-100 text-blue-700' }

const filtered = computed(() => {
  let result = companiesStore.companies
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter((c) =>
      c.name?.toLowerCase().includes(s) || c.phone?.includes(s) || c.email?.toLowerCase().includes(s) || c.city?.toLowerCase().includes(s),
    )
  }
  if (industryFilter.value) result = result.filter((c) => c.industry === industryFilter.value)
  return result
})

const industries = computed(() => [...new Set(companiesStore.companies.map((c) => c.industry).filter(Boolean))])

onMounted(() => companiesStore.fetchCompanies())

function openCreate() {
  Object.assign(form, { name: '', industry: '', phone: '', email: '', website: '', address: '', city: '', status: 'active', employeeCount: '', notes: '' })
  showCreateModal.value = true
}

async function handleCreate() {
  saving.value = true
  try {
    await companiesStore.createCompany({ ...form } as any)
    showCreateModal.value = false
    toast.success('تم إضافة الشركة بنجاح')
  } catch (err: any) {
    toast.error(err?.data?.errors?.[0]?.message || 'خطأ في الحفظ')
  } finally { saving.value = false }
}

async function deleteCompany(id: string) {
  if (!confirm('هل أنت متأكد من حذف هذه الشركة؟')) return
  try {
    await companiesStore.deleteCompany(id)
    toast.success('تم الحذف')
  } catch (err: any) { toast.error('خطأ في الحذف') }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">إدارة الشركات</h1>
      <button @click="openCreate" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        إضافة شركة
      </button>
    </div>

    <div class="card mb-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2">
          <input v-model="search" type="text" class="input" placeholder="بحث بالاسم، الهاتف، البريد، المدينة..." />
        </div>
        <select v-model="industryFilter" class="input">
          <option value="">كل القطاعات</option>
          <option v-for="ind in industries" :key="ind" :value="ind">{{ industryLabels[ind!] || ind }}</option>
        </select>
      </div>
      <p class="mt-2 text-xs text-gray-400">{{ filtered.length }} شركة</p>
    </div>

    <div v-if="companiesStore.loading" class="space-y-3">
      <div v-for="i in 5" :key="i" class="card animate-pulse"><div class="h-14 rounded bg-gray-200" /></div>
    </div>

    <div v-else class="space-y-2">
      <p v-if="!filtered.length" class="card py-8 text-center text-gray-400">لا توجد شركات مطابقة</p>
      <NuxtLink
        v-for="company in filtered"
        :key="company.id"
        :to="`/companies/${company.id}`"
        class="card flex items-center justify-between !py-3 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-medium text-gray-900">{{ company.name }}</span>
            <span class="badge text-[10px]" :class="statusColors[company.status] || 'bg-gray-100'">{{ statusLabels[company.status] || company.status }}</span>
            <span v-if="company.industry" class="badge bg-purple-100 text-purple-700 text-[10px]">{{ industryLabels[company.industry] || company.industry }}</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-gray-500">
            <span v-if="company.phone" dir="ltr">{{ company.phone }}</span>
            <span v-if="company.city">{{ company.city }}</span>
            <span v-if="company.email">{{ company.email }}</span>
            <span v-if="company.employeeCount" class="text-gray-400">{{ company.employeeCount }} موظف</span>
          </div>
        </div>
        <div class="flex items-center gap-3 mr-4 shrink-0">
          <button
            v-if="authStore.isAdmin"
            @click.prevent="deleteCompany(company.id)"
            class="text-xs text-red-500 hover:text-red-700"
          >حذف</button>
        </div>
      </NuxtLink>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateModal = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 class="mb-4 text-lg font-bold">إضافة شركة جديدة</h2>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div>
              <label class="label">اسم الشركة *</label>
              <input v-model="form.name" class="input" required />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">القطاع</label>
                <select v-model="form.industry" class="input">
                  <option value="">اختر القطاع</option>
                  <option v-for="(label, key) in industryLabels" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="label">الحالة</label>
                <select v-model="form.status" class="input">
                  <option value="active">نشطة</option>
                  <option value="inactive">غير نشطة</option>
                  <option value="prospect">محتمل</option>
                </select>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">رقم الهاتف</label><input v-model="form.phone" class="input" dir="ltr" /></div>
              <div><label class="label">البريد الإلكتروني</label><input v-model="form.email" type="email" class="input" dir="ltr" /></div>
            </div>
            <div><label class="label">الموقع الإلكتروني</label><input v-model="form.website" class="input" dir="ltr" placeholder="https://" /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">المدينة</label><input v-model="form.city" class="input" /></div>
              <div><label class="label">العنوان</label><input v-model="form.address" class="input" /></div>
            </div>
            <div>
              <label class="label">عدد الموظفين</label>
              <select v-model="form.employeeCount" class="input">
                <option value="">غير محدد</option>
                <option value="1-10">1-10</option>
                <option value="11-50">11-50</option>
                <option value="51-200">51-200</option>
                <option value="201-500">201-500</option>
                <option value="500+">500+</option>
              </select>
            </div>
            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'جاري الحفظ...' : 'حفظ' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
