<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إعدادات النظام' })

const api = useApi()

const settings = ref<any>({})
const loading = ref(true)
const saving = ref(false)
const message = ref('')
const telegramTestResult = ref('')
const emailTestResult = ref('')
const telegramLinkedUsers = ref<any[]>([])

onMounted(async () => {
  try {
    const [settingsRes, usersRes] = await Promise.all([
      api.get('/globals/system-settings'),
      api.get('/telegram-users'),
    ])
    settings.value = settingsRes
    telegramLinkedUsers.value = usersRes.users || []
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

async function saveSettings() {
  saving.value = true; message.value = ''
  try {
    await api.post('/globals/system-settings', settings.value)
    message.value = 'تم حفظ الإعدادات بنجاح'
  } catch (err: any) { message.value = 'خطأ: ' + (err?.data?.errors?.[0]?.message || 'حدث خطأ') }
  finally { saving.value = false }
}

async function testTelegram() {
  telegramTestResult.value = 'جاري الإرسال...'
  try {
    const res = await api.post('/test-telegram', { message: 'رسالة تجريبية من Taskly! ✅' })
    telegramTestResult.value = res.message
  } catch (err: any) { telegramTestResult.value = err?.data?.error || 'فشل' }
}

async function testEmail() {
  emailTestResult.value = 'جاري الإرسال...'
  try {
    const res = await api.post('/test-email', {})
    emailTestResult.value = res.message
  } catch (err: any) { emailTestResult.value = err?.data?.error || 'فشل' }
}
</script>

<template>
  <div class="mx-auto max-w-2xl">
    <h1 class="mb-6 text-2xl font-bold text-gray-900">إعدادات النظام</h1>

    <div v-if="loading" class="card animate-pulse"><div class="h-48 rounded bg-gray-200" /></div>

    <div v-else class="space-y-6">
      <!-- Telegram -->
      <div class="card">
        <h3 class="mb-4 text-lg font-semibold">إعدادات تيليجرام</h3>
        <div class="space-y-4">
          <div><label class="label">رمز البوت (Token)</label><input v-model="settings.telegramBotToken" class="input" dir="ltr" placeholder="123456:ABC-DEF..." /></div>
          <div><label class="label">اسم مستخدم البوت (بدون @)</label><input v-model="settings.telegramBotUsername" class="input" dir="ltr" placeholder="TasklyBot" /><p class="mt-1 text-xs text-gray-400">يُستخدم لتوليد رابط ربط الحسابات تلقائياً</p></div>
          <label class="flex items-center gap-2 text-sm"><input type="checkbox" v-model="settings.telegramEnabled" /> تفعيل إشعارات تيليجرام</label>
          <div class="flex items-center gap-3">
            <button @click="testTelegram" class="btn-secondary text-sm">إرسال رسالة تجريبية</button>
            <span v-if="telegramTestResult" class="text-sm" :class="telegramTestResult.includes('نجاح') ? 'text-green-600' : 'text-red-600'">{{ telegramTestResult }}</span>
          </div>
          <div v-if="telegramLinkedUsers.length">
            <p class="text-sm font-medium text-gray-700 mb-2">المستخدمون المرتبطون ({{ telegramLinkedUsers.length }})</p>
            <div class="space-y-1">
              <div v-for="u in telegramLinkedUsers" :key="u.id" class="flex items-center justify-between rounded bg-gray-50 px-3 py-1.5 text-sm">
                <span>{{ u.name }} ({{ u.role }})</span>
                <span class="font-mono text-xs text-gray-400" dir="ltr">{{ u.telegramChatId }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Email -->
      <div class="card">
        <h3 class="mb-4 text-lg font-semibold">إعدادات البريد الإلكتروني (SMTP)</h3>
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

      <!-- App settings -->
      <div class="card">
        <h3 class="mb-4 text-lg font-semibold">إعدادات التطبيق</h3>
        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-3">
            <div><label class="label">اسم التطبيق</label><input v-model="settings.appName" class="input" /></div>
            <div><label class="label">اسم الشركة</label><input v-model="settings.companyName" class="input" /></div>
          </div>
        </div>
      </div>

      <!-- Save -->
      <div class="flex items-center gap-3">
        <button @click="saveSettings" :disabled="saving" class="btn-primary">{{ saving ? 'جاري الحفظ...' : 'حفظ الإعدادات' }}</button>
        <span v-if="message" class="text-sm" :class="message.includes('خطأ') ? 'text-red-600' : 'text-green-600'">{{ message }}</span>
      </div>
    </div>
  </div>
</template>
