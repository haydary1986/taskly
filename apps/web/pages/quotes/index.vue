<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'عروض الأسعار' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()
const route = useRoute()

const quotes = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const statusFilter = ref('')
const showCreateModal = ref(false)
const saving = ref(false)
const deals = ref<any[]>([])
const companies = ref<any[]>([])
const products = ref<any[]>([])
const leads = ref<any[]>([])

const form = reactive({
  deal: '', company: '', contact: '', lead: '', validUntil: '', taxRate: 0, currency: 'USD',
  items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, product: '' }] as any[],
  termsAndConditions: '',
})

const statusLabels: Record<string, string> = { draft: 'مسودة', sent: 'مرسل', accepted: 'مقبول', rejected: 'مرفوض', expired: 'منتهي' }
const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', expired: 'bg-yellow-100 text-yellow-700' }

const filtered = computed(() => {
  let result = quotes.value
  if (search.value) {
    const s = search.value.toLowerCase()
    result = result.filter((q) => q.quoteNumber?.toLowerCase().includes(s))
  }
  if (statusFilter.value) result = result.filter((q) => q.status === statusFilter.value)
  return result
})

const formTotal = computed(() => {
  let subtotal = 0
  for (const item of form.items) {
    const line = (item.quantity || 0) * (item.unitPrice || 0)
    subtotal += line - line * ((item.discount || 0) / 100)
  }
  const tax = subtotal * ((form.taxRate || 0) / 100)
  return { subtotal, tax, total: subtotal + tax }
})

onMounted(async () => {
  const dealId = route.query.deal as string
  const where: Record<string, any> = {}
  if (dealId) where.deal = { equals: dealId }

  loading.value = true
  try {
    const [qRes, dRes, cRes, pRes, lRes] = await Promise.all([
      api.get('/quotes', { query: { where, sort: '-createdAt', limit: 200, depth: 1 } }),
      api.get('/deals', { query: { limit: 500, depth: 0 } }),
      api.get('/companies', { query: { limit: 500, depth: 0 } }),
      api.get('/products', { query: { where: { isActive: { equals: true } }, limit: 500, depth: 0 } }),
      api.get('/leads', { query: { limit: 2000, depth: 0, sort: '-createdAt' } }),
    ])
    quotes.value = qRes.docs
    deals.value = dRes.docs
    companies.value = cRes.docs
    products.value = pRes.docs
    leads.value = lRes.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }

  // Auto-open create modal if ?create=1 present
  if (route.query.create === '1') {
    openCreate()
    if (route.query.lead) form.lead = route.query.lead as string
  }
})

function openCreate() {
  Object.assign(form, {
    deal: route.query.deal || '', company: '', contact: '', lead: '', validUntil: '', taxRate: 0, currency: 'USD',
    items: [{ description: '', quantity: 1, unitPrice: 0, discount: 0, product: '' }],
    termsAndConditions: '',
  })
  showCreateModal.value = true
}

function addItem() {
  form.items.push({ description: '', quantity: 1, unitPrice: 0, discount: 0, product: '' })
}

function removeItem(index: number) {
  if (form.items.length > 1) form.items.splice(index, 1)
}

function onProductSelect(item: any) {
  if (item.product) {
    const p = products.value.find((pr) => pr.id === item.product)
    if (p) {
      item.description = p.name
      item.unitPrice = p.price
    }
  }
}

async function createCompanyInline(name: string): Promise<void> {
  try {
    const res = await api.post('/companies', { name })
    companies.value.push(res.doc)
    form.company = res.doc.id
    toast.success(`تم إضافة الشركة: ${name}`)
  } catch (err: any) {
    toast.error(err?.data?.errors?.[0]?.message || 'فشل إضافة الشركة')
  }
}

async function createDealInline(title: string): Promise<void> {
  try {
    const res = await api.post('/deals', { title, stage: 'qualification' })
    deals.value.push(res.doc)
    form.deal = res.doc.id
    toast.success(`تم إضافة الصفقة: ${title}`)
  } catch (err: any) {
    toast.error(err?.data?.errors?.[0]?.message || 'فشل إضافة الصفقة')
  }
}

async function handleCreate() {
  saving.value = true
  try {
    const data = {
      ...form,
      deal: form.deal || undefined,
      company: form.company || undefined,
      contact: form.contact || undefined,
      lead: form.lead || undefined,
      validUntil: form.validUntil || undefined,
      items: form.items.map((item) => ({
        ...item,
        product: item.product || undefined,
      })),
    }
    const res = await api.post('/quotes', data)
    quotes.value.unshift(res.doc)
    showCreateModal.value = false
    toast.success('تم إنشاء عرض الأسعار')
  } catch (err: any) { toast.error(err?.data?.errors?.[0]?.message || 'خطأ') }
  finally { saving.value = false }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">عروض الأسعار</h1>
      <button @click="openCreate" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        عرض سعر جديد
      </button>
    </div>

    <div class="card mb-4">
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="sm:col-span-2"><input v-model="search" type="text" class="input" placeholder="بحث برقم العرض..." /></div>
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
      <p v-if="!filtered.length" class="card py-8 text-center text-gray-400">لا توجد عروض أسعار</p>
      <NuxtLink
        v-for="q in filtered"
        :key="q.id"
        :to="`/quotes/${q.id}`"
        class="card flex items-center justify-between !py-3 hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
      >
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-mono font-medium text-gray-900">{{ q.quoteNumber }}</span>
            <span class="badge text-[10px]" :class="statusColors[q.status]">{{ statusLabels[q.status] }}</span>
          </div>
          <div class="mt-1 flex flex-wrap items-center gap-x-4 text-xs text-gray-500">
            <span v-if="typeof q.company === 'object' && q.company">{{ q.company.name }}</span>
            <span v-if="typeof q.deal === 'object' && q.deal">{{ q.deal.title }}</span>
            <span>{{ q.items?.length || 0 }} بند</span>
            <span v-if="q.validUntil">صالح حتى {{ formatDate(q.validUntil) }}</span>
          </div>
        </div>
        <span class="text-sm font-bold text-green-600 mr-4">{{ formatCurrency(q.total || 0) }}</span>
      </NuxtLink>
    </div>

    <!-- Create Modal -->
    <Teleport to="body">
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateModal = false">
        <div class="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
          <h2 class="mb-4 text-lg font-bold">عرض سعر جديد</h2>
          <form @submit.prevent="handleCreate" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="label">العميل المحتمل (من Google Maps)</label>
                <FormSearchableSelect
                  v-model="form.lead"
                  :options="leads"
                  label-key="name"
                  :placeholder="`ابحث من ${leads.length} عميل محتمل...`"
                />
                <p class="text-[10px] text-gray-400 mt-1">اختر واحداً من العملاء المستوردين أو استخدم حقل الشركة أدناه</p>
              </div>
              <div>
                <label class="label">الشركة</label>
                <FormSearchableSelect
                  v-model="form.company"
                  :options="companies"
                  label-key="name"
                  placeholder="ابحث عن الشركة..."
                  allow-create
                  create-label="+ إضافة شركة"
                  @create="createCompanyInline"
                />
              </div>
              <div>
                <label class="label">الصفقة</label>
                <FormSearchableSelect
                  v-model="form.deal"
                  :options="deals"
                  label-key="title"
                  placeholder="ابحث عن صفقة..."
                  allow-create
                  create-label="+ إنشاء صفقة"
                  @create="createDealInline"
                />
              </div>
              <div><label class="label">صالح حتى</label><input v-model="form.validUntil" type="date" class="input" /></div>
            </div>

            <!-- Items -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="label !mb-0">البنود *</label>
                <button type="button" @click="addItem" class="text-xs text-primary-600 hover:underline">+ إضافة بند</button>
              </div>
              <div v-for="(item, i) in form.items" :key="i" class="grid grid-cols-2 sm:grid-cols-12 gap-2 mb-3 items-end border sm:border-0 border-gray-100 rounded-lg p-2 sm:p-0">
                <div class="col-span-2 sm:col-span-3">
                  <select v-model="item.product" @change="onProductSelect(item)" class="input text-xs">
                    <option value="">منتج مخصص</option>
                    <option v-for="p in products" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </select>
                </div>
                <div class="col-span-2 sm:col-span-3"><input v-model="item.description" class="input text-xs" placeholder="الوصف" required /></div>
                <div class="col-span-1 sm:col-span-2"><input v-model.number="item.quantity" type="number" class="input text-xs" min="1" placeholder="الكمية" /></div>
                <div class="col-span-1 sm:col-span-2"><input v-model.number="item.unitPrice" type="number" class="input text-xs" min="0" placeholder="السعر" dir="ltr" /></div>
                <div class="col-span-1 sm:col-span-1"><input v-model.number="item.discount" type="number" class="input text-xs" min="0" max="100" placeholder="%" /></div>
                <div class="col-span-1 sm:col-span-1">
                  <button v-if="form.items.length > 1" type="button" @click="removeItem(i)" class="text-red-500 text-xs hover:text-red-700 w-full text-center">✕ حذف</button>
                </div>
              </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">الضريبة (%)</label><input v-model.number="form.taxRate" type="number" class="input" dir="ltr" min="0" max="100" /></div>
              <div class="text-left self-end">
                <p class="text-xs text-gray-400">المجموع الفرعي: {{ formatCurrency(formTotal.subtotal) }}</p>
                <p class="text-xs text-gray-400">الضريبة: {{ formatCurrency(formTotal.tax) }}</p>
                <p class="text-sm font-bold text-green-600">الإجمالي: {{ formatCurrency(formTotal.total) }}</p>
              </div>
            </div>

            <div><label class="label">الشروط والأحكام</label><textarea v-model="form.termsAndConditions" class="input" rows="2" /></div>

            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showCreateModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'جاري الإنشاء...' : 'إنشاء العرض' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
