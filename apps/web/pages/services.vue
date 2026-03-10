<script setup lang="ts">
definePageMeta({ layout: 'public' })

// SEO Meta Tags
useHead({
  title: 'Taskly — خدمات إدارة الأعمال | ALGO-NEST',
  meta: [
    { name: 'description', content: 'نظام Taskly المتكامل لإدارة الأعمال وعلاقات العملاء CRM. إدارة المهام، المبيعات، الصفقات، وفريق العمل في منصة واحدة.' },
    { name: 'keywords', content: 'CRM, إدارة الأعمال, إدارة المبيعات, نظام إدارة العملاء, Taskly, ALGO-NEST, برمجة, تصميم, تسويق رقمي' },
    { name: 'author', content: 'ALGO-NEST' },
    // Open Graph
    { property: 'og:title', content: 'Taskly — خدمات إدارة الأعمال | ALGO-NEST' },
    { property: 'og:description', content: 'نظام متكامل لإدارة الأعمال وعلاقات العملاء. إدارة المهام، المبيعات، والفريق في منصة واحدة.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:locale', content: 'ar_IQ' },
    { property: 'og:site_name', content: 'Taskly — ALGO-NEST' },
    // Twitter Card
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Taskly — خدمات إدارة الأعمال' },
    { name: 'twitter:description', content: 'نظام متكامل لإدارة الأعمال وعلاقات العملاء CRM' },
    // Robots
    { name: 'robots', content: 'index, follow' },
  ],
  link: [
    { rel: 'canonical', href: 'https://task.algonest.tech/services' },
  ],
  script: [
    // JSON-LD Structured Data
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'ALGO-NEST',
        url: 'https://task.algonest.tech',
        description: 'شركة متخصصة في تطوير البرمجيات وحلول إدارة الأعمال',
        address: { '@type': 'PostalAddress', addressLocality: 'بغداد', addressCountry: 'IQ' },
        contactPoint: { '@type': 'ContactPoint', contactType: 'sales', availableLanguage: ['ar', 'en'] },
      }),
    },
    {
      type: 'application/ld+json',
      innerHTML: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'خدمات Taskly',
        description: 'نظام متكامل لإدارة الأعمال وعلاقات العملاء',
        provider: { '@type': 'Organization', name: 'ALGO-NEST' },
      }),
    },
  ],
})

const config = useRuntimeConfig()
const apiBase = config.public.apiBase || 'https://api-task.algonest.tech'

const services = ref<any[]>([])
const loading = ref(true)
const showRequestModal = ref(false)
const submitting = ref(false)
const submitSuccess = ref(false)
const submitError = ref('')
const selectedService = ref<any>(null)

const form = reactive({
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  serviceName: '',
  message: '',
  budget: '',
})

const budgetLabels: Record<string, string> = {
  'under-1k': 'أقل من $1,000',
  '1k-5k': '$1,000 - $5,000',
  '5k-15k': '$5,000 - $15,000',
  '15k-50k': '$15,000 - $50,000',
  'over-50k': 'أكثر من $50,000',
}

const features = [
  { icon: '📊', title: 'إدارة المبيعات CRM', desc: 'أنبوب مبيعات متكامل مع تتبع الصفقات والعملاء المحتملين وعروض الأسعار' },
  { icon: '📋', title: 'إدارة المهام والمشاريع', desc: 'تنظيم المهام بنظام Kanban مع تتبع الوقت والتبعيات والأولويات' },
  { icon: '📍', title: 'تتبع الزيارات الميدانية', desc: 'نظام GPS لتسجيل الحضور والتحقق من المواقع وتقارير المسار اليومي' },
  { icon: '💬', title: 'التواصل الفوري', desc: 'دردشة جماعية فورية مع إشعارات متعددة القنوات ومشاركة الملفات' },
  { icon: '📱', title: 'تطبيق ويب متكامل PWA', desc: 'يعمل على الجوال والحاسوب مع دعم العمل بدون إنترنت' },
  { icon: '🔒', title: 'أمان متقدم', desc: 'مصادقة ثنائية، جدار حماية، تسجيل دخول سحري، وسجل تدقيق شامل' },
]

const stats = [
  { value: '99.9%', label: 'وقت التشغيل' },
  { value: '+50', label: 'شركة تستخدم النظام' },
  { value: '24/7', label: 'دعم فني' },
  { value: '7', label: 'أدوار مختلفة' },
]

onMounted(async () => {
  try {
    const res = await $fetch<any>(`${apiBase}/api/v1/public/services`)
    services.value = res.services || []
  } catch (err) {
    console.error('Failed to load services:', err)
  } finally {
    loading.value = false
  }
})

function openRequestModal(service?: any) {
  selectedService.value = service || null
  Object.assign(form, { companyName: '', contactName: '', email: '', phone: '', serviceName: service?.name || '', message: '', budget: '' })
  submitSuccess.value = false
  submitError.value = ''
  showRequestModal.value = true
}

async function handleSubmit() {
  submitting.value = true
  submitError.value = ''
  try {
    const res = await $fetch<any>(`${apiBase}/api/v1/public/request-service`, {
      method: 'POST',
      body: {
        ...form,
        service: selectedService.value?.id || undefined,
        serviceName: form.serviceName || selectedService.value?.name || undefined,
        budget: form.budget || undefined,
      },
    })
    submitSuccess.value = true
  } catch (err: any) {
    submitError.value = err?.data?.error || 'حدث خطأ. حاول مرة أخرى.'
  } finally {
    submitting.value = false
  }
}

function formatPrice(price: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(price)
}
</script>

<template>
  <div>
    <!-- Hero Section -->
    <section class="relative overflow-hidden bg-gradient-to-bl from-primary-600 via-primary-700 to-primary-900 py-20 sm:py-32">
      <div class="absolute inset-0 opacity-10">
        <div class="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-white blur-3xl" />
        <div class="absolute right-1/4 bottom-1/4 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>
      <div class="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
        <h1 class="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
          نظام متكامل لإدارة
          <span class="text-primary-200">أعمالك</span>
        </h1>
        <p class="mx-auto max-w-2xl text-lg sm:text-xl text-primary-100 mb-8">
          من إدارة المبيعات والعملاء إلى تتبع المهام والزيارات الميدانية — كل ما تحتاجه لتنمية أعمالك في منصة واحدة
        </p>
        <div class="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="#services" class="w-full sm:w-auto rounded-xl bg-white px-8 py-3.5 text-lg font-bold text-primary-700 hover:bg-primary-50 transition-colors shadow-lg">
            استعرض خدماتنا
          </a>
          <a href="#contact" class="w-full sm:w-auto rounded-xl border-2 border-white/30 px-8 py-3.5 text-lg font-medium text-white hover:bg-white/10 transition-colors">
            تواصل معنا
          </a>
        </div>
      </div>
    </section>

    <!-- Stats -->
    <section class="bg-white dark:bg-gray-950 py-12 border-b border-gray-100 dark:border-gray-800">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div v-for="stat in stats" :key="stat.label" class="text-center">
            <p class="text-3xl font-bold text-primary-600">{{ stat.value }}</p>
            <p class="text-sm text-gray-500 mt-1">{{ stat.label }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section id="why-us" class="bg-gray-50 dark:bg-gray-900 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">لماذا تختار Taskly؟</h2>
          <p class="text-gray-500 max-w-2xl mx-auto">نظام شامل يجمع كل أدوات إدارة الأعمال التي تحتاجها في مكان واحد</p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="feature in features" :key="feature.title"
            class="rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:border-primary-200 transition-all">
            <div class="text-4xl mb-4">{{ feature.icon }}</div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2">{{ feature.title }}</h3>
            <p class="text-sm text-gray-500 leading-relaxed">{{ feature.desc }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Services/Products Section -->
    <section id="services" class="bg-white dark:bg-gray-950 py-20">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div class="text-center mb-12">
          <h2 class="text-3xl font-bold text-gray-900 dark:text-white mb-4">خدماتنا ومنتجاتنا</h2>
          <p class="text-gray-500 max-w-2xl mx-auto">اختر الخدمة المناسبة لاحتياجات عملك</p>
        </div>

        <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div v-for="i in 6" :key="i" class="rounded-2xl border border-gray-100 p-6 animate-pulse">
            <div class="h-6 bg-gray-200 rounded w-3/4 mb-4" />
            <div class="h-4 bg-gray-200 rounded w-full mb-2" />
            <div class="h-4 bg-gray-200 rounded w-2/3 mb-6" />
            <div class="h-10 bg-gray-200 rounded" />
          </div>
        </div>

        <div v-else-if="services.length" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <article v-for="service in services" :key="service.id"
            class="group rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 hover:shadow-xl hover:border-primary-200 transition-all">
            <div class="flex items-start justify-between mb-4">
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ service.name }}</h3>
                <span class="text-xs px-2 py-0.5 rounded-full mt-1 inline-block"
                  :class="service.type === 'product' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'">
                  {{ service.type === 'product' ? 'منتج' : 'خدمة' }}
                </span>
              </div>
              <div v-if="service.price" class="text-left">
                <p class="text-2xl font-bold text-primary-600">{{ formatPrice(service.price, service.currency) }}</p>
              </div>
            </div>
            <p v-if="service.category" class="text-xs text-gray-400 mb-3">الفئة: {{ service.category }}</p>
            <button @click="openRequestModal(service)"
              class="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition-colors group-hover:shadow-lg">
              اطلب هذه الخدمة
            </button>
          </article>
        </div>

        <div v-else class="text-center py-16">
          <p class="text-gray-400 text-lg mb-4">سيتم إضافة الخدمات قريباً</p>
          <button @click="openRequestModal()" class="btn-primary text-lg px-8 py-3">تواصل معنا للاستفسار</button>
        </div>
      </div>
    </section>

    <!-- Contact / CTA Section -->
    <section id="contact" class="bg-gradient-to-br from-primary-600 to-primary-800 py-20">
      <div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
        <h2 class="text-3xl font-bold text-white mb-4">مستعد لتطوير أعمالك؟</h2>
        <p class="text-primary-100 mb-8 text-lg">أرسل لنا طلبك وسيتواصل فريقنا معك خلال 24 ساعة</p>
        <button @click="openRequestModal()"
          class="rounded-xl bg-white px-10 py-4 text-lg font-bold text-primary-700 hover:bg-primary-50 transition-colors shadow-xl">
          أرسل طلبك الآن
        </button>
      </div>
    </section>

    <!-- Request Modal -->
    <Teleport to="body">
      <div v-if="showRequestModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" @click.self="showRequestModal = false">
        <div class="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
          <!-- Success State -->
          <div v-if="submitSuccess" class="text-center py-8">
            <div class="mx-auto w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg class="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" /></svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح!</h3>
            <p class="text-gray-500 mb-6">سيتواصل معك فريقنا خلال 24 ساعة عبر البريد الإلكتروني أو الهاتف.</p>
            <button @click="showRequestModal = false" class="btn-primary">حسناً</button>
          </div>

          <!-- Form State -->
          <div v-else>
            <div class="flex items-center justify-between mb-6">
              <h2 class="text-xl font-bold text-gray-900">طلب خدمة</h2>
              <button @click="showRequestModal = false" class="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>

            <div v-if="selectedService" class="mb-4 p-3 rounded-lg bg-primary-50 border border-primary-100">
              <p class="text-sm font-medium text-primary-700">{{ selectedService.name }}</p>
              <p v-if="selectedService.price" class="text-xs text-primary-500">{{ formatPrice(selectedService.price, selectedService.currency) }}</p>
            </div>

            <form @submit.prevent="handleSubmit" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">اسم الشركة *</label>
                <input v-model="form.companyName" class="input" required placeholder="مثال: شركة الأمل للتجارة" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">اسم المسؤول *</label>
                <input v-model="form.contactName" class="input" required placeholder="الاسم الكامل" />
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني *</label>
                  <input v-model="form.email" type="email" class="input" dir="ltr" required placeholder="email@company.com" />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
                  <input v-model="form.phone" class="input" dir="ltr" required placeholder="+964 7XX XXX XXXX" />
                </div>
              </div>
              <div v-if="!selectedService">
                <label class="block text-sm font-medium text-gray-700 mb-1">الخدمة المطلوبة</label>
                <input v-model="form.serviceName" class="input" placeholder="وصف الخدمة التي تحتاجها" />
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">الميزانية التقديرية</label>
                <select v-model="form.budget" class="input">
                  <option value="">غير محدد</option>
                  <option v-for="(label, key) in budgetLabels" :key="key" :value="key">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">تفاصيل إضافية</label>
                <textarea v-model="form.message" class="input" rows="3" placeholder="اشرح لنا ما تحتاجه بالتفصيل..." />
              </div>

              <p v-if="submitError" class="text-sm text-red-600 bg-red-50 rounded-lg p-2">{{ submitError }}</p>

              <div class="flex justify-end gap-3 pt-2 border-t">
                <button type="button" @click="showRequestModal = false" class="btn-secondary">إلغاء</button>
                <button type="submit" :disabled="submitting"
                  class="rounded-lg bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {{ submitting ? 'جاري الإرسال...' : 'إرسال الطلب' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
