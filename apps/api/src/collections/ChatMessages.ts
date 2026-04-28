import type { CollectionConfig } from 'payload'

export const ChatMessages: CollectionConfig = {
  slug: 'chat-messages',
  admin: {
    defaultColumns: ['sender', 'room', 'content', 'createdAt'],
    group: 'التواصل',
  },
  access: {
    create: async ({ req, data }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor'].includes(role)) return true
      // Sender can only create messages in rooms they belong to
      const roomId = data?.room ? (typeof data.room === 'object' ? data.room.id : data.room) : null
      if (!roomId) return false
      try {
        const room = await req.payload.findByID({
          collection: 'chat-rooms',
          id: roomId,
          overrideAccess: true,
          depth: 0,
        })
        const memberIds = (room.members || []).map((m: unknown) =>
          typeof m === 'object' && m !== null && 'id' in m ? String((m as { id: unknown }).id) : String(m),
        )
        return memberIds.includes(String(req.user.id))
      } catch {
        return false
      }
    },
    read: async ({ req }) => {
      if (!req.user) return false
      const role = req.user.role as string
      if (['super-admin', 'supervisor'].includes(role)) return true
      // Restrict to messages in rooms where the user is a member
      try {
        const rooms = await req.payload.find({
          collection: 'chat-rooms',
          where: { members: { equals: req.user.id } },
          limit: 1000,
          depth: 0,
          overrideAccess: true,
        })
        const roomIds = rooms.docs.map((r) => r.id)
        if (roomIds.length === 0) return false
        return { room: { in: roomIds } }
      } catch {
        return false
      }
    },
    update: ({ req }) => {
      if (!req.user) return false
      return { sender: { equals: req.user.id } }
    },
    delete: ({ req }) => {
      if (!req.user) return false
      if (req.user.role === 'super-admin') return true
      return { sender: { equals: req.user.id } }
    },
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          data.sender = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation !== 'create' || !req.user) return

        // Extract mention IDs (handle both populated objects and plain IDs)
        const rawMentions = doc.mentions || []
        const mentionedUserIds: string[] = rawMentions.map((m: any) =>
          typeof m === 'object' && m?.id ? m.id : m,
        ).filter(Boolean)

        console.log('[Chat] Message created. Mentions:', mentionedUserIds)
        if (mentionedUserIds.length === 0) return

        const { sendNotification } = await import('../lib/notify')
        const senderName = req.user.name || 'مستخدم'
        const content = doc.content || 'مرفق'

        for (const userId of mentionedUserIds) {
          if (userId === req.user.id) continue
          console.log('[Chat] Sending mention notification to:', userId)
          sendNotification(req.payload, {
            recipientId: userId,
            type: 'comment',
            title: `أشار إليك ${senderName} في محادثة`,
            message: content.length > 100 ? content.substring(0, 100) + '...' : content,
            link: '/chat',
            metadata: { roomId: doc.room, messageId: doc.id },
          }).catch((err) => console.error('[Chat] Notification error:', err))
        }
      },
    ],
  },
  fields: [
    {
      name: 'room',
      type: 'relationship',
      relationTo: 'chat-rooms',
      required: true,
      label: 'الغرفة',
      index: true,
    },
    {
      name: 'sender',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      label: 'المرسل',
      admin: { readOnly: true },
    },
    {
      name: 'content',
      type: 'text',
      label: 'المحتوى',
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'text',
      label: 'النوع',
      options: [
        { label: 'نص', value: 'text' },
        { label: 'صورة', value: 'image' },
        { label: 'ملف', value: 'file' },
      ],
    },
    {
      name: 'attachment',
      type: 'upload',
      relationTo: 'media',
      label: 'مرفق',
    },
    {
      name: 'mentions',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      label: 'الإشارات',
    },
    {
      name: 'replyTo',
      type: 'relationship',
      relationTo: 'chat-messages',
      label: 'رد على',
    },
    {
      name: 'reactions',
      type: 'json',
      label: 'ردود الفعل',
    },
    {
      name: 'isPinned',
      type: 'checkbox',
      defaultValue: false,
      label: 'مثبتة',
    },
  ],
  timestamps: true,
}
