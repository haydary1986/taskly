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

onMounted(async () => {
  loading.value = true
  try {
    lead.value = await api.get(`/leads/${route.params.id}`, { query: { depth: 1 } })
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

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
</template>
