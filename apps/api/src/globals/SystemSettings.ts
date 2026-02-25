import type { GlobalConfig } from 'payload'

export const SystemSettings: GlobalConfig = {
  slug: 'system-settings',
  label: 'إعدادات النظام',
  admin: {
    group: 'النظام',
  },
  access: {
    read: ({ req }) => {
      if (!req.user) return false
      return req.user.role === 'super-admin'
    },
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
          label: 'التطبيق',
          fields: [
            {
              name: 'appIcon',
              type: 'upload',
              relationTo: 'media',
              label: 'أيقونة التطبيق (PWA)',
            },
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
          ],
        },
      ],
    },
  ],
}
