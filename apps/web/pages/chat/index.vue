<script setup lang="ts">
definePageMeta({ middleware: 'auth', title: 'المحادثات' })

const api = useApi()
const authStore = useAuthStore()
const socket = useSocket()

// ── Core State ──
const rooms = ref<any[]>([])
const activeRoom = ref<any>(null)
const messages = ref<any[]>([])
const newMessage = ref('')
const loading = ref(true)
const loadingMessages = ref(false)
const showCreateRoom = ref(false)
const showEditRoom = ref(false)
const showMembers = ref(false)
const showLinks = ref(false)
const roomForm = reactive({ name: '', members: [] as string[] })
const editRoomForm = reactive({ name: '', members: [] as string[] })
const users = ref<any[]>([])
const typingUsers = ref<Map<string, string>>(new Map())
const messagesEl = ref<HTMLElement | null>(null)
const messageInput = ref<HTMLTextAreaElement | null>(null)
const userSearch = ref('')

// ── File Upload ──
const fileInput = ref<HTMLInputElement | null>(null)
const uploadingFile = ref(false)
const pendingFile = ref<File | null>(null)
const pendingFilePreview = ref<string | null>(null)

// ── @Mention ──
const showMentionDropdown = ref(false)
const mentionQuery = ref('')
const mentionStartPos = ref(-1)
const mentionedUsers = ref<{ id: string; name: string }[]>([])

// ── Reply ──
const replyingTo = ref<any>(null)

// ── Search ──
const showSearch = ref(false)
const searchQuery = ref('')

// ── Emoji Picker ──
const showEmojiPicker = ref(false)

// ── Lightbox ──
const lightboxUrl = ref<string | null>(null)

// ── Scroll ──
const showScrollBtn = ref(false)

// ── Drag & Drop ──
const isDragging = ref(false)

// ── Online Status ──
const onlineUserIds = ref<Set<string>>(new Set())

// ── Message Hover Actions ──
const hoveredMsgId = ref<string | null>(null)
const showReactionPicker = ref<string | null>(null)

// ── Unread Tracking ──
const unreadCounts = ref<Record<string, number>>({})

// ── Constants ──
const USER_COLORS = [
  { bg: 'bg-blue-500', light: 'bg-blue-100', text: 'text-blue-700', name: 'text-blue-600' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-100', text: 'text-emerald-700', name: 'text-emerald-600' },
  { bg: 'bg-violet-500', light: 'bg-violet-100', text: 'text-violet-700', name: 'text-violet-600' },
  { bg: 'bg-amber-500', light: 'bg-amber-100', text: 'text-amber-700', name: 'text-amber-600' },
  { bg: 'bg-rose-500', light: 'bg-rose-100', text: 'text-rose-700', name: 'text-rose-600' },
  { bg: 'bg-cyan-500', light: 'bg-cyan-100', text: 'text-cyan-700', name: 'text-cyan-600' },
  { bg: 'bg-orange-500', light: 'bg-orange-100', text: 'text-orange-700', name: 'text-orange-600' },
  { bg: 'bg-pink-500', light: 'bg-pink-100', text: 'text-pink-700', name: 'text-pink-600' },
  { bg: 'bg-teal-500', light: 'bg-teal-100', text: 'text-teal-700', name: 'text-teal-600' },
  { bg: 'bg-indigo-500', light: 'bg-indigo-100', text: 'text-indigo-700', name: 'text-indigo-600' },
]

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏']

const EMOJI_GROUPS = [
  { label: 'وجوه', emojis: ['😀','😂','🥹','😍','🤩','😎','🤔','😴','🥳','😡','👻','🤖'] },
  { label: 'إيماءات', emojis: ['👍','👎','👏','🙌','🤝','✌️','🤞','💪','🙏','❤️','🔥','⭐'] },
  { label: 'أشياء', emojis: ['🎉','🎯','💡','📌','✅','❌','⚠️','🚀','💬','📎','🔗','⏰'] },
]

const URL_REGEX = /https?:\/\/[^\s<>"']+/g

// ── Helpers ──
const userColorMap = new Map<string, (typeof USER_COLORS)[0]>()
function getUserColor(userId: string) {
  if (userColorMap.has(userId)) return userColorMap.get(userId)!
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash + userId.charCodeAt(i)) | 0
  }
  const color = USER_COLORS[Math.abs(hash) % USER_COLORS.length]
  userColorMap.set(userId, color)
  return color
}

function getSenderId(msg: any): string {
  return typeof msg.sender === 'object' ? msg.sender?.id : msg.sender
}
function getSenderName(msg: any): string {
  return typeof msg.sender === 'object' ? msg.sender?.name || '' : ''
}
function isOwnMessage(msg: any): boolean {
  return getSenderId(msg) === authStore.user?.id
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })
}
function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'اليوم'
  if (d.toDateString() === yesterday.toDateString()) return 'أمس'
  return d.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' })
}
function shouldShowDate(index: number): boolean {
  if (index === 0) return true
  return new Date(messages.value[index - 1].createdAt).toDateString() !== new Date(messages.value[index].createdAt).toDateString()
}
function shouldShowSender(index: number): boolean {
  if (index === 0) return true
  const prev = messages.value[index - 1]
  const curr = messages.value[index]
  if (getSenderId(prev) !== getSenderId(curr)) return true
  return new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime() > 5 * 60000
}
function getLastMessage(room: any) {
  if (!room._lastMessage) return ''
  const msg = room._lastMessage
  const name = typeof msg.sender === 'object' ? msg.sender?.name?.split(' ')?.[0] : ''
  const content = msg.type === 'image' ? '📷 صورة' : msg.type === 'file' ? '📎 ملف' : msg.content
  return name ? `${name}: ${content}` : content
}
function getAttachmentUrl(msg: any): string {
  return typeof msg.attachment === 'object' ? msg.attachment?.url || '' : ''
}
function getAttachmentName(msg: any): string {
  return typeof msg.attachment === 'object' ? msg.attachment?.filename || 'ملف' : ''
}
function isImageType(msg: any): boolean {
  if (msg.type === 'image') return true
  const mimeType = typeof msg.attachment === 'object' ? msg.attachment?.mimeType || '' : ''
  return mimeType.startsWith('image/')
}
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1048576).toFixed(1) + ' MB'
}
function getLinkDomain(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}
function isUserOnline(userId: string): boolean {
  return onlineUserIds.value.has(userId)
}

// ── Clickable URLs in message content ──
function renderContent(text: string): string {
  if (!text) return ''
  // Escape HTML first
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  // Convert URLs to clickable links
  return escaped.replace(URL_REGEX, (url) =>
    `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-600 underline hover:text-blue-800 break-all" dir="ltr">${url}</a>`,
  )
}

// ── Computed ──
const filteredUsers = computed(() => {
  if (!userSearch.value) return users.value
  const q = userSearch.value.toLowerCase()
  return users.value.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q))
})

const roomMembers = computed(() => {
  if (!activeRoom.value) return []
  const membersList = activeRoom.value.members || []
  return membersList.map((m: any) => typeof m === 'object' ? m : users.value.find((u) => u.id === m)).filter(Boolean)
})

const mentionSuggestions = computed(() => {
  const others = roomMembers.value.filter((m: any) => m.id !== authStore.user?.id)
  if (!mentionQuery.value) return others
  const q = mentionQuery.value.toLowerCase()
  return others.filter((m: any) => m.name?.toLowerCase().includes(q))
})

const sharedLinks = computed(() => {
  const links: { url: string; sender: string; date: string }[] = []
  for (const msg of messages.value) {
    if (!msg.content || msg.type !== 'text') continue
    const matches = msg.content.match(URL_REGEX)
    if (matches) {
      for (const url of matches) {
        links.push({ url, sender: getSenderName(msg) || 'مستخدم', date: msg.createdAt })
      }
    }
  }
  return links.reverse()
})

const canEditRoom = computed(() => {
  if (!activeRoom.value || !authStore.user) return false
  const role = authStore.role || ''
  if (['super-admin', 'supervisor'].includes(role)) return true
  const createdBy = typeof activeRoom.value.createdBy === 'object'
    ? activeRoom.value.createdBy?.id : activeRoom.value.createdBy
  return createdBy === authStore.user.id
})

const canDeleteRoom = computed(() => authStore.role === 'super-admin')

const pinnedMessages = computed(() => messages.value.filter((m) => m.isPinned))

const displayMessages = computed(() => {
  if (!searchQuery.value.trim()) return messages.value
  const q = searchQuery.value.toLowerCase()
  return messages.value.filter((m) => m.content?.toLowerCase().includes(q))
})

// ── Scroll ──
function scrollToBottom() {
  if (messagesEl.value) messagesEl.value.scrollTop = messagesEl.value.scrollHeight
}
function handleScroll() {
  if (!messagesEl.value) return
  const el = messagesEl.value
  showScrollBtn.value = el.scrollHeight - el.scrollTop - el.clientHeight > 200
}

// ── Mention Logic ──
function handleInput() {
  handleTyping()
  checkForMention()
}
function checkForMention() {
  const el = messageInput.value
  if (!el) return
  const cursorPos = el.selectionStart || 0
  const text = newMessage.value.substring(0, cursorPos)
  const lastAt = text.lastIndexOf('@')
  if (lastAt === -1 || (lastAt > 0 && text[lastAt - 1] !== ' ' && text[lastAt - 1] !== '\n')) {
    showMentionDropdown.value = false
    return
  }
  const query = text.substring(lastAt + 1)
  if (query.includes(' ') || query.includes('\n')) {
    showMentionDropdown.value = false
    return
  }
  mentionQuery.value = query
  mentionStartPos.value = lastAt
  showMentionDropdown.value = true
}
function selectMention(user: any) {
  const before = newMessage.value.substring(0, mentionStartPos.value)
  const after = newMessage.value.substring((messageInput.value?.selectionStart || mentionStartPos.value + mentionQuery.value.length + 1))
  newMessage.value = `${before}@${user.name} ${after}`
  showMentionDropdown.value = false
  if (!mentionedUsers.value.find((m) => m.id === user.id)) {
    mentionedUsers.value.push({ id: user.id, name: user.name })
  }
  nextTick(() => messageInput.value?.focus())
}

// ── File Upload ──
function triggerFileInput() { fileInput.value?.click() }
function handleFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  pendingFile.value = file
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = () => { pendingFilePreview.value = reader.result as string }
    reader.readAsDataURL(file)
  } else {
    pendingFilePreview.value = null
  }
  input.value = ''
}
function cancelFile() { pendingFile.value = null; pendingFilePreview.value = null }

async function sendFileMessage() {
  if (!pendingFile.value || !activeRoom.value) return
  uploadingFile.value = true
  try {
    const mediaRes = await api.upload(pendingFile.value)
    const mediaId = mediaRes.doc?.id || mediaRes.id
    const isImage = pendingFile.value.type.startsWith('image/')
    const msg = await api.post('/chat-messages', {
      room: activeRoom.value.id,
      content: newMessage.value.trim() || (isImage ? '📷 صورة' : `📎 ${pendingFile.value.name}`),
      type: isImage ? 'image' : 'file',
      attachment: mediaId,
      mentions: mentionedUsers.value.map((m) => m.id),
      replyTo: replyingTo.value?.id || undefined,
    })
    messages.value.push(msg.doc)
    socket.emit('chat:message', { room: activeRoom.value.id, ...msg.doc })
    newMessage.value = ''
    mentionedUsers.value = []
    replyingTo.value = null
    pendingFile.value = null
    pendingFilePreview.value = null
    await nextTick()
    scrollToBottom()
  } catch (err) { console.error(err) }
  finally { uploadingFile.value = false }
}

// ── Drag & Drop ──
function handleDragOver(e: DragEvent) { e.preventDefault(); isDragging.value = true }
function handleDragLeave() { isDragging.value = false }
function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  pendingFile.value = file
  if (file.type.startsWith('image/')) {
    const reader = new FileReader()
    reader.onload = () => { pendingFilePreview.value = reader.result as string }
    reader.readAsDataURL(file)
  } else {
    pendingFilePreview.value = null
  }
}

// ── Send Message ──
async function sendMessage() {
  if (pendingFile.value) { await sendFileMessage(); return }
  if (!newMessage.value.trim() || !activeRoom.value) return
  const content = newMessage.value.trim()
  const mentions = mentionedUsers.value.map((m) => m.id)
  const replyToId = replyingTo.value?.id || undefined
  newMessage.value = ''
  mentionedUsers.value = []
  replyingTo.value = null
  showMentionDropdown.value = false
  showEmojiPicker.value = false
  try {
    const msg = await api.post('/chat-messages', {
      room: activeRoom.value.id,
      content,
      type: 'text',
      mentions: mentions.length > 0 ? mentions : undefined,
      replyTo: replyToId,
    })
    messages.value.push(msg.doc)
    socket.emit('chat:message', { room: activeRoom.value.id, ...msg.doc })
    await nextTick()
    scrollToBottom()
  } catch (err) { console.error(err) }
}

// ── Typing ──
let typingTimeout: ReturnType<typeof setTimeout> | null = null
function handleTyping() {
  if (typingTimeout) return
  socket.emit('chat:typing', { room: activeRoom.value?.id, userId: authStore.user?.id, userName: authStore.user?.name })
  typingTimeout = setTimeout(() => { typingTimeout = null }, 2000)
}

// ── Room CRUD ──
function toggleMember(userId: string) {
  const idx = roomForm.members.indexOf(userId)
  if (idx >= 0) roomForm.members.splice(idx, 1)
  else roomForm.members.push(userId)
}

async function createRoom() {
  if (!roomForm.name.trim() || roomForm.members.length === 0) return
  try {
    const members = [...new Set([authStore.user!.id, ...roomForm.members])]
    const res = await api.post('/chat-rooms', { name: roomForm.name, members })
    rooms.value.unshift(res.doc)
    showCreateRoom.value = false
    roomForm.name = ''
    roomForm.members = []
    userSearch.value = ''
    selectRoom(res.doc)
  } catch (err: any) { alert(err?.data?.errors?.[0]?.message || 'خطأ') }
}

function openEditRoom() {
  if (!activeRoom.value) return
  editRoomForm.name = activeRoom.value.name
  editRoomForm.members = roomMembers.value.map((m: any) => m.id)
  userSearch.value = ''
  showEditRoom.value = true
}
function toggleEditMember(userId: string) {
  const idx = editRoomForm.members.indexOf(userId)
  if (idx >= 0) editRoomForm.members.splice(idx, 1)
  else editRoomForm.members.push(userId)
}
async function saveEditRoom() {
  if (!activeRoom.value || !editRoomForm.name.trim()) return
  try {
    const res = await api.patch(`/chat-rooms/${activeRoom.value.id}`, {
      name: editRoomForm.name,
      members: editRoomForm.members,
    })
    activeRoom.value.name = editRoomForm.name
    activeRoom.value.members = res.doc?.members || editRoomForm.members
    const idx = rooms.value.findIndex((r) => r.id === activeRoom.value.id)
    if (idx >= 0) {
      rooms.value[idx].name = editRoomForm.name
      rooms.value[idx].members = activeRoom.value.members
    }
    showEditRoom.value = false
  } catch (err: any) {
    alert(err?.data?.errors?.[0]?.message || 'حدث خطأ أثناء التعديل')
  }
}
async function deleteRoom() {
  if (!activeRoom.value) return
  if (!confirm(`هل تريد حذف غرفة "${activeRoom.value.name}"؟ سيتم حذف جميع الرسائل نهائياً.`)) return
  try {
    await api.del(`/chat-rooms/${activeRoom.value.id}`)
    rooms.value = rooms.value.filter((r) => r.id !== activeRoom.value.id)
    activeRoom.value = null
    messages.value = []
  } catch (err: any) {
    alert(err?.data?.errors?.[0]?.message || 'حدث خطأ أثناء الحذف')
  }
}

// ── Select Room ──
async function selectRoom(room: any) {
  activeRoom.value = room
  loadingMessages.value = true
  showSearch.value = false
  searchQuery.value = ''
  try {
    const res = await api.get('/chat-messages', {
      query: { where: { room: { equals: room.id } }, sort: 'createdAt', limit: 200, depth: 2 },
    })
    messages.value = res.docs
    // Mark as read
    unreadCounts.value[room.id] = 0
    saveLastRead(room.id)
    await nextTick()
    scrollToBottom()
  } catch (err) { console.error(err) }
  finally { loadingMessages.value = false }
}

// ── Reply ──
function setReply(msg: any) {
  replyingTo.value = msg
  showReactionPicker.value = null
  nextTick(() => messageInput.value?.focus())
}
function clearReply() { replyingTo.value = null }
function getReplyPreview(msg: any): string {
  if (!msg) return ''
  const replyRef = typeof msg.replyTo === 'object' ? msg.replyTo : messages.value.find((m) => m.id === msg.replyTo)
  if (!replyRef) return ''
  return replyRef.content || (replyRef.type === 'image' ? '📷 صورة' : '📎 ملف')
}
function getReplyName(msg: any): string {
  if (!msg) return ''
  const replyRef = typeof msg.replyTo === 'object' ? msg.replyTo : messages.value.find((m) => m.id === msg.replyTo)
  if (!replyRef) return ''
  return getSenderName(replyRef) || 'مستخدم'
}

// ── Delete Message ──
async function deleteMessage(msg: any) {
  if (!confirm('حذف هذه الرسالة؟')) return
  try {
    await api.del(`/chat-messages/${msg.id}`)
    messages.value = messages.value.filter((m) => m.id !== msg.id)
    socket.emit('chat:message-deleted', { room: activeRoom.value?.id, messageId: msg.id })
  } catch (err: any) {
    alert(err?.data?.errors?.[0]?.message || 'حدث خطأ')
  }
}

// ── Reactions ──
async function toggleReaction(msgId: string, emoji: string) {
  showReactionPicker.value = null
  try {
    const res = await api.post('/chat-react', { messageId: msgId, emoji })
    const idx = messages.value.findIndex((m) => m.id === msgId)
    if (idx >= 0) messages.value[idx].reactions = res.doc.reactions
  } catch (err) { console.error(err) }
}
function getReactionCount(reactions: any, emoji: string): number {
  return reactions?.[emoji]?.length || 0
}
function hasUserReacted(reactions: any, emoji: string): boolean {
  return reactions?.[emoji]?.includes(authStore.user?.id) || false
}
function getAllReactions(reactions: any): { emoji: string; count: number; active: boolean }[] {
  if (!reactions) return []
  return Object.entries(reactions)
    .filter(([, users]) => (users as string[]).length > 0)
    .map(([emoji, users]) => ({
      emoji,
      count: (users as string[]).length,
      active: (users as string[]).includes(authStore.user?.id || ''),
    }))
}

// ── Pin ──
async function togglePinMessage(msgId: string) {
  try {
    const res = await api.post('/chat-pin', { messageId: msgId })
    const idx = messages.value.findIndex((m) => m.id === msgId)
    if (idx >= 0) messages.value[idx].isPinned = res.doc.isPinned
  } catch (err) { console.error(err) }
}

// ── Emoji Picker ──
function insertEmoji(emoji: string) {
  newMessage.value += emoji
  showEmojiPicker.value = false
  nextTick(() => messageInput.value?.focus())
}

// ── Unread Tracking ──
function getLastReadKey(roomId: string): string {
  return `chat_lastread_${authStore.user?.id}_${roomId}`
}
function saveLastRead(roomId: string) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(getLastReadKey(roomId), Date.now().toString())
}
function getLastRead(roomId: string): number {
  if (typeof localStorage === 'undefined') return 0
  return parseInt(localStorage.getItem(getLastReadKey(roomId)) || '0', 10)
}

// ── Back (mobile) ──
function goBack() { activeRoom.value = null }

// ── Lifecycle ──
onMounted(async () => {
  try {
    const [roomsRes, usersRes] = await Promise.all([
      api.get('/chat-rooms', { query: { sort: '-updatedAt', limit: 50, depth: 1 } }),
      api.get('/users', { query: { limit: 100, where: { isActive: { equals: true } } } }),
    ])
    rooms.value = roomsRes.docs
    users.value = usersRes.docs

    // Fetch last message for each room + calculate unread
    for (const room of rooms.value) {
      try {
        const msgRes = await api.get('/chat-messages', {
          query: { where: { room: { equals: room.id } }, sort: '-createdAt', limit: 1, depth: 1 },
        })
        if (msgRes.docs.length) {
          room._lastMessage = msgRes.docs[0]
          const lastRead = getLastRead(room.id)
          if (lastRead && new Date(msgRes.docs[0].createdAt).getTime() > lastRead) {
            // Count unread
            const countRes = await api.get('/chat-messages', {
              query: {
                where: {
                  room: { equals: room.id },
                  createdAt: { greater_than: new Date(lastRead).toISOString() },
                  sender: { not_equals: authStore.user?.id },
                },
                limit: 0,
              },
            })
            unreadCounts.value[room.id] = countRes.totalDocs || 0
          }
        }
      } catch {}
    }

    // Fetch online users
    try {
      const res = await api.get('/online-users')
      onlineUserIds.value = new Set(res.users || [])
    } catch {}
  } catch (err) { console.error(err) }
  finally { loading.value = false }

  // Socket events
  socket.on('chat:message', (data: any) => {
    if (activeRoom.value && data.room === activeRoom.value.id) {
      // Avoid duplicates
      if (!messages.value.find((m) => m.id === data.id)) {
        messages.value.push(data)
        saveLastRead(activeRoom.value.id)
        nextTick(() => scrollToBottom())
      }
    } else if (data.room) {
      // Increment unread for non-active room
      unreadCounts.value[data.room] = (unreadCounts.value[data.room] || 0) + 1
    }
    const room = rooms.value.find((r) => r.id === data.room)
    if (room) room._lastMessage = data
  })

  socket.on('chat:message-deleted', (data: any) => {
    if (activeRoom.value && data.room === activeRoom.value.id) {
      messages.value = messages.value.filter((m) => m.id !== data.messageId)
    }
  })

  socket.on('chat:typing', (data: any) => {
    if (data.userId !== authStore.user?.id && activeRoom.value?.id === data.room) {
      typingUsers.value.set(data.userId, data.userName)
      setTimeout(() => typingUsers.value.delete(data.userId), 3000)
    }
  })

  socket.on('users:online', (userIds: string[]) => {
    onlineUserIds.value = new Set(userIds)
  })
  socket.on('user:online', (userId: string) => {
    onlineUserIds.value.add(userId)
  })
  socket.on('user:offline', (userId: string) => {
    onlineUserIds.value.delete(userId)
  })
})
</script>

<template>
  <div class="flex h-[calc(100vh-8rem)] overflow-hidden rounded-xl border border-gray-200 bg-white">
    <!-- ═══ Rooms Sidebar ═══ -->
    <div
      class="w-full shrink-0 border-l border-gray-200 sm:w-80"
      :class="activeRoom ? 'hidden sm:block' : 'block'"
    >
      <div class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 class="text-lg font-bold text-gray-900">المحادثات</h2>
        <button @click="showCreateRoom = true" class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors">
          <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
        </button>
      </div>

      <div class="overflow-y-auto" style="height: calc(100% - 57px)">
        <div v-if="loading" class="space-y-3 p-4">
          <div v-for="i in 4" :key="i" class="animate-pulse flex gap-3">
            <div class="h-10 w-10 rounded-full bg-gray-200 shrink-0" />
            <div class="flex-1 space-y-2"><div class="h-3 bg-gray-200 rounded w-2/3" /><div class="h-2 bg-gray-100 rounded w-full" /></div>
          </div>
        </div>

        <p v-else-if="!rooms.length" class="p-6 text-center text-sm text-gray-400">
          لا توجد محادثات بعد<br>
          <button @click="showCreateRoom = true" class="mt-2 text-primary-600 hover:text-primary-700">أنشئ غرفة جديدة</button>
        </p>

        <div
          v-for="room in rooms"
          :key="room.id"
          @click="selectRoom(room)"
          class="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
          :class="activeRoom?.id === room.id ? 'bg-primary-50 border-r-2 border-primary-500' : ''"
        >
          <div class="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            {{ room.name?.charAt(0) }}
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center justify-between">
              <p class="truncate text-sm font-semibold text-gray-900">{{ room.name }}</p>
              <div class="flex items-center gap-1.5 shrink-0 mr-2">
                <span v-if="room._lastMessage" class="text-[10px] text-gray-400">
                  {{ formatTime(room._lastMessage.createdAt) }}
                </span>
              </div>
            </div>
            <div class="flex items-center justify-between mt-0.5">
              <p class="truncate text-xs text-gray-500 flex-1">
                {{ getLastMessage(room) || `${room.members?.length || 0} عضو` }}
              </p>
              <!-- Unread badge -->
              <span
                v-if="unreadCounts[room.id] && unreadCounts[room.id] > 0"
                class="mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-600 px-1.5 text-[10px] font-bold text-white"
              >
                {{ unreadCounts[room.id] > 99 ? '99+' : unreadCounts[room.id] }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ Chat Area ═══ -->
    <div
      class="flex flex-1 flex-col"
      :class="!activeRoom ? 'hidden sm:flex' : 'flex'"
    >
      <div v-if="!activeRoom" class="flex flex-1 flex-col items-center justify-center text-gray-400">
        <svg class="h-16 w-16 mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
          <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p class="text-sm">اختر محادثة للبدء</p>
      </div>

      <template v-else>
        <!-- ── Chat Header ── -->
        <div class="flex items-center gap-3 border-b border-gray-200 px-4 py-3 bg-gray-50/50">
          <button @click="goBack" class="sm:hidden flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200 transition-colors">
            <svg class="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700">
            {{ activeRoom.name?.charAt(0) }}
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="truncate font-semibold text-gray-900">{{ activeRoom.name }}</h3>
            <p v-if="typingUsers.size" class="text-xs text-primary-600 animate-pulse">
              {{ [...typingUsers.values()].join('، ') }} يكتب...
            </p>
            <p v-else class="text-xs text-gray-400">{{ roomMembers.length }} عضو · {{ roomMembers.filter((m: any) => isUserOnline(m.id)).length }} متصل</p>
          </div>
          <!-- Search -->
          <button @click="showSearch = !showSearch; if (!showSearch) searchQuery = ''" class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" :class="showSearch ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-200 text-gray-500'" title="بحث">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <!-- Links -->
          <button @click="showLinks = !showLinks; if (showLinks) showMembers = false" class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" :class="showLinks ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-200 text-gray-500'" title="الروابط">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.072a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
          </button>
          <!-- Edit -->
          <button v-if="canEditRoom" @click="openEditRoom" class="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-200 transition-colors text-gray-500" title="تعديل">
            <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
          </button>
          <!-- Members -->
          <button @click="showMembers = !showMembers; if (showMembers) showLinks = false" class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors" :class="showMembers ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-200 text-gray-500'" title="الأعضاء">
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
          </button>
        </div>

        <!-- ── Search Bar ── -->
        <div v-if="showSearch" class="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div class="relative">
            <svg class="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input v-model="searchQuery" class="input !pr-9 !py-1.5 text-sm" placeholder="ابحث في الرسائل..." />
            <span v-if="searchQuery" class="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">
              {{ displayMessages.length }} نتيجة
            </span>
          </div>
        </div>

        <!-- ── Members Panel ── -->
        <div v-if="showMembers" class="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div class="flex flex-wrap gap-2">
            <div v-for="member in roomMembers" :key="member.id" class="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
              :class="[getUserColor(member.id).light, getUserColor(member.id).text]">
              <span class="relative h-2 w-2 rounded-full" :class="getUserColor(member.id).bg">
                <span v-if="isUserOnline(member.id)" class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-green-500" />
              </span>
              {{ member.name }}
            </div>
          </div>
        </div>

        <!-- ── Links Panel ── -->
        <div v-if="showLinks" class="border-b border-gray-200 bg-gray-50 max-h-64 overflow-y-auto">
          <div v-if="!sharedLinks.length" class="px-4 py-4 text-center text-sm text-gray-400">لا توجد روابط مشتركة</div>
          <div v-else class="divide-y divide-gray-100">
            <a v-for="(link, i) in sharedLinks" :key="i" :href="link.url" target="_blank" rel="noopener noreferrer"
              class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 transition-colors group">
              <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-500 group-hover:bg-blue-100">
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-4.072a4.5 4.5 0 00-6.364 0l-4.5 4.5a4.5 4.5 0 001.242 7.244" /></svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm text-blue-600 group-hover:underline" dir="ltr">{{ getLinkDomain(link.url) }}</p>
                <p class="text-[10px] text-gray-400">{{ link.sender }} · {{ formatDate(link.date) }} {{ formatTime(link.date) }}</p>
              </div>
              <svg class="h-4 w-4 shrink-0 text-gray-300 group-hover:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
            </a>
          </div>
        </div>

        <!-- ── Pinned Messages Bar ── -->
        <div v-if="pinnedMessages.length" class="border-b border-gray-200 bg-amber-50 px-4 py-2 flex items-center gap-2 overflow-x-auto">
          <svg class="h-4 w-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
          <div class="flex gap-2 overflow-x-auto">
            <span v-for="pm in pinnedMessages" :key="pm.id" class="shrink-0 rounded-lg bg-white px-2 py-1 text-xs text-gray-700 shadow-sm border border-amber-200 max-w-48 truncate">
              {{ pm.content || '📎 مرفق' }}
            </span>
          </div>
        </div>

        <!-- ═══ Messages Area ═══ -->
        <div
          ref="messagesEl"
          class="relative flex-1 overflow-y-auto px-4 py-3 bg-[#f0f2f5]"
          style="background-image: url('data:image/svg+xml,%3Csvg width=&quot;60&quot; height=&quot;60&quot; xmlns=&quot;http://www.w3.org/2000/svg&quot;%3E%3Cdefs%3E%3Cpattern id=&quot;p&quot; width=&quot;60&quot; height=&quot;60&quot; patternUnits=&quot;userSpaceOnUse&quot; patternTransform=&quot;rotate(45)&quot;%3E%3Ccircle cx=&quot;1&quot; cy=&quot;1&quot; r=&quot;0.8&quot; fill=&quot;%23ddd&quot; opacity=&quot;0.3&quot;/%3E%3C/pattern%3E%3C/defs%3E%3Crect width=&quot;100%25&quot; height=&quot;100%25&quot; fill=&quot;url(%23p)&quot;/%3E%3C/svg%3E')"
          @scroll="handleScroll"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @drop="handleDrop"
        >
          <!-- Drag overlay -->
          <div v-if="isDragging" class="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary-400 bg-primary-50/80">
            <div class="text-center">
              <svg class="mx-auto h-10 w-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
              <p class="mt-1 text-sm font-medium text-primary-600">أفلت الملف هنا</p>
            </div>
          </div>

          <div v-if="loadingMessages" class="flex items-center justify-center py-8">
            <div class="h-6 w-6 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
          </div>

          <template v-else>
            <p v-if="!displayMessages.length" class="py-12 text-center text-sm text-gray-400">
              {{ searchQuery ? 'لا توجد نتائج' : 'لا توجد رسائل بعد — ابدأ المحادثة!' }}
            </p>

            <div v-for="(msg, index) in displayMessages" :key="msg.id">
              <!-- Date separator -->
              <div v-if="!searchQuery && shouldShowDate(index)" class="my-4 flex items-center justify-center">
                <span class="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-gray-500 shadow-sm">
                  {{ formatDate(msg.createdAt) }}
                </span>
              </div>

              <!-- Message bubble -->
              <div
                class="group flex mb-1"
                :class="[
                  isOwnMessage(msg) ? 'justify-start' : 'justify-end',
                  !searchQuery && shouldShowSender(index) ? 'mt-3' : 'mt-0.5',
                ]"
                @mouseenter="hoveredMsgId = msg.id"
                @mouseleave="hoveredMsgId = null; if (showReactionPicker === msg.id) showReactionPicker = null"
              >
                <!-- Avatar -->
                <div v-if="!isOwnMessage(msg) && (!searchQuery && shouldShowSender(index))" class="ml-2 shrink-0 self-end">
                  <div class="relative flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white"
                    :class="getUserColor(getSenderId(msg)).bg">
                    {{ getSenderName(msg)?.charAt(0) }}
                    <span v-if="isUserOnline(getSenderId(msg))" class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#f0f2f5] bg-green-500" />
                  </div>
                </div>
                <div v-else-if="!isOwnMessage(msg)" class="ml-2 w-7 shrink-0" />

                <div class="max-w-[75%] sm:max-w-[60%] relative">
                  <!-- Sender name -->
                  <p v-if="!isOwnMessage(msg) && (!searchQuery && shouldShowSender(index))"
                    class="mb-0.5 text-[11px] font-bold pr-2"
                    :class="getUserColor(getSenderId(msg)).name">
                    {{ getSenderName(msg) }}
                  </p>

                  <!-- Hover Actions -->
                  <div
                    v-if="hoveredMsgId === msg.id"
                    class="absolute -top-3 z-10 flex items-center gap-0.5 rounded-lg bg-white px-1 py-0.5 shadow-md border border-gray-100"
                    :class="isOwnMessage(msg) ? 'left-0' : 'right-0'"
                  >
                    <button @click="setReply(msg)" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="رد">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    </button>
                    <button @click="showReactionPicker = showReactionPicker === msg.id ? null : msg.id" class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" title="تفاعل">
                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                    </button>
                    <button @click="togglePinMessage(msg.id)" class="rounded p-1 text-gray-400 hover:bg-gray-100" :class="msg.isPinned ? 'text-amber-500' : 'hover:text-gray-600'" title="تثبيت">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                    </button>
                    <button v-if="isOwnMessage(msg) || authStore.role === 'super-admin'" @click="deleteMessage(msg)" class="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500" title="حذف">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>

                  <!-- Reaction Picker (quick) -->
                  <div v-if="showReactionPicker === msg.id"
                    class="absolute -top-10 z-20 flex items-center gap-0.5 rounded-full bg-white px-2 py-1 shadow-lg border border-gray-100"
                    :class="isOwnMessage(msg) ? 'left-0' : 'right-0'">
                    <button v-for="emoji in REACTION_EMOJIS" :key="emoji" @click="toggleReaction(msg.id, emoji)"
                      class="rounded-full p-1 text-base hover:bg-gray-100 hover:scale-125 transition-transform"
                      :class="hasUserReacted(msg.reactions, emoji) ? 'bg-blue-50' : ''">
                      {{ emoji }}
                    </button>
                  </div>

                  <!-- Bubble -->
                  <div class="relative rounded-xl px-3 py-1.5 shadow-sm"
                    :class="[
                      isOwnMessage(msg) ? 'bg-[#d9fdd3] rounded-tr-sm' : 'bg-white rounded-tl-sm',
                      msg.isPinned ? 'ring-1 ring-amber-300' : '',
                    ]">
                    <!-- Pin indicator -->
                    <div v-if="msg.isPinned" class="flex items-center gap-1 text-[10px] text-amber-600 mb-0.5">
                      <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                      مثبتة
                    </div>

                    <!-- Reply reference -->
                    <div v-if="msg.replyTo" class="mb-1 rounded-lg border-r-2 border-primary-400 bg-black/5 px-2 py-1 text-[11px] cursor-pointer" @click="undefined">
                      <p class="font-bold text-primary-600">{{ getReplyName(msg) }}</p>
                      <p class="text-gray-500 truncate">{{ getReplyPreview(msg) }}</p>
                    </div>

                    <!-- Image -->
                    <div v-if="isImageType(msg) && getAttachmentUrl(msg)" class="mb-1 -mx-1.5 -mt-0.5">
                      <img :src="getAttachmentUrl(msg)" :alt="getAttachmentName(msg)" class="max-w-full rounded-lg cursor-pointer max-h-64 object-cover" @click="lightboxUrl = getAttachmentUrl(msg)" />
                    </div>
                    <!-- File -->
                    <a v-else-if="getAttachmentUrl(msg)" :href="getAttachmentUrl(msg)" target="_blank" class="mb-1 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 p-2 hover:bg-gray-100 transition-colors">
                      <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-xs font-medium text-gray-900 truncate">{{ getAttachmentName(msg) }}</p>
                        <p v-if="typeof msg.attachment === 'object' && msg.attachment?.filesize" class="text-[10px] text-gray-400">{{ formatFileSize(msg.attachment.filesize) }}</p>
                      </div>
                    </a>
                    <!-- Text (with clickable links) -->
                    <p v-if="msg.content && msg.type === 'text'" class="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap break-words" v-html="renderContent(msg.content)" />
                    <p class="mt-0.5 text-left text-[10px] text-gray-400 select-none" dir="ltr">
                      {{ formatTime(msg.createdAt) }}
                    </p>
                  </div>

                  <!-- Reactions display -->
                  <div v-if="getAllReactions(msg.reactions).length" class="flex flex-wrap gap-1 mt-1">
                    <button
                      v-for="r in getAllReactions(msg.reactions)"
                      :key="r.emoji"
                      @click="toggleReaction(msg.id, r.emoji)"
                      class="inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition-colors"
                      :class="r.active ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'"
                    >
                      {{ r.emoji }} <span class="text-[10px]">{{ r.count }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Scroll to bottom button -->
          <button
            v-if="showScrollBtn"
            @click="scrollToBottom"
            class="sticky bottom-3 left-1/2 -translate-x-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </button>
        </div>

        <!-- ═══ Input Area ═══ -->
        <div class="border-t border-gray-200 bg-gray-50/80">
          <!-- Reply preview -->
          <div v-if="replyingTo" class="flex items-center gap-2 border-b border-gray-200 px-4 py-2 bg-white">
            <div class="h-full w-1 shrink-0 rounded-full bg-primary-400" />
            <div class="min-w-0 flex-1">
              <p class="text-[11px] font-bold text-primary-600">{{ getSenderName(replyingTo) || 'مستخدم' }}</p>
              <p class="text-xs text-gray-500 truncate">{{ replyingTo.content || '📎 مرفق' }}</p>
            </div>
            <button @click="clearReply" class="shrink-0 rounded p-1 text-gray-400 hover:text-red-500">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Pending file preview -->
          <div v-if="pendingFile" class="flex items-center gap-3 border-b border-gray-200 px-4 py-2 bg-white">
            <div v-if="pendingFilePreview" class="h-14 w-14 shrink-0 overflow-hidden rounded-lg border">
              <img :src="pendingFilePreview" class="h-full w-full object-cover" />
            </div>
            <div v-else class="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-gray-50">
              <svg class="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium text-gray-900">{{ pendingFile.name }}</p>
              <p class="text-[10px] text-gray-400">{{ formatFileSize(pendingFile.size) }}</p>
            </div>
            <button @click="cancelFile" class="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-500">
              <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <!-- Mentioned users chips -->
          <div v-if="mentionedUsers.length" class="flex flex-wrap gap-1 px-4 pt-2">
            <span v-for="m in mentionedUsers" :key="m.id" class="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
              @{{ m.name }}
              <button @click="mentionedUsers = mentionedUsers.filter((u) => u.id !== m.id)" class="hover:text-red-500">&times;</button>
            </span>
          </div>

          <div class="relative px-3 py-2.5">
            <!-- @Mention dropdown -->
            <div v-if="showMentionDropdown && mentionSuggestions.length" class="absolute bottom-full right-0 left-0 mx-3 mb-1 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg z-10">
              <button v-for="user in mentionSuggestions.slice(0, 6)" :key="user.id" @mousedown.prevent="selectMention(user)"
                class="flex w-full items-center gap-2 px-3 py-2 text-right hover:bg-gray-50 transition-colors">
                <div class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white" :class="getUserColor(user.id).bg">
                  {{ user.name?.charAt(0) }}
                </div>
                <span class="text-sm text-gray-900">{{ user.name }}</span>
                <span v-if="isUserOnline(user.id)" class="mr-auto h-2 w-2 rounded-full bg-green-500" />
              </button>
            </div>

            <!-- Emoji Picker -->
            <div v-if="showEmojiPicker" class="absolute bottom-full right-0 mx-3 mb-1 w-72 rounded-xl border border-gray-200 bg-white shadow-lg z-10 p-3 max-h-64 overflow-y-auto">
              <div v-for="group in EMOJI_GROUPS" :key="group.label" class="mb-2">
                <p class="text-[10px] font-medium text-gray-400 mb-1">{{ group.label }}</p>
                <div class="flex flex-wrap gap-0.5">
                  <button v-for="emoji in group.emojis" :key="emoji" @click="insertEmoji(emoji)"
                    class="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-gray-100 transition-colors">
                    {{ emoji }}
                  </button>
                </div>
              </div>
            </div>

            <form @submit.prevent="sendMessage" class="flex items-end gap-2">
              <!-- File upload -->
              <button type="button" @click="triggerFileInput" class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
              </button>
              <input ref="fileInput" type="file" class="hidden" accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.txt,video/*,audio/*" @change="handleFileSelect" />

              <!-- Emoji toggle -->
              <button type="button" @click="showEmojiPicker = !showEmojiPicker" class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-600 transition-colors">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              </button>

              <div class="flex-1 relative">
                <textarea
                  ref="messageInput"
                  v-model="newMessage"
                  @input="handleInput"
                  @keydown.enter.exact.prevent="sendMessage"
                  @keydown.escape="showMentionDropdown = false; showEmojiPicker = false"
                  @focus="showEmojiPicker = false"
                  class="input !py-2.5 !pr-3 resize-none !rounded-2xl !border-gray-200 !bg-white !shadow-sm"
                  rows="1"
                  :placeholder="pendingFile ? 'أضف تعليق (اختياري)...' : 'اكتب رسالة... (@ للإشارة)'"
                  style="min-height: 42px; max-height: 120px"
                />
              </div>
              <button
                type="submit"
                :disabled="(!newMessage.trim() && !pendingFile) || uploadingFile"
                class="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm transition-all hover:bg-primary-700 disabled:bg-gray-300 disabled:shadow-none"
              >
                <div v-if="uploadingFile" class="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <svg v-else class="h-5 w-5 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══ Create Room Modal ═══ -->
    <Teleport to="body">
      <div v-if="showCreateRoom" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showCreateRoom = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
          <h2 class="mb-4 text-lg font-bold text-gray-900">محادثة جديدة</h2>
          <form @submit.prevent="createRoom" class="flex flex-col flex-1 min-h-0 gap-4">
            <div>
              <label class="label">اسم الغرفة *</label>
              <input v-model="roomForm.name" class="input" required placeholder="مثال: فريق المبيعات" />
            </div>
            <div class="flex-1 min-h-0 flex flex-col">
              <label class="label">الأعضاء *</label>
              <input v-model="userSearch" class="input mb-2" placeholder="بحث عن عضو..." />
              <div class="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                <label v-for="u in filteredUsers" :key="u.id"
                  class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  :class="roomForm.members.includes(u.id) ? 'bg-primary-50' : ''">
                  <input type="checkbox" :checked="roomForm.members.includes(u.id)" @change="toggleMember(u.id)" class="hidden" />
                  <div class="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" :class="getUserColor(u.id).bg">
                    {{ u.name?.charAt(0) }}
                    <span v-if="isUserOnline(u.id)" class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-green-500" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ u.name }}</p>
                    <p class="text-[10px] text-gray-400" dir="ltr">{{ u.email }}</p>
                  </div>
                  <svg v-if="roomForm.members.includes(u.id)" class="h-5 w-5 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </label>
              </div>
              <p v-if="roomForm.members.length" class="mt-2 text-xs text-gray-500">{{ roomForm.members.length }} عضو محدد</p>
            </div>
            <div class="flex justify-end gap-3 pt-2 border-t">
              <button type="button" @click="showCreateRoom = false; userSearch = ''" class="btn-secondary">إلغاء</button>
              <button type="submit" :disabled="!roomForm.name.trim() || !roomForm.members.length" class="btn-primary">إنشاء المحادثة</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ═══ Edit Room Modal ═══ -->
    <Teleport to="body">
      <div v-if="showEditRoom" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="showEditRoom = false">
        <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
          <h2 class="mb-4 text-lg font-bold text-gray-900">تعديل الغرفة</h2>
          <form @submit.prevent="saveEditRoom" class="flex flex-col flex-1 min-h-0 gap-4">
            <div>
              <label class="label">اسم الغرفة *</label>
              <input v-model="editRoomForm.name" class="input" required placeholder="اسم الغرفة" />
            </div>
            <div class="flex-1 min-h-0 flex flex-col">
              <label class="label">الأعضاء</label>
              <input v-model="userSearch" class="input mb-2" placeholder="بحث عن عضو..." />
              <div class="flex-1 min-h-0 overflow-y-auto rounded-lg border border-gray-200 divide-y divide-gray-50">
                <label v-for="u in filteredUsers" :key="u.id"
                  class="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors"
                  :class="editRoomForm.members.includes(u.id) ? 'bg-primary-50' : ''">
                  <input type="checkbox" :checked="editRoomForm.members.includes(u.id)" @change="toggleEditMember(u.id)" class="hidden" />
                  <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" :class="getUserColor(u.id).bg">
                    {{ u.name?.charAt(0) }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900">{{ u.name }}</p>
                    <p class="text-[10px] text-gray-400" dir="ltr">{{ u.email }}</p>
                  </div>
                  <svg v-if="editRoomForm.members.includes(u.id)" class="h-5 w-5 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </label>
              </div>
              <p v-if="editRoomForm.members.length" class="mt-2 text-xs text-gray-500">{{ editRoomForm.members.length }} عضو محدد</p>
            </div>
            <div class="flex items-center justify-between gap-3 pt-2 border-t">
              <button v-if="canDeleteRoom" type="button" @click="showEditRoom = false; deleteRoom()" class="btn-secondary !text-red-600 !border-red-200 hover:!bg-red-50">
                <svg class="h-4 w-4 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                حذف الغرفة
              </button>
              <div v-else />
              <div class="flex gap-3">
                <button type="button" @click="showEditRoom = false; userSearch = ''" class="btn-secondary">إلغاء</button>
                <button type="submit" :disabled="!editRoomForm.name.trim()" class="btn-primary">حفظ التعديلات</button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ═══ Lightbox ═══ -->
    <Teleport to="body">
      <div v-if="lightboxUrl" class="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" @click.self="lightboxUrl = null">
        <button @click="lightboxUrl = null" class="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors">
          <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <img :src="lightboxUrl" class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain" />
        <a :href="lightboxUrl" target="_blank" class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20 transition-colors">
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          فتح الأصلية
        </a>
      </div>
    </Teleport>
  </div>
</template>
