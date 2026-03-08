import type { PayloadHandler } from 'payload'

/** GET /v1/inbox — Unified inbox merging notifications + unread messages + pending reviews */
export const inbox: PayloadHandler = async (req) => {
    const { payload, user } = req
    if (!user) return Response.json({ error: 'غير مصرح' }, { status: 401 })

    const url = new URL(req.url || '', 'http://localhost')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 50)
    const page = parseInt(url.searchParams.get('page') || '1', 10)

    // 1. Unread notifications
    const notifications = await payload.find({
        collection: 'notifications',
        where: {
            recipient: { equals: user.id },
            isRead: { equals: false },
        },
        sort: '-createdAt',
        limit,
        page,
        depth: 0,
    })

    // 2. Unread messages (rooms where user is a member, latest unread)
    const rooms = await payload.find({
        collection: 'chat-rooms',
        where: { members: { contains: user.id } },
        limit: 50,
        depth: 0,
    })

    const roomIds = rooms.docs.map((r: any) => r.id)
    let unreadMessages: any[] = []
    if (roomIds.length > 0) {
        const messages = await payload.find({
            collection: 'chat-messages',
            where: {
                room: { in: roomIds },
                sender: { not_equals: user.id },
            },
            sort: '-createdAt',
            limit: 10,
            depth: 1,
        })
        unreadMessages = messages.docs.map((m: any) => ({
            type: 'message',
            id: m.id,
            roomId: typeof m.room === 'object' ? m.room.id : m.room,
            sender: m.sender?.name || 'مجهول',
            content: m.content?.slice(0, 100),
            createdAt: m.createdAt,
        }))
    }

    // 3. Pending code reviews (for admin/supervisor)
    let pendingReviews: any[] = []
    const role = user.role as string
    if (['super-admin', 'supervisor', 'auditor'].includes(role)) {
        const reviews = await payload.find({
            collection: 'code-reviews',
            where: { status: { equals: 'pending' } },
            sort: '-createdAt',
            limit: 10,
            depth: 1,
        })
        pendingReviews = reviews.docs.map((r: any) => ({
            type: 'code-review',
            id: r.id,
            task: r.task?.title || 'مهمة',
            submittedBy: r.submittedBy?.name || 'مبرمج',
            createdAt: r.createdAt,
        }))
    }

    // 4. Pending design reviews
    if (['super-admin', 'supervisor', 'social-media-manager', 'auditor'].includes(role)) {
        const designs = await payload.find({
            collection: 'design-requests',
            where: { status: { equals: 'in-review' } },
            sort: '-createdAt',
            limit: 10,
            depth: 1,
        })
        const pendingDesigns = designs.docs.map((d: any) => ({
            type: 'design-review',
            id: d.id,
            title: d.title,
            assignedTo: d.assignedTo?.name || 'مصمم',
            createdAt: d.createdAt,
        }))
        pendingReviews = [...pendingReviews, ...pendingDesigns]
    }

    // Merge and sort all items by date
    const allItems = [
        ...notifications.docs.map((n: any) => ({
            type: 'notification',
            id: n.id,
            notificationType: n.type,
            title: n.title,
            message: n.message,
            link: n.link,
            createdAt: n.createdAt,
        })),
        ...unreadMessages,
        ...pendingReviews,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return Response.json({
        items: allItems.slice(0, limit),
        counts: {
            notifications: notifications.totalDocs,
            messages: unreadMessages.length,
            reviews: pendingReviews.length,
        },
    })
}
