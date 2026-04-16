<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تفاصيل عرض الأسعار' })

const route = useRoute()
const api = useApi()
const toast = useToast()

const quote = ref<any>(null)
const loading = ref(true)

const statusLabels: Record<string, string> = { draft: 'مسودة', sent: 'مرسل', accepted: 'مقبول', rejected: 'مرفوض', expired: 'منتهي' }
const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', sent: 'bg-blue-100 text-blue-700', accepted: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700', expired: 'bg-yellow-100 text-yellow-700' }

onMounted(async () => {
  loading.value = true
  try {
    quote.value = await api.get(`/quotes/${route.params.id}`, { query: { depth: 1 } })
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

async function changeStatus(status: string) {
  try {
    const res = await api.patch(`/quotes/${route.params.id}`, { status })
    quote.value = res.doc
    toast.success('تم تحديث الحالة')
  } catch { toast.error('خطأ') }
}

const creatingInvoice = ref(false)
async function createInvoice(): Promise<void> {
  creatingInvoice.value = true
  try {
    const res = await api.post('/pipeline/quote-to-invoice', { quoteId: quote.value.id })
    toast.success(res.message || 'تم إنشاء الفاتورة')
    await navigateTo(`/invoices/${res.doc.id}`)
  } catch (err: any) {
    const msg = err?.data?.error || err?.message || 'فشل إنشاء الفاتورة'
    toast.error(msg)
  } finally {
    creatingInvoice.value = false
  }
}

function formatCurrency(val: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: quote.value?.currency || 'USD', maximumFractionDigits: 2 }).format(val)
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'short', day: 'numeric' })
}

function printQuote() {
  window.print()
}
</script>

<template>
  <div v-if="loading" class="space-y-4">
    <div v-for="i in 2" :key="i" class="card animate-pulse"><div class="h-20 rounded bg-gray-200" /></div>
  </div>

  <div v-else-if="quote">
    <div class="mb-6 print:hidden">
      <NuxtLink to="/quotes" class="text-sm text-primary-600 hover:underline mb-1 block">← عروض الأسعار</NuxtLink>
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <h1 class="text-2xl font-bold text-gray-900 font-mono">{{ quote.quoteNumber }}</h1>
          <span class="badge text-sm" :class="statusColors[quote.status]">{{ statusLabels[quote.status] }}</span>
        </div>
        <div class="flex gap-2">
          <button @click="printQuote" class="btn-secondary text-sm">🖨 طباعة</button>
          <button v-if="quote.status === 'draft'" @click="changeStatus('sent')" class="btn-primary text-sm">إرسال</button>
          <button v-if="quote.status === 'sent'" @click="changeStatus('accepted')" class="bg-green-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-green-600">قبول</button>
          <button v-if="quote.status === 'sent'" @click="changeStatus('rejected')" class="bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-red-600">رفض</button>
          <button
            v-if="quote.status === 'accepted'"
            :disabled="creatingInvoice"
            class="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50"
            @click="createInvoice"
          >{{ creatingInvoice ? 'جاري...' : '📄 إنشاء فاتورة' }}</button>
        </div>
      </div>
    </div>

    <!-- Quote Details -->
    <div class="card mb-6">
      <div class="grid grid-cols-2 gap-4 text-sm mb-6">
        <div>
          <h3 class="font-bold mb-2">من</h3>
          <p class="text-gray-600">شركتك</p>
        </div>
        <div class="text-left">
          <h3 class="font-bold mb-2">إلى</h3>
          <p v-if="typeof quote.company === 'object' && quote.company" class="text-gray-600">{{ quote.company.name }}</p>
          <p v-if="typeof quote.contact === 'object' && quote.contact" class="text-gray-500 text-xs">{{ quote.contact.name }}</p>
        </div>
      </div>

      <div class="flex flex-wrap gap-4 text-sm text-gray-500 mb-6">
        <span>التاريخ: {{ formatDate(quote.createdAt) }}</span>
        <span v-if="quote.validUntil">صالح حتى: {{ formatDate(quote.validUntil) }}</span>
        <span v-if="typeof quote.deal === 'object' && quote.deal">الصفقة: <NuxtLink :to="`/deals/${quote.deal.id}`" class="text-primary-600 hover:underline">{{ quote.deal.title }}</NuxtLink></span>
      </div>

      <!-- Items Table -->
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 text-gray-400 text-xs">
              <th class="py-2 text-right">#</th>
              <th class="py-2 text-right">الوصف</th>
              <th class="py-2 text-center">الكمية</th>
              <th class="py-2 text-center">سعر الوحدة</th>
              <th class="py-2 text-center">الخصم</th>
              <th class="py-2 text-left">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, i) in quote.items" :key="i" class="border-b last:border-0">
              <td class="py-2 text-gray-400">{{ i + 1 }}</td>
              <td class="py-2">
                <span v-if="typeof item.product === 'object' && item.product" class="text-xs text-primary-600">{{ item.product.name }} — </span>
                {{ item.description }}
              </td>
              <td class="py-2 text-center">{{ item.quantity }}</td>
              <td class="py-2 text-center" dir="ltr">{{ formatCurrency(item.unitPrice) }}</td>
              <td class="py-2 text-center">{{ item.discount || 0 }}%</td>
              <td class="py-2 text-left font-medium" dir="ltr">{{ formatCurrency((item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Totals -->
      <div class="mt-4 pt-4 border-t border-gray-200 text-sm">
        <div class="flex justify-between mb-1"><span class="text-gray-400">المجموع الفرعي</span><span dir="ltr">{{ formatCurrency(quote.subtotal || 0) }}</span></div>
        <div v-if="quote.taxRate" class="flex justify-between mb-1"><span class="text-gray-400">الضريبة ({{ quote.taxRate }}%)</span><span dir="ltr">{{ formatCurrency((quote.subtotal || 0) * (quote.taxRate / 100)) }}</span></div>
        <div class="flex justify-between text-lg font-bold mt-2 pt-2 border-t"><span>الإجمالي</span><span class="text-green-600" dir="ltr">{{ formatCurrency(quote.total || 0) }}</span></div>
      </div>
    </div>

    <!-- Terms -->
    <div v-if="quote.termsAndConditions" class="card">
      <h3 class="font-bold mb-2">الشروط والأحكام</h3>
      <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ quote.termsAndConditions }}</p>
    </div>
  </div>
</template>
