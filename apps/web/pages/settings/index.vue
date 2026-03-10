<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إعدادات النظام' })

const api = useApi()
const toast = useToast()
const brandingStore = useBrandingStore()
const config = useRuntimeConfig()

const settings = ref<any>({})
const loading = ref(true)
const saving = ref(false)
const telegramTestResult = ref('')
const emailTestResult = ref('')
const telegramLinkedUsers = ref<any[]>([])
const activeTab = ref('branding')

// Logo/image upload
const uploadingField = ref('')

onMounted(async () => {
  try {
    const [settingsRes, usersRes] = await Promise.all([
      api.get('/globals/system-settings'),
      api.get('/v1/system/telegram-users'),
    ])
    settings.value = settingsRes
    telegramLinkedUsers.value = usersRes.users || []
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

async function saveSettings() {
  saving.value = true
  try {
    const { id, globalType, createdAt, updatedAt, ...data } = settings.value
    // Convert media objects to IDs for relationships
    for (const field of ['appLogo', 'appIcon', 'appFavicon', 'loginBackground']) {
      if (data[field] && typeof data[field] === 'object') {
        data[field] = data[field].id
      }
    }
    await api.post('/globals/system-settings', data)
    toast.success('تم حفظ الإعدادات بنجاح')
    // Reload branding
    brandingStore.loaded = false
    await brandingStore.fetch()
  } catch (err: any) {
    toast.error('خطأ: ' + (err?.data?.errors?.[0]?.message || 'حدث خطأ'))
  }
  finally { saving.value = false }
}

async function uploadImage(event: Event, fieldName: string) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploadingField.value = fieldName
  try {
    const res = await api.upload(file, fieldName)
    settings.value[fieldName] = res.doc
    toast.success('تم رفع الصورة')
  } catch (err: any) {
    toast.error('فشل رفع الصورة')
  } finally {
    uploadingField.value = ''
  }
}

function removeImage(fieldName: string) {
  settings.value[fieldName] = null
}

function getMediaUrl(media: any): string {
  if (!media) return ''
  if (typeof media === 'string') return media
  const url = media.url || ''
  if (url.startsWith('http')) return url
  return `${config.public.apiBase}${url}`
}

// Color presets
const colorPresets = [
  { name: 'أزرق', primary: '#2563eb', accent: '#16a34a' },
  { name: 'بنفسجي', primary: '#7c3aed', accent: '#0891b2' },
  { name: 'أحمر', primary: '#dc2626', accent: '#2563eb' },
  { name: 'أخضر', primary: '#16a34a', accent: '#2563eb' },
  { name: 'برتقالي', primary: '#ea580c', accent: '#16a34a' },
  { name: 'وردي', primary: '#db2777', accent: '#7c3aed' },
  { name: 'سماوي', primary: '#0891b2', accent: '#16a34a' },
  { name: 'كهرماني', primary: '#d97706', accent: '#2563eb' },
]

function applyPreset(preset: typeof colorPresets[0]) {
  settings.value.primaryColor = preset.primary
  settings.value.accentColor = preset.accent
}

async function testTelegram() {
  telegramTestResult.value = 'جاري الإرسال...'
  try {
    const { id, globalType, createdAt, updatedAt, ...data } = settings.value
    await api.post('/globals/system-settings', data)
    const res = await api.post('/v1/system/test-telegram', { message: 'رسالة تجريبية من Taskly! ✅' })
    telegramTestResult.value = res.message || 'تم الإرسال بنجاح'
    toast.success('تم إرسال الرسالة التجريبية')
  } catch (err: any) {
    telegramTestResult.value = err?.data?.error || 'فشل الإرسال'
    toast.error('فشل إرسال الرسالة التجريبية: ' + (err?.data?.error || ''))
  }
}

async function testEmail() {
  emailTestResult.value = 'جاري الإرسال...'
  try {
    const res = await api.post('/v1/system/test-email', {})
    emailTestResult.value = res.message || 'تم الإرسال'
    toast.success('تم إرسال البريد التجريبي')
  } catch (err: any) {
    emailTestResult.value = err?.data?.error || 'فشل'
    toast.error('فشل إرسال البريد: ' + (err?.data?.error || ''))
  }
}

const tabs = [
  { key: 'branding', label: 'الهوية البصرية', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
  { key: 'telegram', label: 'تيليجرام', icon: 'M12 19l9 2-9-18-9 18 9-2zm0 0v-8' },
  { key: 'email', label: 'البريد', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
]
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-white">إعدادات النظام</h1>

    <div v-if="loading" class="card animate-pulse"><div class="h-48 rounded bg-gray-200" /></div>

    <div v-else class="space-y-6">
      <!-- Tabs -->
      <div class="flex gap-1 rounded-xl bg-gray-100 dark:bg-gray-800 p-1">
        <button
          v-for="tab in tabs" :key="tab.key"
          @click="activeTab = tab.key"
          class="flex items-center gap-2 flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
          :class="activeTab === tab.key ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" :d="tab.icon" />
          </svg>
          {{ tab.label }}
        </button>
      </div>

      <!-- Branding Tab -->
      <div v-if="activeTab === 'branding'" class="space-y-6">
        <!-- App Name & Company -->
        <div class="card">
          <h3 class="mb-4 text-lg font-semibold dark:text-white">اسم التطبيق</h3>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">اسم التطبيق</label><input v-model="settings.appName" class="input" placeholder="Taskly" /></div>
            <div><label class="label">اسم الشركة</label><input v-model="settings.companyName" class="input" placeholder="ALGO-NEST" /></div>
          </div>
        </div>

        <!-- Logo & Icons -->
        <div class="card">
          <h3 class="mb-4 text-lg font-semibold dark:text-white">الشعار والأيقونات</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- App Logo -->
            <div>
              <label class="label">شعار التطبيق</label>
              <div class="relative rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center min-h-[120px] flex items-center justify-center">
                <div v-if="settings.appLogo" class="relative">
                  <img :src="getMediaUrl(settings.appLogo)" class="max-h-16 w-auto mx-auto" alt="Logo" />
                  <button @click="removeImage('appLogo')" class="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                </div>
                <div v-else>
                  <label class="cursor-pointer">
                    <div class="text-gray-400 text-xs mb-1">PNG شفاف</div>
                    <span class="text-primary-600 text-sm hover:underline">{{ uploadingField === 'appLogo' ? 'جاري الرفع...' : 'رفع شعار' }}</span>
                    <input type="file" accept="image/*" class="hidden" @change="uploadImage($event, 'appLogo')" :disabled="!!uploadingField" />
                  </label>
                </div>
              </div>
            </div>

            <!-- App Icon -->
            <div>
              <label class="label">أيقونة PWA</label>
              <div class="relative rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center min-h-[120px] flex items-center justify-center">
                <div v-if="settings.appIcon" class="relative">
                  <img :src="getMediaUrl(settings.appIcon)" class="h-16 w-16 rounded-xl mx-auto object-cover" alt="Icon" />
                  <button @click="removeImage('appIcon')" class="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                </div>
                <div v-else>
                  <label class="cursor-pointer">
                    <div class="text-gray-400 text-xs mb-1">مربع 192x192</div>
                    <span class="text-primary-600 text-sm hover:underline">{{ uploadingField === 'appIcon' ? 'جاري الرفع...' : 'رفع أيقونة' }}</span>
                    <input type="file" accept="image/*" class="hidden" @change="uploadImage($event, 'appIcon')" :disabled="!!uploadingField" />
                  </label>
                </div>
              </div>
            </div>

            <!-- Favicon -->
            <div>
              <label class="label">Favicon</label>
              <div class="relative rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center min-h-[120px] flex items-center justify-center">
                <div v-if="settings.appFavicon" class="relative">
                  <img :src="getMediaUrl(settings.appFavicon)" class="h-10 w-10 mx-auto" alt="Favicon" />
                  <button @click="removeImage('appFavicon')" class="absolute -top-2 -left-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">✕</button>
                </div>
                <div v-else>
                  <label class="cursor-pointer">
                    <div class="text-gray-400 text-xs mb-1">32x32 أو SVG</div>
                    <span class="text-primary-600 text-sm hover:underline">{{ uploadingField === 'appFavicon' ? 'جاري الرفع...' : 'رفع Favicon' }}</span>
                    <input type="file" accept="image/*" class="hidden" @change="uploadImage($event, 'appFavicon')" :disabled="!!uploadingField" />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Colors -->
        <div class="card">
          <h3 class="mb-4 text-lg font-semibold dark:text-white">الألوان</h3>

          <!-- Presets -->
          <div class="mb-4">
            <label class="label mb-2">ألوان جاهزة</label>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="preset in colorPresets" :key="preset.name"
                @click="applyPreset(preset)"
                class="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs hover:border-primary-300 transition-colors"
                :class="settings.primaryColor === preset.primary ? 'ring-2 ring-primary-500 border-primary-500' : ''"
              >
                <span class="h-4 w-4 rounded-full border" :style="{ backgroundColor: preset.primary }" />
                <span class="h-4 w-4 rounded-full border" :style="{ backgroundColor: preset.accent }" />
                <span class="text-gray-600 dark:text-gray-300">{{ preset.name }}</span>
              </button>
            </div>
          </div>

          <!-- Custom Colors -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="label">اللون الأساسي</label>
              <div class="flex items-center gap-2">
                <input type="color" v-model="settings.primaryColor" class="h-10 w-14 rounded-lg border border-gray-300 cursor-pointer" />
                <input v-model="settings.primaryColor" class="input flex-1" dir="ltr" placeholder="#2563eb" />
              </div>
              <div class="mt-2 flex gap-1">
                <div v-for="shade in [100, 300, 500, 600, 700, 900]" :key="shade" class="h-6 flex-1 rounded" :class="`bg-primary-${shade}`" />
              </div>
            </div>
            <div>
              <label class="label">اللون الثانوي</label>
              <div class="flex items-center gap-2">
                <input type="color" v-model="settings.accentColor" class="h-10 w-14 rounded-lg border border-gray-300 cursor-pointer" />
                <input v-model="settings.accentColor" class="input flex-1" dir="ltr" placeholder="#16a34a" />
              </div>
              <div class="mt-2 flex gap-1">
                <div v-for="shade in [100, 300, 500, 600, 700, 900]" :key="shade" class="h-6 flex-1 rounded" :class="`bg-accent-${shade}`" />
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar Style -->
        <div class="card">
          <h3 class="mb-4 text-lg font-semibold dark:text-white">مظهر الشريط الجانبي</h3>
          <div class="grid grid-cols-3 gap-3">
            <label
              v-for="opt in [{ value: 'white', label: 'أبيض', bg: 'bg-white border-gray-200' }, { value: 'dark', label: 'داكن', bg: 'bg-gray-900 border-gray-700' }, { value: 'primary', label: 'اللون الأساسي', bg: 'bg-primary-700 border-primary-600' }]"
              :key="opt.value"
              class="cursor-pointer rounded-xl border-2 p-3 text-center transition-all"
              :class="settings.sidebarColor === opt.value ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
            >
              <input type="radio" v-model="settings.sidebarColor" :value="opt.value" class="hidden" />
              <div class="mx-auto mb-2 h-16 w-8 rounded-lg border" :class="opt.bg" />
              <span class="text-xs text-gray-600 dark:text-gray-300">{{ opt.label }}</span>
            </label>
          </div>
        </div>

        <!-- Login Background -->
        <div class="card">
          <h3 class="mb-4 text-lg font-semibold dark:text-white">خلفية صفحة تسجيل الدخول</h3>
          <div class="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 p-4 text-center min-h-[140px] flex items-center justify-center">
            <div v-if="settings.loginBackground" class="relative w-full">
              <img :src="getMediaUrl(settings.loginBackground)" class="max-h-32 w-auto mx-auto rounded-lg object-cover" alt="Login BG" />
              <button @click="removeImage('loginBackground')" class="absolute top-0 left-0 h-6 w-6 rounded-full bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600">✕</button>
            </div>
            <div v-else>
              <label class="cursor-pointer">
                <svg class="h-8 w-8 mx-auto text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <span class="text-primary-600 text-sm hover:underline">{{ uploadingField === 'loginBackground' ? 'جاري الرفع...' : 'رفع صورة خلفية' }}</span>
                <input type="file" accept="image/*" class="hidden" @change="uploadImage($event, 'loginBackground')" :disabled="!!uploadingField" />
              </label>
            </div>
          </div>
        </div>
      </div>

      <!-- Telegram Tab -->
      <div v-if="activeTab === 'telegram'" class="card">
        <h3 class="mb-4 text-lg font-semibold dark:text-white">إعدادات تيليجرام</h3>
        <div class="space-y-4">
          <div><label class="label">رمز البوت (Token)</label><input v-model="settings.telegramBotToken" class="input" dir="ltr" placeholder="123456:ABC-DEF..." /></div>
          <div><label class="label">اسم مستخدم البوت (بدون @)</label><input v-model="settings.telegramBotUsername" class="input" dir="ltr" placeholder="TasklyBot" /><p class="mt-1 text-xs text-gray-400">يُستخدم لتوليد رابط ربط الحسابات تلقائياً</p></div>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="settings.telegramEnabled" /> تفعيل إشعارات تيليجرام</label>
          <div class="flex items-center gap-3">
            <button @click="testTelegram" class="btn-secondary text-sm">إرسال رسالة تجريبية</button>
            <span v-if="telegramTestResult" class="text-sm" :class="telegramTestResult.includes('نجاح') ? 'text-green-600' : 'text-red-600'">{{ telegramTestResult }}</span>
          </div>
          <div v-if="telegramLinkedUsers.length">
            <p class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">المستخدمون المرتبطون ({{ telegramLinkedUsers.length }})</p>
            <div class="space-y-1">
              <div v-for="u in telegramLinkedUsers" :key="u.id" class="flex items-center justify-between rounded bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm">
                <span>{{ u.name }} ({{ u.role }})</span>
                <span class="font-mono text-xs text-gray-400" dir="ltr">{{ u.telegramChatId }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Email Tab -->
      <div v-if="activeTab === 'email'" class="card">
        <h3 class="mb-4 text-lg font-semibold dark:text-white">إعدادات البريد الإلكتروني (SMTP)</h3>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">خادم SMTP</label><input v-model="settings.smtpHost" class="input" dir="ltr" placeholder="smtp.gmail.com" /></div>
            <div><label class="label">المنفذ</label><input v-model.number="settings.smtpPort" type="number" class="input" dir="ltr" /></div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">اسم المستخدم</label><input v-model="settings.smtpUser" class="input" dir="ltr" /></div>
            <div><label class="label">كلمة المرور</label><input v-model="settings.smtpPass" type="password" class="input" dir="ltr" /></div>
          </div>
          <div><label class="label">عنوان المرسل</label><input v-model="settings.smtpFrom" class="input" dir="ltr" /></div>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="settings.emailEnabled" /> تفعيل إشعارات البريد</label>
          <div class="flex items-center gap-3">
            <button @click="testEmail" class="btn-secondary text-sm">إرسال بريد تجريبي</button>
            <span v-if="emailTestResult" class="text-sm" :class="emailTestResult.includes('تم') ? 'text-green-600' : 'text-red-600'">{{ emailTestResult }}</span>
          </div>
        </div>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-3">
        <button @click="saveSettings" :disabled="saving" class="btn-primary">{{ saving ? 'جاري الحفظ...' : 'حفظ الإعدادات' }}</button>
      </div>
    </div>
  </div>
</template>
