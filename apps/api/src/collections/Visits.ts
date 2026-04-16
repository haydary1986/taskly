import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'
import { isAdmin, adminOrOwn } from '../access/roles'
import { createLogger } from '../lib/logger'

const log = createLogger('Visits')

export const Visits: CollectionConfig = {
  slug: 'visits',
  admin: {
    defaultColumns: ['client', 'representative', 'status', 'checkInTime', 'createdAt'],
    group: 'المبيعات',
  },
  access: {
    create: ({ req }) => {
      if (!req.user) return false
      return ['super-admin', 'supervisor', 'sales-rep'].includes(req.user.role as string)
    },
    read: adminOrOwn('representative'),
    update: adminOrOwn('representative'),
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || !req.user || !data?.lead) return data
        const userRole = req.user.role as string
        if (['super-admin', 'supervisor'].includes(userRole)) return data
        const leadId = typeof data.lead === 'object' ? data.lead.id : data.lead
        const lead = await req.payload.findByID({ collection: 'leads', id: leadId, overrideAccess: true })
        const assignedId = typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : lead.assignedTo
        if (assignedId && String(assignedId) !== String(req.user.id)) {
          throw new APIError('هذا العميل محجوز لمندوب آخر — لا يمكن تسجيل زيارة', 403)
        }
        return data
      },
    ],
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user && !data.representative) {
          data.representative = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || !doc.lead || !req.user) return doc

        const leadId = typeof doc.lead === 'object' ? doc.lead.id : doc.lead
        const repId = typeof doc.representative === 'object' ? doc.representative.id : doc.representative

        const outcomeToLeadStatus: Record<string, string> = {
          agreed: 'qualified',
          interested: 'contacted',
          pending: 'contacted',
          callback: 'contacted',
          'no-answer': 'contacted',
          rejected: 'unqualified',
        }

        const nextStatus = doc.outcome && outcomeToLeadStatus[doc.outcome] ? outcomeToLeadStatus[doc.outcome] : 'contacted'

        // Atomic claim: only updates if lead is still unassigned.
        // If another rep claimed it in the same millisecond, this update matches 0 docs.
        try {
          const claimResult = await req.payload.update({
            collection: 'leads',
            where: {
              and: [
                { id: { equals: leadId } },
                { or: [{ assignedTo: { exists: false } }, { assignedTo: { equals: null } }] },
              ],
            },
            data: { assignedTo: repId, status: nextStatus },
            overrideAccess: true,
          })

          if (!claimResult.docs || claimResult.docs.length === 0) {
            // Lead was already claimed — just update status if current rep owns it
            const lead = await req.payload.findByID({ collection: 'leads', id: leadId, overrideAccess: true })
            const ownerId = typeof lead.assignedTo === 'object' ? lead.assignedTo?.id : lead.assignedTo
            if (String(ownerId) === String(repId)) {
              await req.payload.update({
                collection: 'leads',
                id: leadId,
                data: { status: nextStatus },
                overrideAccess: true,
              })
            } else {
              log.warn({ leadId, repId, ownerId }, 'Visit recorded but lead owned by another rep — status not updated')
            }
          }
        } catch (err: unknown) {
          log.error({ err, leadId, repId }, 'Failed to sync lead status after visit')
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'client',
      type: 'relationship',
      relationTo: 'clients',
      label: 'العميل',
      index: true,
    },
    {
      name: 'lead',
      type: 'relationship',
      relationTo: 'leads',
      label: 'عميل محتمل',
      index: true,
    },
    {
      name: 'representative',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المندوب',
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'checked-in',
      label: 'الحالة',
      options: [
        { label: 'تم تسجيل الدخول', value: 'checked-in' },
        { label: 'تم تسجيل الخروج', value: 'checked-out' },
        { label: 'ملغاة', value: 'cancelled' },
      ],
    },
    {
      name: 'outcome',
      type: 'select',
      label: 'نتيجة الزيارة',
      index: true,
      options: [
        { label: 'موافقة', value: 'agreed' },
        { label: 'مهتم', value: 'interested' },
        { label: 'انتظار / لاحقاً', value: 'pending' },
        { label: 'إعادة الاتصال', value: 'callback' },
        { label: 'لا يوجد رد', value: 'no-answer' },
        { label: 'رفض', value: 'rejected' },
      ],
    },
    {
      name: 'checkInTime',
      type: 'date',
      required: true,
      label: 'وقت الدخول',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'checkOutTime',
      type: 'date',
      label: 'وقت الخروج',
      admin: { date: { pickerAppearance: 'dayAndTime' } },
    },
    {
      name: 'checkInLocation',
      type: 'point',
      label: 'موقع الدخول',
    },
    {
      name: 'checkOutLocation',
      type: 'point',
      label: 'موقع الخروج',
    },
    {
      name: 'checkInPhoto',
      type: 'upload',
      relationTo: 'media',
      label: 'صورة إثبات الحضور',
    },
    {
      name: 'distance',
      type: 'number',
      label: 'المسافة من العميل (متر)',
      admin: { readOnly: true },
    },
    {
      name: 'isValid',
      type: 'checkbox',
      defaultValue: true,
      label: 'زيارة صالحة',
      admin: { description: 'يتم التحقق تلقائياً من صحة الموقع' },
    },
    {
      name: 'attachments',
      type: 'relationship',
      relationTo: 'media',
      hasMany: true,
      label: 'المرفقات',
    },
    {
      name: 'notes',
      type: 'textarea',
      label: 'ملاحظات',
    },
    {
      name: 'syncedFromOffline',
      type: 'checkbox',
      defaultValue: false,
      label: 'تمت المزامنة من وضع عدم الاتصال',
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
