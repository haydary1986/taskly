<script setup lang="ts">
const route = useRoute()
const api = useApi()
const toast = useToast()
const authStore = useAuthStore()

const clientId = route.params.id as string
const client = ref<any>(null)
const visits = ref<any[]>([])
const loading = ref(true)

onMounted(async () => {
  await fetchClientData()
})

async function fetchClientData() {
  loading.value = true
  try {
    const res = await api.get(`/clients/${clientId}`, { query: { depth: 2 } })
    client.value = res
    
    // Fetch visits for this client
    const vRes = await api.get('/visits', {
      query: {
        where: { client: { equals: clientId } },
        sort: '-checkInTime',
        depth: 2,
        limit: 50
      }
    })
    visits.value = vRes.docs
  } catch (err: any) {
    toast.error('فشل جلب تفاصيل العميل')
  } finally {
    loading.value = false
  }
}

const tagLabels: Record<string, string> = {
  vip: 'VIP', new: 'جديد', regular: 'دائم', prospect: 'محتمل', inactive: 'متوقف',
}

function formatDate(dateStr: string) {
  if (!dateStr) return '-'
  return new Intl.DateTimeFormat('ar-EG', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(dateStr))
}

function getDuration(checkIn: string, checkOut?: string) {
  if (!checkOut) return 'مستمرة'
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins} دقيقة`
  const hrs = Math.floor(mins / 60)
  return `${hrs} ساعة و ${mins % 60} دقيقة`
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <NuxtLink to="/clients" class="btn-secondary !p-2" aria-label="رجوع">
          <svg class="h-5 w-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </NuxtLink>
        <h1 class="text-xl font-bold text-gray-900 md:text-2xl">تفاصيل العميل</h1>
      </div>
    </div>

    <div v-if="loading" class="space-y-4">
      <div class="card animate-pulse h-40 bg-gray-200"></div>
      <div class="card animate-pulse h-60 bg-gray-200"></div>
    </div>

    <div v-else-if="client" class="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      <!-- التفاصيل الأساسية والموقع -->
      <div class="md:col-span-1 space-y-6">
        <div class="card space-y-4">
          <div class="border-b pb-4">
            <h2 class="text-xl font-bold">{{ client.name }}</h2>
            <div class="mt-2 flex flex-wrap gap-2">
              <span v-for="tag in (client.tags || [])" :key="tag" class="badge bg-primary-100 text-primary-700 text-xs">
                {{ tagLabels[tag] || tag }}
              </span>
            </div>
          </div>
          
          <div class="space-y-3 text-sm">
            <div class="flex flex-col gap-1">
              <span class="text-gray-500 text-xs">رقم الهاتف</span>
              <a v-if="client.phone" :href="'tel:' + client.phone" class="font-medium text-blue-600" dir="ltr">{{ client.phone }}</a>
              <span v-else class="text-gray-400">-</span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-gray-500 text-xs">البريد الإلكتروني</span>
              <a v-if="client.email" :href="'mailto:' + client.email" class="font-medium text-blue-600 max-w-[200px] truncate" dir="ltr">{{ client.email }}</a>
              <span v-else class="text-gray-400">-</span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-gray-500 text-xs">المدينة / العنوان</span>
              <span class="font-medium text-gray-900">{{ client.city || '-' }} / {{ client.address || '-' }}</span>
            </div>

            <div class="flex flex-col gap-1">
              <span class="text-gray-500 text-xs">ملاحظات</span>
              <span class="font-medium text-gray-900 whitespace-pre-wrap">{{ client.notes || '-' }}</span>
            </div>
            
            <div class="flex flex-col gap-1 pt-3 border-t">
              <span class="text-gray-500 text-xs">أُضيف بواسطة</span>
              <div class="flex items-center gap-2 mt-1">
                <div class="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs">
                  {{ (client.createdBy?.name || '?').charAt(0) }}
                </div>
                <span class="font-medium text-gray-900">{{ client.createdBy?.name || 'مستورد من النظام القديم/غير معروف' }}</span>
              </div>
              <span class="text-gray-400 text-xs mt-1">{{ formatDate(client.createdAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Location Box -->
        <div class="card space-y-3">
          <h3 class="font-bold flex items-center gap-2">
            <svg class="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/></svg>
            الموقع الجغرافي
          </h3>
          <template v-if="client.location && client.location.length === 2">
            <div class="rounded-lg overflow-hidden border border-gray-200">
              <a :href="`https://www.google.com/maps/search/?api=1&query=${client.location[1]},${client.location[0]}`" target="_blank" title="افتح في خرائط جوجل">
                <img :src="`https://static-maps.yandex.ru/1.x/?lang=en-US&ll=${client.location[0]},${client.location[1]}&z=15&l=map&size=400,200&pt=${client.location[0]},${client.location[1]},pm2rdm`" 
                     alt="خريطة الموقع" class="w-full h-32 object-cover hover:opacity-90 transition-opacity" />
              </a>
            </div>
            <div class="text-center mt-2">
              <a :href="`https://www.google.com/maps/search/?api=1&query=${client.location[1]},${client.location[0]}`" target="_blank" class="text-sm text-blue-600 font-medium hover:underline flex items-center justify-center gap-1">
                فتح في خرائط جوجل
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
              </a>
            </div>
          </template>
          <div v-else class="text-gray-400 text-sm py-4 text-center bg-gray-50 rounded border border-dashed">
            لا يوجد موقع جغرافي لهذا العميل
          </div>
        </div>
      </div>

      <!-- الزيارات -->
      <div class="md:col-span-2 space-y-4">
        <h3 class="font-bold text-lg mb-2">سجل الزيارات ({{ visits.length }})</h3>
        
        <div v-if="!visits.length" class="card py-8 text-center text-gray-500">
          لم يتم تسجيل أي زيارات لهذا العميل حتى الآن. 
        </div>
        
        <div v-else class="space-y-3">
          <div v-for="visit in visits" :key="visit.id" class="card flex flex-col sm:flex-row gap-4 justify-between !py-4 transition-all hover:border-primary-200 hover:shadow-md">
            <!-- Left side indicator -->
            <div class="flex gap-4">
              <div class="flex flex-col items-center">
                <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold">
                  {{ visit.representative?.name?.charAt(0) || '؟' }}
                </div>
                <div v-if="visit.status === 'checked-out'" class="w-1 flex-1 bg-green-200 mt-2"></div>
                <div v-else-if="visit.status === 'cancelled'" class="w-1 flex-1 bg-red-200 mt-2"></div>
                <div v-else class="w-1 flex-1 bg-yellow-200 mt-2"></div>
              </div>
              
              <div class="space-y-2">
                <div>
                  <h4 class="font-bold text-gray-900">{{ visit.representative?.name || 'غير معروف' }}</h4>
                  <div class="text-xs text-gray-500 mt-0.5">{{ formatDate(visit.checkInTime) }}</div>
                </div>
                <div>
                  <span v-if="visit.notes" class="text-sm text-gray-700 block mt-2 bg-gray-50 p-2 rounded border">{{ visit.notes }}</span>
                </div>
              </div>
            </div>
            
            <div class="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 min-w-[120px]">
              <span class="badge" :class="{
                'bg-green-100 text-green-700': visit.status === 'checked-out',
                'bg-yellow-100 text-yellow-700': visit.status === 'checked-in',
                'bg-red-100 text-red-700': visit.status === 'cancelled',
              }">
                 {{ visit.status === 'checked-out' ? 'تم الخروج' :
                    visit.status === 'checked-in' ? 'تم الدخول' :
                    visit.status === 'cancelled' ? 'ملغاة' : visit.status }}
              </span>
              <span v-if="visit.checkOutTime" class="text-xs text-gray-500 font-mono">
                المدة: {{ getDuration(visit.checkInTime, visit.checkOutTime) }}
              </span>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>
