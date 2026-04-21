import type { CollectionConfig } from 'payload'
import { isAdmin, isManagement, isSuperAdmin, hasRoleOrSelf, managementFieldAccess } from '../access/roles'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    tokenExpiration: 7200,
    maxLoginAttempts: 5,
    lockTime: 600000,
    cookies: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
      // Shared across all *.algonest.tech subdomains so the web app
      // (task.algonest.tech) can read the cookie set by the API
      // (api-task.algonest.tech). Override with AUTH_COOKIE_DOMAIN env var.
      domain: process.env.AUTH_COOKIE_DOMAIN
        || (process.env.NODE_ENV === 'production' ? '.algonest.tech' : undefined),
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'isActive'],
    group: 'إدارة النظام',
  },
  access: {
    create: isAdmin,
    read: ({ req }) => !!req.user,
    update: hasRoleOrSelf('super-admin', 'supervisor', 'auditor'),
    delete: isSuperAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'الاسم',
    },
    {
      name: 'phone',
      type: 'text',
      label: 'رقم الهاتف',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'الصورة الشخصية',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'sales-rep',
      saveToJWT: true,
      label: 'الدور',
      access: {
        read: () => true,
        create: managementFieldAccess,
        update: managementFieldAccess,
      },
      options: [
        { label: 'مدير النظام', value: 'super-admin' },
        { label: 'مشرف', value: 'supervisor' },
        { label: 'مندوب مبيعات', value: 'sales-rep' },
        { label: 'موظف', value: 'programmer' },
      ],
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'نشط',
      access: {
        read: managementFieldAccess,
        create: managementFieldAccess,
        update: managementFieldAccess,
      },
    },
    {
      name: 'twoFactorEnabled',
      type: 'checkbox',
      defaultValue: false,
      label: 'المصادقة الثنائية مفعلة',
      admin: {
        readOnly: true,
        position: 'sidebar',
      },
    },
    {
      name: 'twoFactorSecret',
      type: 'text',
      label: 'مفتاح 2FA',
      admin: {
        hidden: true,
      },
      access: {
        read: () => false,
        create: () => false,
        update: () => false,
      },
    },
    {
      name: 'telegramChatId',
      type: 'text',
      label: 'معرف تيليجرام',
      admin: {
        readOnly: true,
        position: 'sidebar',
        condition: (data, siblingData, { user }) => {
          const role = (user as any)?.role
          return role === 'super-admin' || role === 'supervisor'
        },
      },
    },
    {
      name: 'preferences',
      type: 'json',
      label: 'تفضيلات الواجهة (سحابياً)',
      admin: { description: 'JSON يضم إعدادات المظهر مثل الوضع الداكن، ترتيب القوائم، الخ' },
    },
    {
      name: 'customPermissions',
      type: 'json',
      label: 'صلاحيات مخصصة',
      access: {
        read: ({ req: { user } }) => user?.role === 'super-admin',
        create: ({ req: { user } }) => user?.role === 'super-admin',
        update: ({ req: { user } }) => user?.role === 'super-admin'
      },
      admin: { description: 'تجاوز صلاحيات الدور الافتراضي باستخدام JSON' },
    },
  ],
  hooks: {
    beforeLogin: [
      async ({ user }) => {
        if (!(user as any).isActive) {
          throw new Error('هذا الحساب معطل. تواصل مع المدير.')
        }
      },
    ],
    afterLogin: [
      async ({ req, user }) => {
        try {
          const ip = req.headers.get?.('x-forwarded-for') || req.headers.get?.('x-real-ip') || 'unknown'
          const userAgent = req.headers.get?.('user-agent') || ''
          await req.payload.create({
            collection: 'login-logs',
            data: {
              user: user.id,
              email: user.email,
              success: true,
              ip: typeof ip === 'string' ? ip.split(',')[0].trim() : 'unknown',
              userAgent,
            } as any,
            overrideAccess: true,
          })
        } catch (err) {
          console.error('[LoginLog] Failed to log successful login:', err)
        }
      },
    ],
    afterError: [
      async ({ req }) => {
        // Only log login-related errors
        const url = req.url || ''
        if (!url.includes('/login')) return
        try {
          let email = 'unknown'
          try {
            const cloned = (req as any).clone()
            const body = await cloned.json()
            email = body?.email || 'unknown'
          } catch { /* body parse failed */ }
          const ip = req.headers.get?.('x-forwarded-for') || req.headers.get?.('x-real-ip') || 'unknown'
          const userAgent = req.headers.get?.('user-agent') || ''
          await req.payload.create({
            collection: 'login-logs',
            data: {
              email,
              success: false,
              ip: typeof ip === 'string' ? ip.split(',')[0].trim() : 'unknown',
              userAgent,
              reason: 'بيانات دخول غير صحيحة',
            } as any,
            overrideAccess: true,
          })
        } catch (err) {
          req.payload.logger.warn({ err }, '[Users.afterError] Failed to write login-log')
        }
      },
    ],
  },
  timestamps: true,
}
