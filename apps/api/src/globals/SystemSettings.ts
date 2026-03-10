import type { GlobalConfig } from 'payload'

export const SystemSettings: GlobalConfig = {
  slug: 'system-settings',
  label: 'إعدادات النظام',
  admin: {
    group: 'النظام',
  },
  access: {
    read: () => true,
    update: ({ req }) => {
      if (!req.user) return false
      return req.user.role === 'super-admin'
    },
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'تيليجرام',
          fields: [
            {
              name: 'telegramBotToken',
              type: 'text',
              label: 'رمز بوت تيليجرام',
              admin: { description: 'Token من @BotFather' },
            },
            {
              name: 'telegramBotUsername',
              type: 'text',
              label: 'اسم مستخدم البوت',
              admin: { description: 'بدون @ — مثال: TasklyBot' },
            },
            {
              name: 'telegramEnabled',
              type: 'checkbox',
              defaultValue: false,
              label: 'تفعيل إشعارات تيليجرام',
            },
          ],
        },
        {
          label: 'البريد الإلكتروني',
          fields: [
            {
              name: 'smtpHost',
              type: 'text',
              label: 'خادم SMTP',
            },
            {
              name: 'smtpPort',
              type: 'number',
              label: 'المنفذ',
              defaultValue: 587,
            },
            {
              name: 'smtpUser',
              type: 'text',
              label: 'اسم المستخدم',
            },
            {
              name: 'smtpPass',
              type: 'text',
              label: 'كلمة المرور',
              admin: { autoComplete: 'off' },
            },
            {
              name: 'smtpFrom',
              type: 'text',
              label: 'عنوان المرسل',
              defaultValue: 'noreply@algo-nest.com',
            },
            {
              name: 'emailEnabled',
              type: 'checkbox',
              defaultValue: false,
              label: 'تفعيل إشعارات البريد',
            },
          ],
        },
        {
          label: 'الهوية البصرية',
          fields: [
            {
              name: 'appName',
              type: 'text',
              label: 'اسم التطبيق',
              defaultValue: 'Taskly',
            },
            {
              name: 'companyName',
              type: 'text',
              label: 'اسم الشركة',
              defaultValue: 'ALGO-NEST',
            },
            {
              name: 'appLogo',
              type: 'upload',
              relationTo: 'media',
              label: 'شعار التطبيق',
              admin: { description: 'يُعرض في الشريط الجانبي وصفحة تسجيل الدخول (يُفضل PNG شفاف)' },
            },
            {
              name: 'appIcon',
              type: 'upload',
              relationTo: 'media',
              label: 'أيقونة التطبيق (PWA)',
              admin: { description: 'أيقونة مربعة للتطبيق على الجوال' },
            },
            {
              name: 'appFavicon',
              type: 'upload',
              relationTo: 'media',
              label: 'Favicon',
              admin: { description: 'أيقونة تبويب المتصفح (32x32 أو SVG)' },
            },
            {
              name: 'primaryColor',
              type: 'text',
              label: 'اللون الأساسي',
              defaultValue: '#2563eb',
              admin: { description: 'اللون الرئيسي للتطبيق (HEX) — مثال: #2563eb' },
            },
            {
              name: 'accentColor',
              type: 'text',
              label: 'اللون الثانوي',
              defaultValue: '#16a34a',
              admin: { description: 'لون التمييز (HEX) — مثال: #16a34a' },
            },
            {
              name: 'sidebarColor',
              type: 'select',
              label: 'لون الشريط الجانبي',
              defaultValue: 'white',
              options: [
                { label: 'أبيض', value: 'white' },
                { label: 'داكن', value: 'dark' },
                { label: 'اللون الأساسي', value: 'primary' },
              ],
            },
            {
              name: 'loginBackground',
              type: 'upload',
              relationTo: 'media',
              label: 'خلفية صفحة تسجيل الدخول',
            },
          ],
        },
      ],
    },
  ],
}
