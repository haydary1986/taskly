import type { CollectionConfig } from 'payload'
import { isAuthenticated } from '../access/roles'

export const ChatRooms: CollectionConfig = {
  slug: 'chat-rooms',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'createdBy', 'createdAt'],
    group: 'التواصل',
  },
  access: {
    create: isAuthenticated,
    read: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor'].includes(role)) return true
      // For relationship hasMany fields, `equals` matches when any related ID equals the value
      return { members: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor'].includes(role)) return true
      return { createdBy: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      return req.user?.role === 'super-admin'
    },
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: 'اسم الغرفة',
    },
    {
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      required: true,
      label: 'الأعضاء',
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      label: 'أنشئت بواسطة',
      admin: { readOnly: true },
    },
    {
      name: 'messages',
      type: 'join',
      collection: 'chat-messages',
      on: 'room',
    },
  ],
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.createdBy = req.user.id
          if (!data.members?.includes(req.user.id)) {
            data.members = [...(data.members || []), req.user.id]
          }
        }
        return data
      },
    ],
    afterDelete: [
      async ({ id, req }) => {
        // Delete all messages belonging to this room
        try {
          const msgs = await req.payload.find({
            collection: 'chat-messages',
            where: { room: { equals: id } },
            limit: 10000,
            depth: 0,
          })
          for (const msg of msgs.docs) {
            await req.payload.delete({
              collection: 'chat-messages',
              id: msg.id,
              overrideAccess: true,
            })
          }
        } catch (err) {
          console.error('[ChatRooms] Failed to cleanup messages on room delete:', err)
        }
      },
    ],
  },
  timestamps: true,
}
