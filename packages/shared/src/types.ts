export type TaskType = 'programming' | 'field-visit' | 'design' | 'general'
export type TaskStatus = 'new' | 'in-progress' | 'in-review' | 'completed' | 'cancelled'
export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'
export type TaskRecurrence = 'none' | 'daily' | 'weekly' | 'monthly'

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'

export type NotificationType =
  | 'task-assigned'
  | 'task-updated'
  | 'comment'
  | 'security-alert'
  | 'visit'
  | 'system'

export interface SocketEvents {
  'notification:new': { id: string; title: string; message: string; type: NotificationType; link?: string }
  'notification:count': { unreadCount: number }
}
