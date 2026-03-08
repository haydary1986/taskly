<script setup lang="ts">
const authStore = useAuthStore()
const isOpen = ref(false)

// Show only once per user session
const hasSeenOnboarding = useCookie<boolean>('taskly_onboarded', { maxAge: 60 * 60 * 24 * 365 })

const currentStep = ref(0)

const steps = [
  {
    icon: '🚀',
    title: 'مرحباً بك في Taskly!',
    description: 'نظام إدارة المهام المتقدم لفريقك. سنأخذك في جولة سريعة لاستكشاف أهم الميزات.',
  },
  {
    icon: '📋',
    title: 'إدارة المهام',
    description: 'تصفح مهامك من خلال ثلاث طرق عرض: القائمة، كانبان، والتقويم. يمكنك تغيير حالة المهام وتتبع التقدم بسهولة.',
  },
  {
    icon: '🔍',
    title: 'البحث الشامل (Ctrl+K)',
    description: 'اضغط Ctrl+K في أي وقت للبحث السريع في المهام والمشاريع والموظفين والصفحات.',
  },
  {
    icon: '🌙',
    title: 'الوضع الداكن',
    description: 'يمكنك التبديل بين الوضع الفاتح والداكن من الشريط العلوي لراحة عينيك.',
  },
  {
    icon: '📱',
    title: 'تطبيق ذكي (PWA)',
    description: 'يمكنك تثبيت Taskly كتطبيق على هاتفك أو حاسوبك من خلال المتصفح والوصول إليه دون اتصال!',
  },
]

onMounted(() => {
  // Show onboarding for first-time users
  if (authStore.isAuthenticated && !hasSeenOnboarding.value) {
    setTimeout(() => { isOpen.value = true }, 1500)
  }
})

function next() {
  if (currentStep.value < steps.length - 1) {
    currentStep.value++
  } else {
    finish()
  }
}

function prev() {
  if (currentStep.value > 0) currentStep.value--
}

function finish() {
  hasSeenOnboarding.value = true
  isOpen.value = false
}
</script>

<template>
  <Teleport to="body">
    <Transition name="onboard">
      <div v-if="isOpen" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" @click.self="finish">
        <div class="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl dark:bg-[#151B2B] dark:border dark:border-white/10 overflow-hidden relative">
          
          <!-- Progress bar -->
          <div class="absolute top-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-800">
            <div 
              class="h-full bg-gradient-to-r from-primary-500 to-primary-600 transition-all duration-500 ease-out" 
              :style="{ width: `${((currentStep + 1) / steps.length) * 100}%` }"
            />
          </div>
          
          <!-- Close button -->
          <button @click="finish" class="absolute top-4 left-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <!-- Step content -->
          <TransitionGroup name="slide" tag="div">
            <div v-for="(step, idx) in steps" v-show="currentStep === idx" :key="idx" class="text-center pt-4">
              <div class="mb-4 text-5xl">{{ step.icon }}</div>
              <h3 class="mb-3 text-xl font-bold text-gray-900 dark:text-white">{{ step.title }}</h3>
              <p class="text-sm leading-relaxed text-gray-500 dark:text-gray-400">{{ step.description }}</p>
            </div>
          </TransitionGroup>

          <!-- Navigation -->
          <div class="mt-8 flex items-center justify-between">
            <button 
              v-if="currentStep > 0" 
              @click="prev" 
              class="rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
            >
              السابق
            </button>
            <div v-else />
            
            <div class="flex items-center gap-1.5">
              <div 
                v-for="i in steps.length" 
                :key="i" 
                class="h-1.5 rounded-full transition-all duration-300"
                :class="i - 1 === currentStep ? 'w-6 bg-primary-500' : 'w-1.5 bg-gray-300 dark:bg-gray-600'"
              />
            </div>

            <button @click="next" class="btn-primary py-2 px-5 text-sm">
              {{ currentStep === steps.length - 1 ? 'ابدأ الآن!' : 'التالي' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.onboard-enter-active { transition: all 0.4s ease-out; }
.onboard-leave-active { transition: all 0.25s ease-in; }
.onboard-enter-from { opacity: 0; transform: scale(0.9); }
.onboard-leave-to { opacity: 0; transform: scale(0.95); }
.slide-enter-active { transition: all 0.3s ease-out; }
.slide-leave-active { transition: all 0.2s ease-in; position: absolute; }
.slide-enter-from { opacity: 0; transform: translateX(20px); }
.slide-leave-to { opacity: 0; transform: translateX(-20px); }
</style>
