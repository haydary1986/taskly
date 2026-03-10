import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../access/roles'

export const ServiceRequests: CollectionConfig = {
  slug: 'service-requests',
  admin: {
    useAsTitle: 'companyName',
    defaultColumns: ['companyName', 'contactName', 'service', 'status', 'createdAt'],
    group: 'CRM',
  },
  access: {
    // Public can create (no auth needed for form submissions)
    create: () => true,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'companyName',
      type: 'text',
      required: true,
      label: 'اسم الشركة',
    },
    {
      name: 'contactName',
      type: 'text',
      required: true,
      label: 'اسم المسؤول',
    },
    {
      type: 'row',
      fields: [
        {
          name: 'email',
          type: 'email',
          required: true,
          label: 'البريد الإلكتروني',
          admin: { width: '50%' },
        },
        {
          name: 'phone',
          type: 'text',
          required: true,
          label: 'رقم الهاتف',
          admin: { width: '50%' },
        },
      ],
    },
    {
      name: 'service',
      type: 'relationship',
      relationTo: 'products',
      label: 'الخدمة المطلوبة',
    },
    {
      name: 'serviceName',
      type: 'text',
      label: 'اسم الخدمة (نص)',
      admin: { description: 'يُملأ تلقائياً في حال عدم اختيار منتج' },
    },
    {
      name: 'message',
      type: 'textarea',
      label: 'تفاصيل الطلب',
    },
    {
      name: 'budget',
      type: 'select',
      label: 'الميزانية التقديرية',
      options: [
        { label: 'أقل من $1,000', value: 'under-1k' },
        { label: '$1,000 - $5,000', value: '1k-5k' },
        { label: '$5,000 - $15,000', value: '5k-15k' },
        { label: '$15,000 - $50,000', value: '15k-50k' },
        { label: 'أكثر من $50,000', value: 'over-50k' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'new',
      label: 'الحالة',
      options: [
        { label: 'جديد', value: 'new' },
        { label: 'تم المراجعة', value: 'reviewed' },
        { label: 'تم التواصل', value: 'contacted' },
        { label: 'تم التحويل لصفقة', value: 'converted' },
        { label: 'مرفوض', value: 'rejected' },
      ],
    },
    {
      name: 'convertedToDeal',
      type: 'relationship',
      relationTo: 'deals',
      label: 'الصفقة المرتبطة',
      admin: {
        condition: (data) => data?.status === 'converted',
      },
    },
    {
      name: 'internalNotes',
      type: 'textarea',
      label: 'ملاحظات داخلية',
    },
    {
      name: 'source',
      type: 'text',
      defaultValue: 'website',
      label: 'المصدر',
      admin: { readOnly: true },
    },
  ],
  timestamps: true,
}
