<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'تفاصيل الفاتورة' })

const route = useRoute()
const api = useApi()
const toast = useToast()
const brandingStore = useBrandingStore()

const invoice = ref<any>(null)
const loading = ref(true)
const updating = ref(false)

const statusLabels: Record<string, string> = {
  draft: 'مسودة', sent: 'مرسلة', paid: 'مدفوعة', overdue: 'متأخرة', cancelled: 'ملغاة',
}
const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-400',
}

async function load(): Promise<void> {
  loading.value = true
  try {
    invoice.value = await api.get(`/invoices/${route.params.id}`, { query: { depth: 2 } })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'فشل التحميل'
    toast.error(msg)
  } finally {
    loading.value = false
  }
}

onMounted(load)

async function updateStatus(newStatus: string): Promise<void> {
  if (!invoice.value) return
  updating.value = true
  try {
    await api.patch(`/invoices/${invoice.value.id}`, { status: newStatus })
    toast.success('تم التحديث')
    await load()
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'خطأ'
    toast.error(msg)
  } finally {
    updating.value = false
  }
}

function printInvoice(): void {
  window.print()
}

function formatCurrency(v: number, c = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 2 }).format(v || 0)
}
function formatDate(d: string): string {
  return d ? new Date(d).toLocaleDateString('ar-IQ', { dateStyle: 'long' }) : '—'
}
</script>

<template>
  <div v-if="loading" class="card animate-pulse"><div class="h-40 rounded bg-gray-200" /></div>

  <div v-else-if="invoice">
    <!-- Toolbar (hidden on print) -->
    <div class="print:hidden mb-6 flex items-center justify-between flex-wrap gap-3">
      <NuxtLink to="/invoices" class="text-sm text-primary-600 hover:underline">← الفواتير</NuxtLink>
      <div class="flex items-center gap-2 flex-wrap">
        <button class="btn-secondary text-sm" @click="printInvoice">🖨 طباعة / PDF</button>
        <button
          v-if="invoice.status === 'draft'"
          class="btn-primary text-sm"
          :disabled="updating"
          @click="updateStatus('sent')"
        >إرسال</button>
        <button
          v-if="invoice.status === 'sent' || invoice.status === 'overdue'"
          class="btn-primary text-sm"
          :disabled="updating"
          @click="updateStatus('paid')"
        >💰 تم الدفع</button>
      </div>
    </div>

    <!-- Invoice body (printable) -->
    <div class="card print:shadow-none print:border-0 print:p-0 print:m-0" id="invoice-print">
      <!-- Header -->
      <div class="flex items-start justify-between mb-6 pb-4 border-b">
        <div>
          <img v-if="brandingStore.logoUrl" :src="brandingStore.logoUrl" class="h-12 mb-2" :alt="brandingStore.appName" />
          <h1 class="text-2xl font-bold text-gray-900">{{ brandingStore.appName || 'Taskly' }}</h1>
          <p class="text-sm text-gray-500">{{ brandingStore.companyName }}</p>
        </div>
        <div class="text-left">
          <h2 class="text-3xl font-bold text-primary-600">فاتورة</h2>
          <p class="font-mono text-lg font-bold">{{ invoice.invoiceNumber }}</p>
          <span class="badge mt-2 inline-block" :class="statusColors[invoice.status]">
            {{ statusLabels[invoice.status] }}
          </span>
        </div>
      </div>

      <!-- Info grid -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 text-sm">
        <div v-if="typeof invoice.client === 'object' && invoice.client">
          <p class="text-xs text-gray-500 mb-1">العميل</p>
          <p class="font-semibold">{{ invoice.client.name }}</p>
          <p v-if="invoice.client.phone" dir="ltr" class="text-gray-600">{{ invoice.client.phone }}</p>
          <p v-if="invoice.client.email" dir="ltr" class="text-gray-600">{{ invoice.client.email }}</p>
        </div>
        <div v-if="typeof invoice.company === 'object' && invoice.company">
          <p class="text-xs text-gray-500 mb-1">الشركة</p>
          <p class="font-semibold">{{ invoice.company.name }}</p>
          <p v-if="invoice.company.city" class="text-gray-600">{{ invoice.company.city }}</p>
        </div>
        <div>
          <p class="text-xs text-gray-500 mb-1">التواريخ</p>
          <p><span class="text-gray-500">الإصدار:</span> {{ formatDate(invoice.issuedAt) }}</p>
          <p v-if="invoice.dueDate"><span class="text-gray-500">الاستحقاق:</span> {{ formatDate(invoice.dueDate) }}</p>
          <p v-if="invoice.paidAt" class="text-green-600"><span class="text-gray-500">الدفع:</span> {{ formatDate(invoice.paidAt) }}</p>
        </div>
      </div>

      <!-- Items table -->
      <table class="w-full mb-6 text-sm">
        <thead>
          <tr class="border-b-2 border-gray-200">
            <th class="text-right py-2 font-semibold">الوصف</th>
            <th class="text-center py-2 font-semibold w-20">الكمية</th>
            <th class="text-center py-2 font-semibold w-24">السعر</th>
            <th class="text-center py-2 font-semibold w-16">خصم</th>
            <th class="text-left py-2 font-semibold w-24">المجموع</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, i) in invoice.items || []" :key="i" class="border-b border-gray-100">
            <td class="py-2">{{ item.description }}</td>
            <td class="text-center py-2">{{ item.quantity }}</td>
            <td class="text-center py-2" dir="ltr">{{ formatCurrency(item.unitPrice, invoice.currency) }}</td>
            <td class="text-center py-2">{{ item.discount || 0 }}%</td>
            <td class="text-left py-2 font-medium" dir="ltr">
              {{ formatCurrency((item.quantity || 0) * (item.unitPrice || 0) * (1 - (item.discount || 0) / 100), invoice.currency) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <div class="flex justify-end mb-6">
        <div class="w-full sm:w-64 text-sm space-y-1">
          <div class="flex justify-between"><span class="text-gray-600">المجموع الفرعي:</span><span dir="ltr">{{ formatCurrency(invoice.subtotal, invoice.currency) }}</span></div>
          <div v-if="invoice.taxRate" class="flex justify-between"><span class="text-gray-600">ضريبة ({{ invoice.taxRate }}%):</span><span dir="ltr">{{ formatCurrency((invoice.subtotal || 0) * (invoice.taxRate || 0) / 100, invoice.currency) }}</span></div>
          <div class="flex justify-between pt-2 border-t-2 text-base font-bold"><span>الإجمالي:</span><span class="text-primary-600" dir="ltr">{{ formatCurrency(invoice.total, invoice.currency) }}</span></div>
        </div>
      </div>

      <div v-if="invoice.paymentTerms" class="mb-4 text-sm">
        <p class="font-semibold mb-1">شروط الدفع:</p>
        <p class="text-gray-600 whitespace-pre-wrap">{{ invoice.paymentTerms }}</p>
      </div>
      <div v-if="invoice.notes" class="text-sm">
        <p class="font-semibold mb-1">ملاحظات:</p>
        <p class="text-gray-600 whitespace-pre-wrap">{{ invoice.notes }}</p>
      </div>
    </div>
  </div>
</template>

<style>
@media print {
  body { background: white !important; }
  aside, nav, .print\:hidden { display: none !important; }
  .lg\:mr-64 { margin-right: 0 !important; }
  main { padding: 0 !important; }
}
</style>
