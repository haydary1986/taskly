<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'المنتجات والخدمات' })

const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

const products = ref<any[]>([])
const loading = ref(true)
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const editingId = ref('')

const form = reactive({
  name: '', description: '', type: 'service', sku: '', price: 0, currency: 'USD', category: '', isActive: true,
})

const filtered = computed(() => {
  if (!search.value) return products.value
  const s = search.value.toLowerCase()
  return products.value.filter((p) => p.name?.toLowerCase().includes(s) || p.sku?.toLowerCase().includes(s) || p.category?.toLowerCase().includes(s))
})

onMounted(async () => {
  loading.value = true
  try {
    const res = await api.get('/products', { query: { limit: 500, sort: '-createdAt', depth: 0 } })
    products.value = res.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

function openCreate() {
  editingId.value = ''
  Object.assign(form, { name: '', description: '', type: 'service', sku: '', price: 0, currency: 'USD', category: '', isActive: true })
  showModal.value = true
}

function openEdit(product: any) {
  editingId.value = product.id
  Object.assign(form, {
    name: product.name, type: product.type, sku: product.sku || '', price: product.price,
    currency: product.currency || 'USD', category: product.category || '', isActive: product.isActive,
  })
  showModal.value = true
}

async function handleSubmit() {
  saving.value = true
  try {
    if (editingId.value) {
      const res = await api.patch(`/products/${editingId.value}`, { ...form, sku: form.sku || undefined })
      const idx = products.value.findIndex((p) => p.id === editingId.value)
      if (idx !== -1) products.value[idx] = res.doc
    } else {
      const res = await api.post('/products', { ...form, sku: form.sku || undefined })
      products.value.unshift(res.doc)
    }
    showModal.value = false
    toast.success(editingId.value ? 'تم التحديث' : 'تم الإضافة')
  } catch (err: any) { toast.error(err?.data?.errors?.[0]?.message || 'خطأ') }
  finally { saving.value = false }
}

async function deleteProduct(id: string) {
  if (!confirm('هل أنت متأكد؟')) return
  try {
    await api.del(`/products/${id}`)
    products.value = products.value.filter((p) => p.id !== id)
  } catch { toast.error('خطأ') }
}

function formatCurrency(val: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(val)
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-gray-900">المنتجات والخدمات</h1>
      <button v-if="authStore.isAdmin" @click="openCreate" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        إضافة
      </button>
    </div>

    <div class="card mb-4">
      <input v-model="search" type="text" class="input" placeholder="بحث بالاسم، الرمز، الفئة..." />
      <p class="mt-2 text-xs text-gray-400">{{ filtered.length }} منتج/خدمة</p>
    </div>

    <div v-if="loading" class="space-y-3">
      <div v-for="i in 4" :key="i" class="card animate-pulse"><div class="h-12 rounded bg-gray-200" /></div>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <p v-if="!filtered.length" class="col-span-full card py-8 text-center text-gray-400">لا توجد منتجات</p>
      <div v-for="product in filtered" :key="product.id" class="card">
        <div class="flex items-start justify-between mb-2">
          <div>
            <h3 class="font-medium text-gray-900">{{ product.name }}</h3>
            <span class="badge text-[10px]" :class="product.type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'">
              {{ product.type === 'product' ? 'منتج' : 'خدمة' }}
            </span>
            <span v-if="!product.isActive" class="badge bg-red-100 text-red-700 text-[10px] mr-1">غير نشط</span>
          </div>
          <p class="text-lg font-bold text-green-600">{{ formatCurrency(product.price, product.currency) }}</p>
        </div>
        <div class="text-xs text-gray-400 space-y-0.5">
          <p v-if="product.sku">SKU: {{ product.sku }}</p>
          <p v-if="product.category">الفئة: {{ product.category }}</p>
        </div>
        <div v-if="authStore.isAdmin" class="flex gap-2 mt-3 pt-2 border-t">
          <button @click="openEdit(product)" class="text-xs text-primary-600 hover:underline">تعديل</button>
          <button @click="deleteProduct(product.id)" class="text-xs text-red-500 hover:underline">حذف</button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showModal = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold">{{ editingId ? 'تعديل' : 'إضافة' }} منتج/خدمة</h2>
          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div><label class="label">الاسم *</label><input v-model="form.name" class="input" required /></div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">النوع</label><select v-model="form.type" class="input"><option value="product">منتج</option><option value="service">خدمة</option></select></div>
              <div><label class="label">الرمز (SKU)</label><input v-model="form.sku" class="input" dir="ltr" /></div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div><label class="label">السعر *</label><input v-model.number="form.price" type="number" class="input" dir="ltr" min="0" required /></div>
              <div><label class="label">العملة</label><select v-model="form.currency" class="input"><option value="USD">USD</option><option value="IQD">IQD</option><option value="EUR">EUR</option></select></div>
            </div>
            <div><label class="label">الفئة</label><input v-model="form.category" class="input" /></div>
            <label class="flex items-center gap-2"><input type="checkbox" v-model="form.isActive" class="rounded" /><span class="text-sm">نشط</span></label>
            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="saving" class="btn-primary">{{ saving ? 'جاري الحفظ...' : 'حفظ' }}</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
