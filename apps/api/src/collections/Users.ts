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
      domain: process.env.NODE_ENV === 'production' ? 'api-task.algonest.tech' : undefined,
    },
  },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role', 'isActive'],
    group: 'إدارة النظام',
  },
  access: {
    create: isAdmin,
    read: hasRoleOrSelf('super-admin', 'supervisor', 'auditor'),
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
        read: managementFieldAccess,
        create: managementFieldAccess,
        update: managementFieldAccess,
      },
      options: [
        { label: 'مدير عام', value: 'super-admin' },
        { label: 'مشرف', value: 'supervisor' },
        { label: 'مراقب', value: 'auditor' },
        { label: 'مندوب مبيعات', value: 'sales-rep' },
        { label: 'مبرمج', value: 'programmer' },
        { label: 'مصمم', value: 'designer' },
        { label: 'مسؤول سوشيال ميديا', value: 'social-media-manager' },
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
        } catch {
          // Silently fail — don't break login flow
        }
      },
    ],
  },
  timestamps: true,
}
