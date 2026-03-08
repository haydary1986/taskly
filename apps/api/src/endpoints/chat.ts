import type { PayloadHandler } from 'payload'
import { validateBody, chatReactSchema, chatPinSchema } from '../lib/validators'
import { createLogger } from '../lib/logger'

const log = createLogger('chat')

/** Toggle a reaction on a chat message */
export const toggleReaction: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json?.()
  const validation = validateBody(chatReactSchema, body)
  if (!validation.success) return validation.response

  const { messageId, emoji } = validation.data

  const message = await payload.findByID({ collection: 'chat-messages', id: messageId })
  const reactions = (message.reactions as Record<string, string[]>) || {}

  if (!reactions[emoji]) reactions[emoji] = []
  const idx = reactions[emoji].indexOf(user.id)
  if (idx >= 0) {
    reactions[emoji].splice(idx, 1)
    if (reactions[emoji].length === 0) delete reactions[emoji]
  } else {
    reactions[emoji].push(user.id)
  }

  const updated = await payload.update({
    collection: 'chat-messages',
    id: messageId,
    data: { reactions },
    overrideAccess: true,
  })

  return Response.json({ doc: updated })
}

/** Toggle pin on a chat message */
export const togglePin: PayloadHandler = async (req) => {
  const { payload, user } = req
  if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const body = await req.json?.()
  const validation = validateBody(chatPinSchema, body)
  if (!validation.success) return validation.response

  const { messageId } = validation.data

  const message = await payload.findByID({ collection: 'chat-messages', id: messageId })
  const updated = await payload.update({
    collection: 'chat-messages',
    id: messageId,
    data: { isPinned: !message.isPinned },
    overrideAccess: true,
  })

  return Response.json({ doc: updated })
}

/** Get online users list */
export const onlineUsers: PayloadHandler = async (req) => {
  if (!req.user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

  const { socketService } = await import('../socket/index')
  const users = socketService.getConnectedUsers()
  return Response.json({ users: users.map((u) => u.userId) })
}
