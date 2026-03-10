import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../access/roles'

export const Products: CollectionConfig = {
  slug: 'products',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'type', 'price', 'isActive', 'createdAt'],
    group: 'CRM',
  },
  access: {
    create: isAdmin,
    read: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'اسم المنتج/الخدمة',
    },
    {
      name: 'description',
      type: 'richText',
      label: 'الوصف',
    },
    {
      name: 'type',
      type: 'select',
      required: true,
      defaultValue: 'service',
      label: 'النوع',
      options: [
        { label: 'منتج', value: 'product' },
        { label: 'خدمة', value: 'service' },
      ],
    },
    {
      name: 'sku',
      type: 'text',
      unique: true,
      label: 'رمز المنتج (SKU)',
    },
    {
      name: 'price',
      type: 'number',
      required: true,
      label: 'السعر (USD)',
      min: 0,
    },
    {
      name: 'currency',
      type: 'select',
      defaultValue: 'USD',
      label: 'العملة',
      options: [
        { label: 'دولار أمريكي', value: 'USD' },
        { label: 'دينار عراقي', value: 'IQD' },
        { label: 'يورو', value: 'EUR' },
      ],
    },
    {
      name: 'category',
      type: 'text',
      label: 'الفئة',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
      label: 'صورة المنتج',
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: 'نشط',
    },
  ],
  timestamps: true,
}
