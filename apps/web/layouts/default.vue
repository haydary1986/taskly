<template>
  <div class="flex min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Network status -->
    <NetworkStatus />

    <!-- Sidebar -->
    <LayoutSidebar />

    <!-- Main content -->
    <div class="flex flex-1 flex-col lg:mr-64">
      <!-- Top navbar -->
      <LayoutNavbar />

      <!-- Page content -->
      <main class="flex-1 p-4 lg:p-6">
        <slot />
      </main>
    </div>

    <!-- Mobile bottom nav -->
    <LayoutMobileNav />

    <!-- Telegram link popup (shows once per session if not linked) -->
    <TelegramLinkPopup />

    <!-- PWA Install Prompt -->
    <PwaInstallPrompt />
  </div>
</template>
