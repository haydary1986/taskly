<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'مركز الأمان' })

const api = useApi()

const loginLogs = ref<any[]>([])
const firewallRules = ref<any[]>([])
const loading = ref(true)
const activeTab = ref('logs')
const showAddRule = ref(false)

const ruleForm = reactive({ type: 'ip', value: '', action: 'block', description: '' })

onMounted(async () => {
  try {
    const [logsRes, rulesRes] = await Promise.all([
      api.get('/login-logs', { query: { sort: '-createdAt', limit: 100, depth: 1 } }),
      api.get('/firewall-rules', { query: { sort: '-createdAt', limit: 100 } }),
    ])
    loginLogs.value = logsRes.docs
    firewallRules.value = rulesRes.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
})

const logStats = computed(() => ({
  total: loginLogs.value.length,
  success: loginLogs.value.filter((l) => l.success).length,
  failed: loginLogs.value.filter((l) => !l.success).length,
  tor: loginLogs.value.filter((l) => l.isTor).length,
  vpn: loginLogs.value.filter((l) => l.isVPN).length,
}))

async function addRule() {
  try {
    const res = await api.post('/firewall-rules', ruleForm)
    firewallRules.value.unshift(res.doc)
    showAddRule.value = false
    Object.assign(ruleForm, { type: 'ip', value: '', action: 'block', description: '' })
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
}

async function deleteRule(id: string) {
  if (!confirm('حذف هذه القاعدة؟')) return
  await api.del(`/firewall-rules/${id}`)
  firewallRules.value = firewallRules.value.filter((r) => r.id !== id)
}

async function toggleRule(rule: any) {
  await api.patch(`/firewall-rules/${rule.id}`, { isActive: !rule.isActive })
  rule.isActive = !rule.isActive
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-gray-900">مركز الأمان</h1>

    <!-- Stats -->
    <div class="mb-6 grid gap-4 sm:grid-cols-5">
      <div class="card text-center"><p class="text-2xl font-bold">{{ logStats.total }}</p><p class="text-xs text-gray-500">إجمالي المحاولات</p></div>
      <div class="card text-center"><p class="text-2xl font-bold text-green-600">{{ logStats.success }}</p><p class="text-xs text-gray-500">ناجحة</p></div>
      <div class="card text-center"><p class="text-2xl font-bold text-red-600">{{ logStats.failed }}</p><p class="text-xs text-gray-500">فاشلة</p></div>
      <div class="card text-center"><p class="text-2xl font-bold text-orange-600">{{ logStats.tor }}</p><p class="text-xs text-gray-500">Tor</p></div>
      <div class="card text-center"><p class="text-2xl font-bold text-purple-600">{{ logStats.vpn }}</p><p class="text-xs text-gray-500">VPN</p></div>
    </div>

    <!-- Tabs -->
    <div class="mb-4 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      <button @click="activeTab = 'logs'" class="rounded-md px-4 py-2 text-sm font-medium" :class="activeTab === 'logs' ? 'bg-white shadow-sm' : 'text-gray-500'">سجل الدخول</button>
      <button @click="activeTab = 'firewall'" class="rounded-md px-4 py-2 text-sm font-medium" :class="activeTab === 'firewall' ? 'bg-white shadow-sm' : 'text-gray-500'">جدار الحماية</button>
    </div>

    <!-- Login Logs -->
    <div v-if="activeTab === 'logs'" class="card overflow-hidden !p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-sm">
          <thead class="border-b bg-gray-50">
            <tr>
              <th class="px-3 py-2 font-medium text-gray-600">المستخدم</th>
              <th class="px-3 py-2 font-medium text-gray-600">النتيجة</th>
              <th class="px-3 py-2 font-medium text-gray-600">IP</th>
              <th class="px-3 py-2 font-medium text-gray-600">تنبيهات</th>
              <th class="px-3 py-2 font-medium text-gray-600">الوقت</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading"><td colspan="5" class="px-3 py-8 text-center text-gray-400">جاري التحميل...</td></tr>
            <tr v-for="log in loginLogs" :key="log.id" class="hover:bg-gray-50">
              <td class="px-3 py-2">{{ log.user?.name || log.email }}</td>
              <td class="px-3 py-2"><span class="badge" :class="log.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'">{{ log.success ? 'ناجح' : 'فاشل' }}</span></td>
              <td class="px-3 py-2 font-mono text-xs" dir="ltr">{{ log.ip }}</td>
              <td class="px-3 py-2">
                <span v-if="log.isTor" class="badge bg-orange-100 text-orange-700 ml-1">Tor</span>
                <span v-if="log.isVPN" class="badge bg-purple-100 text-purple-700 ml-1">VPN</span>
                <span v-if="log.isProxy" class="badge bg-yellow-100 text-yellow-700 ml-1">Proxy</span>
              </td>
              <td class="px-3 py-2 text-xs text-gray-400">{{ new Date(log.createdAt).toLocaleString('ar-SA') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Firewall Rules -->
    <div v-else>
      <div class="mb-4 flex justify-end"><button @click="showAddRule = true" class="btn-primary text-sm">إضافة قاعدة</button></div>
      <div class="space-y-2">
        <div v-for="rule in firewallRules" :key="rule.id" class="card flex items-center justify-between !py-3">
          <div class="flex items-center gap-3">
            <span class="badge" :class="rule.action === 'block' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">{{ rule.action === 'block' ? 'حظر' : 'سماح' }}</span>
            <span class="font-mono text-sm" dir="ltr">{{ rule.value }}</span>
            <span class="text-xs text-gray-400">{{ rule.description }}</span>
          </div>
          <div class="flex items-center gap-2">
            <button @click="toggleRule(rule)" class="text-xs" :class="rule.isActive ? 'text-yellow-600' : 'text-green-600'">{{ rule.isActive ? 'تعطيل' : 'تفعيل' }}</button>
            <button @click="deleteRule(rule.id)" class="text-xs text-red-600">حذف</button>
          </div>
        </div>
        <p v-if="!firewallRules.length" class="card py-8 text-center text-gray-400">لا توجد قواعد</p>
      </div>

      <!-- Add Rule Modal -->
      <Teleport to="body">
        <div v-if="showAddRule" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showAddRule = false">
          <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 class="mb-4 text-lg font-bold">إضافة قاعدة حماية</h2>
            <form @submit.prevent="addRule" class="space-y-4">
              <div class="grid grid-cols-2 gap-3">
                <div><label class="label">النوع</label><select v-model="ruleForm.type" class="input"><option value="ip">عنوان IP</option><option value="ip-range">نطاق IP</option><option value="country">دولة</option></select></div>
                <div><label class="label">الإجراء</label><select v-model="ruleForm.action" class="input"><option value="block">حظر</option><option value="allow">سماح</option></select></div>
              </div>
              <div><label class="label">القيمة</label><input v-model="ruleForm.value" class="input" dir="ltr" required placeholder="192.168.1.1" /></div>
              <div><label class="label">الوصف</label><input v-model="ruleForm.description" class="input" /></div>
              <div class="flex justify-end gap-3"><button type="button" @click="showAddRule = false" class="btn-secondary">إلغاء</button><button type="submit" class="btn-primary">إضافة</button></div>
            </form>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>
