<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'إدارة المستخدمين' })

const authStore = useAuthStore()
const api = useApi()

const users = ref<any[]>([])
const loading = ref(true)
const showModal = ref(false)
const editingUser = ref<any>(null)
const saving = ref(false)
const successMsg = ref('')

const roleLabels: Record<string, string> = {
  'super-admin': 'مدير عام',
  supervisor: 'مشرف',
  auditor: 'مراقب',
  'sales-rep': 'مندوب مبيعات',
  programmer: 'مبرمج',
  designer: 'مصمم',
  'social-media-manager': 'مسؤول سوشيال ميديا',
}

const roleColors: Record<string, string> = {
  'super-admin': 'bg-red-100 text-red-700',
  supervisor: 'bg-orange-100 text-orange-700',
  auditor: 'bg-yellow-100 text-yellow-700',
  'sales-rep': 'bg-green-100 text-green-700',
  programmer: 'bg-blue-100 text-blue-700',
  designer: 'bg-purple-100 text-purple-700',
  'social-media-manager': 'bg-pink-100 text-pink-700',
}

const userForm = reactive({
  name: '',
  email: '',
  password: '',
  role: 'sales-rep',
  phone: '',
  isActive: true,
})

onMounted(fetchUsers)

async function fetchUsers() {
  loading.value = true
  try {
    const res = await api.get('/users', { query: { limit: 100, sort: '-createdAt' } })
    users.value = res.docs
  } catch (err) { console.error(err) }
  finally { loading.value = false }
}

function openCreate() {
  editingUser.value = null
  Object.assign(userForm, { name: '', email: '', password: '', role: 'sales-rep', phone: '', isActive: true })
  showModal.value = true
}

function openEdit(user: any) {
  editingUser.value = user
  Object.assign(userForm, {
    name: user.name || '',
    email: user.email || '',
    password: '',
    role: user.role || 'sales-rep',
    phone: user.phone || '',
    isActive: user.isActive !== false,
  })
  showModal.value = true
}

async function handleSubmit() {
  saving.value = true
  try {
    if (editingUser.value) {
      // Update existing user
      const data: Record<string, any> = {
        name: userForm.name,
        email: userForm.email,
        role: userForm.role,
        phone: userForm.phone || undefined,
        isActive: userForm.isActive,
      }
      // Only include password if changed
      if (userForm.password.trim()) data.password = userForm.password

      await api.patch(`/users/${editingUser.value.id}`, data)
      successMsg.value = 'تم تحديث المستخدم بنجاح'
    } else {
      // Create new user
      await api.post('/users', {
        name: userForm.name,
        email: userForm.email,
        password: userForm.password,
        role: userForm.role,
        phone: userForm.phone || undefined,
      })
      successMsg.value = 'تم إنشاء المستخدم بنجاح'
    }
    showModal.value = false
    fetchUsers()
    setTimeout(() => { successMsg.value = '' }, 3000)
  } catch (err: any) {
    alert(err?.data?.errors?.[0]?.message || 'حدث خطأ')
  } finally { saving.value = false }
}

async function toggleActive(user: any) {
  try {
    await api.patch(`/users/${user.id}`, { isActive: !user.isActive })
    user.isActive = !user.isActive
  } catch (err: any) {
    alert(err?.data?.errors?.[0]?.message || 'حدث خطأ')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
        <p class="text-sm text-gray-500 mt-1">{{ users.length }} مستخدم مسجل</p>
      </div>
      <button v-if="authStore.isAdmin" @click="openCreate" class="btn-primary">
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
        مستخدم جديد
      </button>
    </div>

    <!-- Success message -->
    <div v-if="successMsg" class="card mb-4 !py-3 border-green-200 bg-green-50">
      <p class="text-sm font-medium text-green-700">{{ successMsg }}</p>
    </div>

    <!-- Users table -->
    <div class="card overflow-hidden !p-0">
      <div class="overflow-x-auto">
        <table class="w-full text-right text-sm">
          <thead class="border-b border-gray-200 bg-gray-50">
            <tr>
              <th class="px-4 py-3 font-medium text-gray-600">المستخدم</th>
              <th class="px-4 py-3 font-medium text-gray-600">البريد</th>
              <th class="px-4 py-3 font-medium text-gray-600">الهاتف</th>
              <th class="px-4 py-3 font-medium text-gray-600">الدور</th>
              <th class="px-4 py-3 font-medium text-gray-600">الحالة</th>
              <th class="px-4 py-3 font-medium text-gray-600">إجراءات</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100">
            <tr v-if="loading">
              <td colspan="6" class="px-4 py-8 text-center text-gray-400">جاري التحميل...</td>
            </tr>
            <tr v-else-if="!users.length">
              <td colspan="6" class="px-4 py-8 text-center text-gray-400">لا يوجد مستخدمين</td>
            </tr>
            <tr v-for="user in users" :key="user.id" class="hover:bg-gray-50 transition-colors">
              <td class="px-4 py-3">
                <div class="flex items-center gap-3">
                  <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
                    {{ user.name?.charAt(0) }}
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{{ user.name }}</p>
                    <p v-if="user.telegramChatId" class="text-[10px] text-blue-500">تيليجرام مرتبط</p>
                  </div>
                </div>
              </td>
              <td class="px-4 py-3 text-gray-500 text-xs" dir="ltr">{{ user.email }}</td>
              <td class="px-4 py-3 text-gray-500 text-xs" dir="ltr">{{ user.phone || '—' }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium" :class="roleColors[user.role] || 'bg-gray-100 text-gray-700'">
                  {{ roleLabels[user.role] || user.role }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex items-center gap-1 text-xs" :class="user.isActive ? 'text-green-600' : 'text-red-500'">
                  <span class="h-1.5 w-1.5 rounded-full" :class="user.isActive ? 'bg-green-500' : 'bg-red-400'" />
                  {{ user.isActive ? 'نشط' : 'معطل' }}
                </span>
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center gap-2">
                  <button
                    v-if="authStore.isManagement"
                    @click="openEdit(user)"
                    class="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-primary-600 transition-colors"
                    title="تعديل"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button
                    v-if="authStore.isManagement && user.id !== authStore.user?.id"
                    @click="toggleActive(user)"
                    class="rounded-lg p-1.5 transition-colors"
                    :class="user.isActive ? 'text-gray-400 hover:bg-red-50 hover:text-red-600' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'"
                    :title="user.isActive ? 'تعطيل' : 'تفعيل'"
                  >
                    <svg v-if="user.isActive" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    <svg v-else class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showModal = false">
        <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
          <h2 class="mb-4 text-lg font-bold text-gray-900">
            {{ editingUser ? `تعديل: ${editingUser.name}` : 'مستخدم جديد' }}
          </h2>

          <form @submit.prevent="handleSubmit" class="space-y-4">
            <div>
              <label class="label">الاسم *</label>
              <input v-model="userForm.name" type="text" class="input" required />
            </div>
            <div>
              <label class="label">البريد الإلكتروني *</label>
              <input v-model="userForm.email" type="email" class="input" dir="ltr" required />
            </div>
            <div>
              <label class="label">{{ editingUser ? 'كلمة مرور جديدة (اتركها فارغة لعدم التغيير)' : 'كلمة المرور *' }}</label>
              <input v-model="userForm.password" type="password" class="input" dir="ltr" :required="!editingUser" minlength="6" :placeholder="editingUser ? '••••••••' : ''" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="label">الدور *</label>
                <select v-model="userForm.role" class="input">
                  <option v-for="(label, value) in roleLabels" :key="value" :value="value">{{ label }}</option>
                </select>
              </div>
              <div>
                <label class="label">رقم الهاتف</label>
                <input v-model="userForm.phone" type="tel" class="input" dir="ltr" placeholder="07XXXXXXXXX" />
              </div>
            </div>

            <!-- Active toggle (only for editing, not self) -->
            <div v-if="editingUser && editingUser.id !== authStore.user?.id" class="flex items-center gap-3 rounded-lg border border-gray-200 p-3">
              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" v-model="userForm.isActive" class="h-4 w-4 rounded border-gray-300 text-primary-600" />
                <span :class="userForm.isActive ? 'text-green-700' : 'text-red-600'">
                  {{ userForm.isActive ? 'الحساب نشط' : 'الحساب معطل' }}
                </span>
              </label>
            </div>

            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showModal = false" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="saving" class="btn-primary">
                {{ saving ? 'جاري الحفظ...' : editingUser ? 'حفظ التعديلات' : 'إنشاء المستخدم' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>
