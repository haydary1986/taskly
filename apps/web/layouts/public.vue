<script setup lang="ts">
const brandingStore = useBrandingStore()
</script>

<template>
  <div class="min-h-screen bg-white dark:bg-gray-950">
    <!-- Navbar -->
    <header class="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-lg dark:bg-gray-950/80 dark:border-gray-800">
      <div class="mx-auto max-w-7xl flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
        <NuxtLink to="/services" class="flex items-center gap-2">
          <img v-if="brandingStore.logoUrl" :src="brandingStore.logoUrl" :alt="brandingStore.appName" class="h-9 w-auto max-w-[140px] object-contain" />
          <template v-else>
            <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600 text-white font-bold text-lg">{{ brandingStore.appName?.charAt(0) || 'T' }}</div>
          </template>
          <div>
            <span class="text-xl font-bold text-gray-900 dark:text-white">{{ brandingStore.appName }}</span>
            <span class="text-[10px] text-gray-400 block -mt-1">{{ brandingStore.companyName }}</span>
          </div>
        </NuxtLink>
        <nav class="hidden sm:flex items-center gap-6">
          <a href="#services" class="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-300 transition-colors">خدماتنا</a>
          <a href="#why-us" class="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-300 transition-colors">لماذا نحن</a>
          <a href="#contact" class="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-300 transition-colors">تواصل معنا</a>
        </nav>
        <NuxtLink to="/login" class="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition-colors">
          تسجيل الدخول
        </NuxtLink>
      </div>
    </header>

    <slot />

    <!-- Footer -->
    <footer class="border-t border-gray-100 bg-gray-50 dark:bg-gray-900 dark:border-gray-800">
      <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-3">{{ brandingStore.appName }} — {{ brandingStore.companyName }}</h3>
            <p class="text-sm text-gray-500">نظام متكامل لإدارة الأعمال والعلاقات مع العملاء. نساعدك على تنظيم فريقك وزيادة مبيعاتك.</p>
          </div>
          <div>
            <h4 class="font-bold text-gray-900 dark:text-white mb-3">روابط سريعة</h4>
            <div class="space-y-2 text-sm text-gray-500">
              <a href="#services" class="block hover:text-primary-600">خدماتنا</a>
              <a href="#why-us" class="block hover:text-primary-600">لماذا نحن</a>
              <a href="#contact" class="block hover:text-primary-600">تواصل معنا</a>
            </div>
          </div>
          <div>
            <h4 class="font-bold text-gray-900 dark:text-white mb-3">تواصل</h4>
            <div class="space-y-2 text-sm text-gray-500">
              <p>البريد: info@algonest.tech</p>
              <p>الهاتف: +964 XXX XXX XXXX</p>
            </div>
          </div>
        </div>
        <div class="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800 text-center text-xs text-gray-400">
          © {{ new Date().getFullYear() }} {{ brandingStore.companyName }}. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  </div>
</template>
